import { createClient } from "@/lib/supabase/server";
import { getOrgContext, etiquetaClientes } from "@/lib/org";
import { crearPlan, alternarPlan, venderPlan } from "./actions";

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
    return meses === 1 ? "1 mes" : `${meses} meses`;
  }
  return `${dias} días`;
}

export default async function PlanesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const org = await getOrgContext(supabase);

  const [{ data: planes }, { data: athletes }] = await Promise.all([
    supabase
      .from("membership_plans")
      .select("id, nombre, precio, duracion_dias, activo")
      .eq("org_id", org.orgId)
      .order("precio", { ascending: true }),
    supabase
      .from("athletes")
      .select("id, nombre")
      .eq("org_id", org.orgId)
      .eq("estado", "activo")
      .order("nombre", { ascending: true }),
  ]);

  const planesActivos = (planes ?? []).filter((p) => p.activo);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Planes</h1>
        <p className="text-sm text-muted">
          Las membresías que le vendés a tus {etiquetaClientes(org.tipo).toLowerCase()}.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <section className="glass rounded-3xl p-7 sm:p-8">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">Tus planes</h2>
        {!planes || planes.length === 0 ? (
          <p className="text-sm text-muted">Todavía no creaste ningún plan.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {planes.map((p) => (
              <li key={p.id} className="glass-input flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3.5">
                <div>
                  <p className="text-[15px] font-medium">
                    {p.nombre}
                    {!p.activo && <span className="ml-2 text-xs text-muted">(inactivo)</span>}
                  </p>
                  <p className="text-sm text-muted">
                    {formatoCOP(Number(p.precio))} · {duracionLegible(p.duracion_dias)}
                  </p>
                </div>
                <form action={alternarPlan.bind(null, p.id, !p.activo)}>
                  <button
                    type="submit"
                    className="text-xs text-muted underline underline-offset-4 transition-colors hover:text-foreground"
                  >
                    {p.activo ? "Desactivar" : "Activar"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {planesActivos.length > 0 && (athletes?.length ?? 0) > 0 && (
        <section className="glass rounded-3xl p-7 sm:p-8">
          <h2 className="mb-2 text-lg font-semibold tracking-tight">Vender una membresía</h2>
          <p className="mb-5 text-sm text-muted">
            Registra el pago y activa la membresía. Si la persona ya tiene una vigente, la nueva
            arranca cuando esa termina.
          </p>
          <form action={venderPlan} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <select
              name="athlete_id"
              required
              defaultValue=""
              className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none"
            >
              <option value="" disabled>
                Elegí a quién
              </option>
              {(athletes ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre || "Sin nombre"}
                </option>
              ))}
            </select>
            <select
              name="plan_id"
              required
              defaultValue=""
              className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none"
            >
              <option value="" disabled>
                Elegí el plan
              </option>
              {planesActivos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} — {formatoCOP(Number(p.precio))}
                </option>
              ))}
            </select>
            <select
              name="metodo"
              defaultValue="efectivo"
              className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none"
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="otro">Otro</option>
            </select>
            <button type="submit" className="btn-primary rounded-2xl px-4 py-3 text-[15px] font-semibold">
              Registrar venta
            </button>
          </form>
        </section>
      )}

      <section className="glass rounded-3xl p-7 sm:p-8">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">Crear plan</h2>
        <form action={crearPlan} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <input
            name="nombre"
            required
            placeholder="Nombre (ej: Mensualidad)"
            className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted sm:col-span-3"
          />
          <input
            name="precio"
            type="number"
            min="0"
            step="1000"
            required
            placeholder="Precio (COP)"
            className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted"
          />
          <input
            name="duracion_dias"
            type="number"
            min="1"
            required
            defaultValue="30"
            placeholder="Duración (días)"
            className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted"
          />
          <button type="submit" className="btn-primary rounded-2xl px-4 py-3 text-[15px] font-semibold">
            Crear
          </button>
        </form>
      </section>
    </div>
  );
}
