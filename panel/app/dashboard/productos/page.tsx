import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { crearProducto, venderProducto, ajustarStock } from "./actions";

function formatoCOP(monto: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(monto);
}

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const org = await getOrgContext(supabase);

  const [{ data: productos }, { data: athletes }] = await Promise.all([
    supabase
      .from("products")
      .select("id, nombre, precio, stock, activo")
      .eq("org_id", org.orgId)
      .order("nombre", { ascending: true }),
    supabase
      .from("athletes")
      .select("id, nombre")
      .eq("org_id", org.orgId)
      .eq("estado", "activo")
      .order("nombre", { ascending: true }),
  ]);

  const conStock = (productos ?? []).filter((p) => p.activo && p.stock > 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Productos</h1>
        <p className="text-sm text-muted">Lo que vendés en el mostrador.</p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <section className="glass rounded-3xl p-7 sm:p-8">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">Inventario</h2>
        {!productos || productos.length === 0 ? (
          <p className="text-sm text-muted">Todavía no cargaste ningún producto.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {productos.map((p) => (
              <li key={p.id} className="glass-input flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3.5">
                <div>
                  <p className="text-[15px] font-medium">{p.nombre}</p>
                  <p className="text-sm text-muted">
                    {formatoCOP(Number(p.precio))} ·{" "}
                    <span className={p.stock === 0 ? "text-red-400" : ""}>
                      {p.stock} en stock
                    </span>
                  </p>
                </div>
                <form action={ajustarStock.bind(null, p.id)} className="flex shrink-0 items-center gap-2">
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    defaultValue={p.stock}
                    aria-label={`Stock de ${p.nombre}`}
                    className="glass-input w-20 rounded-xl px-3 py-1.5 text-sm text-foreground outline-none"
                  />
                  <button
                    type="submit"
                    className="text-xs text-muted underline underline-offset-4 transition-colors hover:text-foreground"
                  >
                    Ajustar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {conStock.length > 0 && (
        <section className="glass rounded-3xl p-7 sm:p-8">
          <h2 className="mb-5 text-lg font-semibold tracking-tight">Registrar venta</h2>
          <form action={venderProducto} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <select
              name="product_id"
              required
              defaultValue=""
              className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none"
            >
              <option value="" disabled>
                Elegí el producto
              </option>
              {conStock.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} — {formatoCOP(Number(p.precio))} ({p.stock})
                </option>
              ))}
            </select>
            <input
              name="cantidad"
              type="number"
              min="1"
              defaultValue="1"
              className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none"
              aria-label="Cantidad"
            />
            <select
              name="athlete_id"
              defaultValue=""
              className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none"
            >
              <option value="">Sin asociar a nadie</option>
              {(athletes ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre || "Sin nombre"}
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
            <button type="submit" className="btn-primary rounded-2xl px-4 py-3 text-[15px] font-semibold sm:col-span-2">
              Registrar venta
            </button>
          </form>
        </section>
      )}

      <section className="glass rounded-3xl p-7 sm:p-8">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">Agregar producto</h2>
        <form action={crearProducto} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <input
            name="nombre"
            required
            placeholder="Nombre (ej: Proteína 1kg)"
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
            name="stock"
            type="number"
            min="0"
            defaultValue="0"
            placeholder="Stock inicial"
            className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted"
          />
          <button type="submit" className="btn-primary rounded-2xl px-4 py-3 text-[15px] font-semibold">
            Agregar
          </button>
        </form>
      </section>
    </div>
  );
}
