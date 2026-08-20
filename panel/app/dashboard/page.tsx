import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext, etiquetaClientes, puedeVerPlata } from "@/lib/org";

function diasRestantes(trialTerminaEn: string | null): number | null {
  if (!trialTerminaEn) return null;
  const ms = new Date(trialTerminaEn).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function diasDesde(fecha: string | null): number | null {
  if (!fecha) return null;
  const ms = Date.now() - new Date(fecha).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function formatoCOP(monto: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(monto);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const org = await getOrgContext(supabase);

  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);

  const [{ data: athletes }, { data: pagosMes }, { data: subsVencen }] = await Promise.all([
    supabase.from("athletes").select("id, nombre, estado, ultima_sesion_en").eq("org_id", org.orgId),
    puedeVerPlata(org.rol)
      ? supabase.from("payments").select("monto").eq("org_id", org.orgId).gte("fecha", primerDiaMes)
      : Promise.resolve({ data: null }),
    puedeVerPlata(org.rol)
      ? supabase
          .from("member_subscriptions")
          .select("id, termina_en, estado")
          .eq("org_id", org.orgId)
          .neq("estado", "cancelada")
      : Promise.resolve({ data: null }),
  ]);

  const dias = diasRestantes(org.trialTerminaEn);
  const activos = (athletes ?? []).filter((a) => a.estado === "activo");
  const entrenaronEstaSemana = activos.filter((a) => {
    const d = diasDesde(a.ultima_sesion_en);
    return d !== null && d <= 7;
  }).length;
  const perdidos = activos.filter((a) => {
    const d = diasDesde(a.ultima_sesion_en);
    return d !== null && d > 5;
  }).length;

  const ingresosMes = (pagosMes ?? []).reduce((acc, p) => acc + Number(p.monto), 0);
  const hoyISO = new Date().toISOString().slice(0, 10);
  const vigentes = (subsVencen ?? []).filter((s) => s.termina_en >= hoyISO).length;
  const vencidas = (subsVencen ?? []).filter((s) => s.termina_en < hoyISO).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Resumen</h1>
        <p className="text-sm text-muted">
          Plan {org.plan}
          {dias !== null && ` — ${dias} día${dias === 1 ? "" : "s"} de trial restantes`}
        </p>
      </div>

      {org.tipo === "individual" ? (
        <section className="glass rounded-3xl p-7 sm:p-8">
          <h2 className="mb-2 text-lg font-semibold tracking-tight">Tu cuenta personal</h2>
          <p className="mb-5 text-sm text-muted">
            Entrenás por tu cuenta. Armá tus rutinas y registrá tus entrenos desde tu portal.
          </p>
          <Link href="/app" className="btn-primary inline-block rounded-2xl px-5 py-3 text-[15px] font-semibold">
            Ir a entrenar
          </Link>
        </section>
      ) : (
        <>
          <section className="glass rounded-3xl p-7 sm:p-8">
            <h2 className="mb-5 text-lg font-semibold tracking-tight">Adherencia</h2>
            {activos.length === 0 ? (
              <p className="text-sm text-muted">
                Todavía no tenés {etiquetaClientes(org.tipo).toLowerCase()}.{" "}
                <Link href="/dashboard/athletes" className="underline underline-offset-4">
                  Agregá el primero
                </Link>
                .
              </p>
            ) : (
              <div className="flex flex-wrap gap-8">
                <div>
                  <p className="text-2xl font-semibold tracking-tight">
                    {entrenaronEstaSemana}/{activos.length}
                  </p>
                  <p className="text-sm text-muted">entrenaron en los últimos 7 días</p>
                </div>
                <div>
                  <p className={`text-2xl font-semibold tracking-tight ${perdidos > 0 ? "text-red-400" : ""}`}>
                    {perdidos}
                  </p>
                  <p className="text-sm text-muted">llevan más de 5 días perdidos</p>
                </div>
              </div>
            )}
          </section>

          {puedeVerPlata(org.rol) && (
            <section className="glass rounded-3xl p-7 sm:p-8">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">Este mes</h2>
                <Link
                  href="/dashboard/finanzas"
                  className="text-sm text-muted underline underline-offset-4 transition-colors hover:text-foreground"
                >
                  Ver finanzas
                </Link>
              </div>
              <div className="flex flex-wrap gap-8">
                <div>
                  <p className="text-2xl font-semibold tracking-tight">{formatoCOP(ingresosMes)}</p>
                  <p className="text-sm text-muted">ingresos del mes</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold tracking-tight">{vigentes}</p>
                  <p className="text-sm text-muted">membresías al día</p>
                </div>
                <div>
                  <p className={`text-2xl font-semibold tracking-tight ${vencidas > 0 ? "text-red-400" : ""}`}>
                    {vencidas}
                  </p>
                  <p className="text-sm text-muted">membresías vencidas</p>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
