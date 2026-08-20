import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext, etiquetaClientes } from "@/lib/org";
import { generateInviteCode } from "../actions";

function diasDesde(fecha: string | null): number | null {
  if (!fecha) return null;
  const ms = Date.now() - new Date(fecha).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function formatUltimaSesion(dias: number | null): string {
  if (dias === null) return "todavía no entrenó";
  if (dias === 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

// "Perdido" = ya entrenó alguna vez pero lleva más de 5 días sin volver.
function ultimaSesionClass(dias: number | null): string {
  return dias !== null && dias > 5 ? "text-red-400" : "text-muted";
}

export default async function AthletesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const org = await getOrgContext(supabase);

  const [{ data: athletes }, { data: inviteCodes }, { data: subs }] = await Promise.all([
    supabase
      .from("athletes")
      .select("id, nombre, telefono, estado, ultima_sesion_en, sede_id, sedes(nombre)")
      .eq("org_id", org.orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("invite_codes")
      .select("codigo, usos_actuales, usos_max, activo, created_at")
      .eq("org_id", org.orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("member_subscriptions")
      .select("athlete_id, termina_en, estado")
      .eq("org_id", org.orgId)
      .neq("estado", "cancelada"),
  ]);

  const hoyISO = new Date().toISOString().slice(0, 10);
  // Un socio puede tener varias suscripciones a lo largo del tiempo: vale la más
  // lejana en el futuro, que es la que define si está al día.
  const vigenciaPorAtleta = new Map<string, string>();
  for (const s of subs ?? []) {
    const actual = vigenciaPorAtleta.get(s.athlete_id);
    if (!actual || s.termina_en > actual) vigenciaPorAtleta.set(s.athlete_id, s.termina_en);
  }

  const etiqueta = etiquetaClientes(org.tipo);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">{etiqueta}</h1>
          <p className="text-sm text-muted">{athletes?.length ?? 0} en total</p>
        </div>
        <Link
          href="/dashboard/athletes/new"
          className="btn-primary shrink-0 rounded-xl px-4 py-2 text-sm font-semibold"
        >
          Agregar
        </Link>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <section className="glass rounded-3xl p-7 sm:p-8">
        {!athletes || athletes.length === 0 ? (
          <p className="text-sm text-muted">
            Todavía no tenés {etiqueta.toLowerCase()}. Agregá el primero o compartí un código de
            invitación.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-muted">
                  <th className="pb-3 font-normal">Nombre</th>
                  {org.tipo === "gimnasio" && <th className="pb-3 font-normal">Sede</th>}
                  <th className="pb-3 font-normal">Membresía</th>
                  <th className="pb-3 font-normal">Última sesión</th>
                </tr>
              </thead>
              <tbody>
                {athletes.map((a) => {
                  const vence = vigenciaPorAtleta.get(a.id);
                  const alDia = vence ? vence >= hoyISO : null;
                  const sede = Array.isArray(a.sedes) ? a.sedes[0] : a.sedes;
                  return (
                    <tr
                      key={a.id}
                      className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="py-3.5">
                        <Link
                          href={`/dashboard/athletes/${a.id}`}
                          className="font-medium underline underline-offset-4 transition-colors hover:text-white"
                        >
                          {a.nombre || "Sin nombre"}
                        </Link>
                      </td>
                      {org.tipo === "gimnasio" && (
                        <td className="py-3.5 text-muted">{sede?.nombre ?? "—"}</td>
                      )}
                      <td className="py-3.5">
                        {alDia === null ? (
                          <span className="text-muted">sin plan</span>
                        ) : alDia ? (
                          <span className="text-muted">al día · vence {vence}</span>
                        ) : (
                          <span className="text-red-400">vencida el {vence}</span>
                        )}
                      </td>
                      <td className={`py-3.5 ${ultimaSesionClass(diasDesde(a.ultima_sesion_en))}`}>
                        {formatUltimaSesion(diasDesde(a.ultima_sesion_en))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="glass rounded-3xl p-7 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Códigos de invitación</h2>
          <form action={generateInviteCode}>
            <button type="submit" className="glass-input rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:border-white/40">
              Generar código
            </button>
          </form>
        </div>
        {!inviteCodes || inviteCodes.length === 0 ? (
          <p className="text-sm text-muted">
            Todavía no generaste ningún código. Con uno, alguien se puede vincular por WhatsApp
            cuando el bot esté conectado.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {inviteCodes.map((c) => (
              <li
                key={c.codigo}
                className="glass-input flex items-center justify-between rounded-2xl px-4 py-3 text-sm"
              >
                <span className="font-mono text-[15px] font-medium tracking-wide">{c.codigo}</span>
                <span className="text-muted">
                  {c.usos_actuales}/{c.usos_max} usos{!c.activo && " — inactivo"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
