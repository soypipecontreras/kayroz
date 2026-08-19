import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateInviteCode } from "./actions";

function diasRestantes(trialTerminaEn: string | null): number | null {
  if (!trialTerminaEn) return null;
  const ms = new Date(trialTerminaEn).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: coach } = await supabase
    .from("coaches")
    .select("id, plan, trial_termina_en")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!coach) redirect("/onboarding");

  const [{ data: athletes }, { data: inviteCodes }] = await Promise.all([
    supabase
      .from("athletes")
      .select("id, nombre, telefono, estado, ultima_sesion_en")
      .eq("coach_id", coach.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("invite_codes")
      .select("codigo, usos_actuales, usos_max, activo, created_at")
      .eq("coach_id", coach.id)
      .order("created_at", { ascending: false }),
  ]);

  const dias = diasRestantes(coach.trial_termina_en);

  return (
    <div>
      <div className="mb-10">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Panel</h1>
        <p className="text-sm text-muted">
          Plan {coach.plan}
          {dias !== null && ` — ${dias} día${dias === 1 ? "" : "s"} de trial restantes`}
        </p>
      </div>

      <section className="glass mb-8 rounded-3xl p-7 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Códigos de invitación</h2>
          <form action={generateInviteCode}>
            <button type="submit" className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold">
              Generar código
            </button>
          </form>
        </div>

        {!inviteCodes || inviteCodes.length === 0 ? (
          <p className="text-sm text-muted">
            Todavía no generaste ningún código. Con uno, tu primer atleta se puede vincular por WhatsApp
            cuando esté conectado.
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

      <section className="glass rounded-3xl p-7 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Tus atletas</h2>
          <Link
            href="/dashboard/athletes/new"
            className="glass-input rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:border-white/40"
          >
            + Agregar atleta
          </Link>
        </div>

        {!athletes || athletes.length === 0 ? (
          <p className="text-sm text-muted">
            Todavía no tenés atletas. Agregá uno manualmente o compartí un código de invitación.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-muted">
                <th className="pb-3 font-normal">Nombre</th>
                <th className="pb-3 font-normal">Teléfono</th>
                <th className="pb-3 font-normal">Estado</th>
                <th className="pb-3 font-normal">Última sesión</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((a) => (
                <tr key={a.id} className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.03]">
                  <td className="py-3.5">
                    <Link
                      href={`/dashboard/athletes/${a.id}`}
                      className="font-medium underline underline-offset-4 transition-colors hover:text-white"
                    >
                      {a.nombre || "Sin nombre"}
                    </Link>
                  </td>
                  <td className="py-3.5">{a.telefono || "—"}</td>
                  <td className="py-3.5 capitalize">{a.estado}</td>
                  <td className="py-3.5">
                    {a.ultima_sesion_en ? new Date(a.ultima_sesion_en).toLocaleDateString() : "todavía no entrenó"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
