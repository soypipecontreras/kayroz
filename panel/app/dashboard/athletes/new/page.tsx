import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext, etiquetaClientes } from "@/lib/org";
import { createAthlete } from "../actions";

export default async function NewAthletePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const org = await getOrgContext(supabase);

  // Solo un gimnasio reparte gente entre sedes; un entrenador independiente no.
  const { data: sedes } =
    org.tipo === "gimnasio"
      ? await supabase
          .from("sedes")
          .select("id, nombre")
          .eq("org_id", org.orgId)
          .eq("activa", true)
          .order("nombre", { ascending: true })
      : { data: null };

  const singular = etiquetaClientes(org.tipo) === "Socios" ? "socio" : "cliente";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/athletes" className="text-sm text-muted underline underline-offset-4">
          ← {etiquetaClientes(org.tipo)}
        </Link>
      </div>

      <div className="glass max-w-md rounded-3xl p-8 sm:p-10">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Agregar {singular}</h1>
        <p className="mb-8 text-sm text-muted">
          Se agrega directo, sin pasar por un código de invitación. Después le generás el acceso a su
          portal desde su ficha.
        </p>

        <form action={createAthlete} className="flex flex-col gap-4">
          <input
            name="nombre"
            required
            placeholder="Nombre"
            className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted"
          />
          <input
            name="telefono"
            placeholder="Teléfono (opcional, +57...)"
            className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted"
          />
          {sedes && sedes.length > 0 && (
            <select
              name="sede_id"
              defaultValue=""
              className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none"
            >
              <option value="">Sin sede asignada</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          )}
          <select
            name="unidad_peso"
            defaultValue="kg"
            className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none"
          >
            <option value="kg">Kilogramos (kg)</option>
            <option value="lb">Libras (lb)</option>
          </select>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="btn-primary mt-2 rounded-2xl px-4 py-3 text-[15px] font-semibold">
            Agregar
          </button>
        </form>
      </div>
    </div>
  );
}
