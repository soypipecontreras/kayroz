import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { crearSede, alternarSede } from "./actions";

export default async function SedesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const org = await getOrgContext(supabase);

  const [{ data: sedes }, { data: athletes }] = await Promise.all([
    supabase
      .from("sedes")
      .select("id, nombre, direccion, telefono, activa")
      .eq("org_id", org.orgId)
      .order("nombre", { ascending: true }),
    supabase.from("athletes").select("sede_id").eq("org_id", org.orgId),
  ]);

  const porSede = new Map<string, number>();
  for (const a of athletes ?? []) {
    if (a.sede_id) porSede.set(a.sede_id, (porSede.get(a.sede_id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Sedes</h1>
        <p className="text-sm text-muted">Las sucursales de tu gimnasio.</p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <section className="glass rounded-3xl p-7 sm:p-8">
        {!sedes || sedes.length === 0 ? (
          <p className="text-sm text-muted">Todavía no cargaste ninguna sede.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sedes.map((s) => (
              <li key={s.id} className="glass-input flex flex-wrap items-start justify-between gap-3 rounded-2xl px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium">
                    {s.nombre}
                    {!s.activa && <span className="ml-2 text-xs text-muted">(inactiva)</span>}
                  </p>
                  <p className="text-sm text-muted">
                    {s.direccion || "sin dirección"}
                    {s.telefono && ` · ${s.telefono}`} · {porSede.get(s.id) ?? 0} socios
                  </p>
                </div>
                <form action={alternarSede.bind(null, s.id, !s.activa)}>
                  <button
                    type="submit"
                    className="shrink-0 text-xs text-muted underline underline-offset-4 transition-colors hover:text-foreground"
                  >
                    {s.activa ? "Desactivar" : "Activar"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass rounded-3xl p-7 sm:p-8">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">Agregar sede</h2>
        <form action={crearSede} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            name="nombre"
            required
            placeholder="Nombre (ej: Sede Norte)"
            className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted sm:col-span-2"
          />
          <input
            name="direccion"
            placeholder="Dirección"
            className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted"
          />
          <input
            name="telefono"
            placeholder="Teléfono"
            className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted"
          />
          <button type="submit" className="btn-primary rounded-2xl px-4 py-3 text-[15px] font-semibold sm:col-span-2">
            Agregar
          </button>
        </form>
      </section>
    </div>
  );
}
