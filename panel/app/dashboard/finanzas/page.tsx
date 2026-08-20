import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

function formatoCOP(monto: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(monto);
}

const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  otro: "Otro",
};

const CONCEPTO_LABEL: Record<string, string> = {
  membresia: "Membresía",
  producto: "Producto",
  otro: "Otro",
};

export default async function FinanzasPage() {
  const supabase = await createClient();
  const org = await getOrgContext(supabase);

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioMesPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  // Se trae desde el mes pasado para poder comparar sin una segunda consulta.
  const { data: pagos } = await supabase
    .from("payments")
    .select("id, monto, metodo, concepto, detalle, fecha, athletes(nombre)")
    .eq("org_id", org.orgId)
    .gte("fecha", iso(inicioMesPasado))
    .order("fecha", { ascending: false });

  const delMes = (pagos ?? []).filter((p) => p.fecha >= iso(inicioMes));
  const delMesPasado = (pagos ?? []).filter((p) => p.fecha < iso(inicioMes));

  const total = (rows: typeof delMes) => rows.reduce((acc, p) => acc + Number(p.monto), 0);
  const totalMes = total(delMes);
  const totalMesPasado = total(delMesPasado);

  const porConcepto = new Map<string, number>();
  for (const p of delMes) {
    porConcepto.set(p.concepto, (porConcepto.get(p.concepto) ?? 0) + Number(p.monto));
  }

  const variacion =
    totalMesPasado > 0 ? Math.round(((totalMes - totalMesPasado) / totalMesPasado) * 100) : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Finanzas</h1>
        <p className="text-sm text-muted">La plata que entra a tu gimnasio.</p>
      </div>

      <section className="glass rounded-3xl p-7 sm:p-8">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">Ingresos de este mes</h2>
        <div className="flex flex-wrap gap-8">
          <div>
            <p className="text-2xl font-semibold tracking-tight">{formatoCOP(totalMes)}</p>
            <p className="text-sm text-muted">
              {variacion === null
                ? "sin comparación con el mes pasado"
                : `${variacion >= 0 ? "+" : ""}${variacion}% vs. mes pasado`}
            </p>
          </div>
          {[...porConcepto.entries()].map(([concepto, monto]) => (
            <div key={concepto}>
              <p className="text-2xl font-semibold tracking-tight">{formatoCOP(monto)}</p>
              <p className="text-sm text-muted">{CONCEPTO_LABEL[concepto] ?? concepto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass rounded-3xl p-7 sm:p-8">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">Últimos movimientos</h2>
        {!pagos || pagos.length === 0 ? (
          <p className="text-sm text-muted">
            Todavía no hay ingresos registrados. Se cargan solos cuando vendés una membresía en
            Planes o un producto en Productos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-divider text-left text-muted">
                  <th className="pb-3 font-normal">Fecha</th>
                  <th className="pb-3 font-normal">Concepto</th>
                  <th className="pb-3 font-normal">Quién</th>
                  <th className="pb-3 font-normal">Método</th>
                  <th className="pb-3 text-right font-normal">Monto</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((p) => {
                  const atleta = Array.isArray(p.athletes) ? p.athletes[0] : p.athletes;
                  return (
                    <tr key={p.id} className="border-b border-divider-soft last:border-0">
                      <td className="py-3 text-muted">{p.fecha}</td>
                      <td className="py-3">
                        {CONCEPTO_LABEL[p.concepto] ?? p.concepto}
                        {p.detalle && <span className="text-muted"> · {p.detalle}</span>}
                      </td>
                      <td className="py-3 text-muted">{atleta?.nombre ?? "—"}</td>
                      <td className="py-3 text-muted">{METODO_LABEL[p.metodo] ?? p.metodo}</td>
                      <td className="py-3 text-right font-medium">{formatoCOP(Number(p.monto))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
