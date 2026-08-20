import { createClient } from "@/lib/supabase/server";
import { getOrgContext, esDueno } from "@/lib/org";
import { updateOrgProfile } from "./actions";

const TIPO_LABEL: Record<string, string> = {
  gimnasio: "Gimnasio",
  entrenador: "Entrenador independiente",
  individual: "Cuenta personal",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const supabase = await createClient();
  const org = await getOrgContext(supabase);

  const { data: fullOrg } = await supabase
    .from("organizations")
    .select("nombre, marca, telefono, plan, estado, tipo")
    .eq("id", org.orgId)
    .maybeSingle();

  const puedeEditar = esDueno(org.rol);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted">
          {TIPO_LABEL[fullOrg?.tipo ?? org.tipo]} · Plan {fullOrg?.plan} · {fullOrg?.estado}
        </p>
      </div>

      <section className="glass max-w-md rounded-3xl p-7 sm:p-8">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">Tu cuenta</h2>
        {!puedeEditar && (
          <p className="mb-4 text-sm text-muted">
            Solo el dueño de la cuenta puede editar estos datos.
          </p>
        )}
        <form action={updateOrgProfile} className="flex flex-col gap-4">
          <input
            name="nombre"
            defaultValue={fullOrg?.nombre ?? ""}
            disabled={!puedeEditar}
            placeholder="Nombre"
            className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted disabled:opacity-50"
          />
          <input
            name="marca"
            defaultValue={fullOrg?.marca ?? ""}
            disabled={!puedeEditar}
            placeholder="Marca (lo que ven tus clientes)"
            className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted disabled:opacity-50"
          />
          <input
            name="telefono"
            defaultValue={fullOrg?.telefono ?? ""}
            disabled={!puedeEditar}
            placeholder="Teléfono (para conectar el bot más adelante)"
            className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted disabled:opacity-50"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          {saved && !error && <p className="text-sm text-green-400">Guardado.</p>}
          {puedeEditar && (
            <button type="submit" className="btn-primary mt-2 self-start rounded-2xl px-5 py-3 text-[15px] font-semibold">
              Guardar
            </button>
          )}
        </form>
      </section>
    </div>
  );
}
