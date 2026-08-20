import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizarBloques, telefonoWhatsapp, type Bloque } from "@/lib/siteBlocks";

// La web pública de una org. La lee `anon`, sin sesión: lo único que la
// habilita es la policy `org_sites_select_publicado`, así que un borrador
// nunca sale de acá aunque alguien adivine el slug.

interface Plan {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  duracion_dias: number;
}

async function cargarSitio(slug: string) {
  const supabase = await createClient();

  const { data: sitio } = await supabase
    .from("org_sites")
    .select("org_id, slug, publicado, bloques, organizations(marca, nombre)")
    .eq("slug", slug)
    .eq("publicado", true)
    .maybeSingle();

  if (!sitio) return null;

  const org = Array.isArray(sitio.organizations) ? sitio.organizations[0] : sitio.organizations;
  const bloques = normalizarBloques(sitio.bloques);

  // Los planes se leen en vivo: si el precio cambia en el panel, la web ya lo
  // muestra, sin tener que reeditar el bloque.
  const necesitaPlanes = bloques.some((b) => b.tipo === "planes");
  let planes: Plan[] = [];
  if (necesitaPlanes) {
    const { data } = await supabase
      .from("membership_plans")
      .select("id, nombre, descripcion, precio, duracion_dias")
      .eq("org_id", sitio.org_id)
      .eq("activo", true)
      .order("precio", { ascending: true });
    planes = (data ?? []) as Plan[];
  }

  return { marca: org?.marca || org?.nombre || "Kayroz", bloques, planes };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sitio = await cargarSitio(slug);
  if (!sitio) return { title: "Página no encontrada" };

  const hero = sitio.bloques.find((b) => b.tipo === "hero");
  const descripcion =
    hero && hero.tipo === "hero" && hero.subtitulo ? hero.subtitulo : `Entrená con ${sitio.marca}.`;

  return {
    title: sitio.marca,
    description: descripcion,
    openGraph: { title: sitio.marca, description: descripcion },
  };
}

function formatoCOP(monto: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(monto);
}

function duracionLegible(dias: number): string {
  if (dias % 30 === 0 && dias >= 30) {
    const meses = dias / 30;
    return meses === 1 ? "mes" : `${meses} meses`;
  }
  return `${dias} días`;
}

