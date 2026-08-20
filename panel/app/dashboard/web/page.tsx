import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext, esDueno } from "@/lib/org";
import { normalizarBloques } from "@/lib/siteBlocks";
import SiteEditor from "./SiteEditor";
import { crearSitio, actualizarSlug, alternarPublicado } from "./actions";

export default async function WebPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; guardado?: string }>;
}) {
  const { error, guardado } = await searchParams;
  const supabase = await createClient();
  const org = await getOrgContext(supabase);

  const { data: sitio } = await supabase
    .from("org_sites")
    .select("slug, publicado, bloques")
    .eq("org_id", org.orgId)
    .maybeSingle();

  const host = (await headers()).get("host");
  const origin = host?.startsWith("localhost") ? `http://${host}` : `https://${host}`;

  if (!esDueno(org.rol)) {
    return (
      <div className="glass rounded-3xl p-7 sm:p-8">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Mi web</h1>
        <p className="text-sm text-muted">Solo el dueño de la cuenta puede editar la página web.</p>
      </div>
    );
  }

  if (!sitio) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">Mi web</h1>
          <p className="text-sm text-muted">
            Una página pública para mostrar tu {org.tipo === "gimnasio" ? "gimnasio" : "trabajo"} y
            conseguir clientes nuevos.
          </p>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <section className="glass rounded-3xl p-7 sm:p-8">
          <p className="mb-5 text-sm text-muted">
            Todavía no tenés página. Se crea vacía y en borrador: nadie la ve hasta que vos la
            publiques.
          </p>
          <form action={crearSitio}>
            <button type="submit" className="btn-primary rounded-2xl px-5 py-3 text-[15px] font-semibold">
              Crear mi página
            </button>
          </form>
        </section>
      </div>
    );
  }

  const bloques = normalizarBloques(sitio.bloques);
  const url = `${origin}/g/${sitio.slug}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Mi web</h1>
        <p className="text-sm text-muted">
          Armá tu página con secciones. Podés reordenarlas y quitar las que no uses.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {guardado && !error && <p className="text-sm text-green-400">Guardado.</p>}

      <section className="glass rounded-3xl p-6 sm:p-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold tracking-tight">
              {sitio.publicado ? "Publicada" : "En borrador"}
            </p>
            <p className="mt-0.5 break-all text-sm text-muted">{url}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {sitio.publicado && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted underline underline-offset-4 transition-colors hover:text-foreground"
              >
                Ver
              </a>
            )}
            <form action={alternarPublicado.bind(null, !sitio.publicado)}>
              <button
                type="submit"
                className={
                  sitio.publicado
                    ? "glass-input rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:border-border-strong"
                    : "btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
                }
              >
                {sitio.publicado ? "Despublicar" : "Publicar"}
              </button>
            </form>
          </div>
        </div>

        <form action={actualizarSlug} className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted">{origin}/g/</span>
          <input
            name="slug"
            defaultValue={sitio.slug}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            minLength={3}
            maxLength={40}
            className="glass-input min-w-40 flex-1 rounded-xl px-3 py-2 text-sm text-foreground outline-none"
            aria-label="Dirección de tu página"
          />
          <button
            type="submit"
            className="glass-input rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:border-border-strong"
          >
            Cambiar dirección
          </button>
        </form>
      </section>

      <SiteEditor orgId={org.orgId} bloquesIniciales={bloques} />
    </div>
  );
}