export default async function SitioPublico({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sitio = await cargarSitio(slug);
  if (!sitio) notFound();

  const { marca, bloques, planes } = sitio;
  const contacto = bloques.find((b) => b.tipo === "contacto");
  const wa =
    contacto && contacto.tipo === "contacto" ? telefonoWhatsapp(contacto.whatsapp) : "";

  return (
    <div className="min-h-screen">
      <header className="glass-nav sticky top-0 z-20">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-[17px] font-semibold tracking-tight">{marca}</span>
          {wa && (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
            >
              Escribinos
            </a>
          )}
        </div>
      </header>

      <main>
        {bloques.length === 0 ? (
          <div className="mx-auto max-w-5xl px-6 py-24 text-center">
            <h1 className="text-3xl font-semibold tracking-tight">{marca}</h1>
            <p className="mt-3 text-muted">Esta página todavía se está armando.</p>
          </div>
        ) : (
          bloques.map((bloque, i) => (
            <RenderBloque key={i} bloque={bloque} marca={marca} planes={planes} wa={wa} />
          ))
        )}
      </main>

      <footer className="mx-auto max-w-5xl px-6 py-10 text-center text-xs text-muted">
        {marca} · Hecho con Kayroz
      </footer>
    </div>
  );
}

function RenderBloque({
  bloque,
  marca,
  planes,
  wa,
}: {
  bloque: Bloque;
  marca: string;
  planes: Plan[];
  wa: string;
}) {
  switch (bloque.tipo) {
    case "hero":
      return (
        <section className="relative overflow-hidden">
          {bloque.imagen && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bloque.imagen}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-40"
              />
              <div className="auth-veil absolute inset-0" />
            </>
          )}
          <div className="relative mx-auto max-w-5xl px-6 py-28 sm:py-36">
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
              {bloque.titulo || marca}
            </h1>
            {bloque.subtitulo && (
              <p className="text-balance mt-5 max-w-2xl text-lg text-muted">{bloque.subtitulo}</p>
            )}
            {wa && bloque.cta && (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary mt-8 inline-block rounded-2xl px-6 py-3.5 text-[15px] font-semibold"
              >
                {bloque.cta}
              </a>
            )}
          </div>
        </section>
      );

    case "sobre":
      return (
        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="glass grid grid-cols-1 gap-8 rounded-3xl p-8 sm:p-12 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="mb-4 text-2xl font-semibold tracking-tight">{bloque.titulo}</h2>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-muted">
                {bloque.texto}
              </p>
            </div>
            {bloque.imagen && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bloque.imagen}
                alt=""
                className="h-64 w-full rounded-2xl border border-divider object-cover md:h-80"
              />
            )}
          </div>
        </section>
      );

    case "servicios": {
      const items = bloque.items.filter((i) => i.nombre.trim());
      if (items.length === 0) return null;
      return (
        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="mb-8 text-2xl font-semibold tracking-tight">{bloque.titulo}</h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, i) => (
              <li key={i} className="glass rounded-3xl p-6">
                <h3 className="mb-2 text-[17px] font-semibold tracking-tight">{item.nombre}</h3>
                {item.descripcion && (
                  <p className="text-sm leading-relaxed text-muted">{item.descripcion}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      );
    }

    case "planes": {
      if (planes.length === 0) return null;
      return (
        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="mb-2 text-2xl font-semibold tracking-tight">{bloque.titulo}</h2>
          {bloque.subtitulo && <p className="mb-8 text-muted">{bloque.subtitulo}</p>}
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {planes.map((plan) => (
              <li key={plan.id} className="glass flex flex-col rounded-3xl p-7">
                <h3 className="text-[17px] font-semibold tracking-tight">{plan.nombre}</h3>
                <p className="mt-3 text-3xl font-semibold tracking-tight">
                  {formatoCOP(Number(plan.precio))}
                </p>
                <p className="mt-1 text-sm text-muted">por {duracionLegible(plan.duracion_dias)}</p>
                {plan.descripcion && (
                  <p className="mt-3 text-sm leading-relaxed text-muted">{plan.descripcion}</p>
                )}
                {wa && (
                  <a
                    href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hola, me interesa el plan ${plan.nombre}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary mt-6 rounded-2xl px-4 py-3 text-center text-sm font-semibold"
                  >
                    Me interesa
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      );
    }

    case "galeria": {
      if (bloque.imagenes.length === 0) return null;
      return (
        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="mb-8 text-2xl font-semibold tracking-tight">{bloque.titulo}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {bloque.imagenes.map((url, i) => (
              <li key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  className="h-48 w-full rounded-2xl border border-divider object-cover"
                />
              </li>
            ))}
          </ul>
        </section>
      );
    }

    case "contacto":
      return (
        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="glass rounded-3xl p-8 sm:p-12">
            <h2 className="mb-6 text-2xl font-semibold tracking-tight">{bloque.titulo}</h2>
            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {bloque.whatsapp && (
                <div>
                  <dt className="text-sm text-muted">WhatsApp</dt>
                  <dd className="mt-0.5 text-[15px]">
                    <a
                      href={`https://wa.me/${telefonoWhatsapp(bloque.whatsapp)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4"
                    >
                      {bloque.whatsapp}
                    </a>
                  </dd>
                </div>
              )}
              {bloque.email && (
                <div>
                  <dt className="text-sm text-muted">Email</dt>
                  <dd className="mt-0.5 text-[15px]">
                    <a href={`mailto:${bloque.email}`} className="underline underline-offset-4">
                      {bloque.email}
                    </a>
                  </dd>
                </div>
              )}
              {bloque.direccion && (
                <div>
                  <dt className="text-sm text-muted">Dirección</dt>
                  <dd className="mt-0.5 text-[15px]">{bloque.direccion}</dd>
                </div>
              )}
              {bloque.horarios && (
                <div>
                  <dt className="text-sm text-muted">Horarios</dt>
                  <dd className="mt-0.5 whitespace-pre-line text-[15px]">{bloque.horarios}</dd>
                </div>
              )}
            </dl>
          </div>
        </section>
      );
  }
}
