import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext, esDueno } from "@/lib/org";
import { invitarMiembro, regenerarAcceso, quitarMiembro } from "./actions";

const ROL_LABEL: Record<string, string> = {
  dueno: "Dueño",
  entrenador: "Entrenador",
  recepcion: "Recepción",
};

export default async function EquipoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const org = await getOrgContext(supabase);

  const { data: miembros } = await supabase
    .from("memberships")
    .select("id, nombre, email, rol, estado, auth_user_id, activation_token, activation_expires_at, created_at")
    .eq("org_id", org.orgId)
    .order("created_at", { ascending: true });

  const host = (await headers()).get("host");
  const origin = host?.startsWith("localhost") ? `http://${host}` : `https://${host}`;
  const ahora = new Date();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Equipo</h1>
        <p className="text-sm text-muted">
          Quién más entra a esta cuenta. Un entrenador ve y entrena a los clientes; recepción además
          maneja planes, pagos y productos.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <section className="glass rounded-3xl p-7 sm:p-8">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">Gente en la cuenta</h2>
        <ul className="flex flex-col gap-3">
          {(miembros ?? []).map((m) => {
            const vencido = m.activation_expires_at
              ? new Date(m.activation_expires_at) < ahora
              : true;
            const pendiente = !m.auth_user_id;
            return (
              <li key={m.id} className="glass-input rounded-2xl px-4 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium">
                      {m.nombre || "Sin nombre"}
                      {m.id === org.membershipId && <span className="ml-2 text-xs text-muted">(vos)</span>}
                    </p>
                    <p className="text-sm text-muted">
                      {ROL_LABEL[m.rol] ?? m.rol}
                      {m.email && ` · ${m.email}`}
                      {pendiente && " · sin activar"}
                    </p>
                  </div>
                  {esDueno(org.rol) && m.id !== org.membershipId && (
                    <div className="flex shrink-0 gap-3">
                      {pendiente && (
                        <form action={regenerarAcceso.bind(null, m.id)}>
                          <button
                            type="submit"
                            className="text-xs text-muted underline underline-offset-4 transition-colors hover:text-foreground"
                          >
                            {m.activation_token && !vencido ? "Nuevo link" : "Generar link"}
                          </button>
                        </form>
                      )}
                      <form action={quitarMiembro.bind(null, m.id)}>
                        <button
                          type="submit"
                          className="text-xs text-muted underline underline-offset-4 transition-colors hover:text-red-400"
                        >
                          Quitar
                        </button>
                      </form>
                    </div>
                  )}
                </div>
                {pendiente && m.activation_token && !vencido && (
                  <p className="mt-2 break-all font-mono text-[13px] text-muted">
                    {`${origin}/join-equipo/${m.activation_token}`}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {esDueno(org.rol) && (
        <section className="glass rounded-3xl p-7 sm:p-8">
          <h2 className="mb-5 text-lg font-semibold tracking-tight">Invitar a alguien</h2>
          <form action={invitarMiembro} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              name="nombre"
              required
              placeholder="Nombre"
              className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted"
            />
            <input
              name="email"
              type="email"
              placeholder="Email (opcional)"
              className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted"
            />
            <select
              name="rol"
              required
              defaultValue=""
              className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none"
            >
              <option value="" disabled>
                Rol
              </option>
              <option value="entrenador">Entrenador</option>
              <option value="recepcion">Recepción</option>
            </select>
            <button type="submit" className="btn-primary rounded-2xl px-4 py-3 text-[15px] font-semibold">
              Invitar
            </button>
          </form>
          <p className="mt-4 text-sm text-muted">
            Se genera un link de activación. Compartiselo y la persona pone su propia contraseña —
            vos nunca manejás su clave.
          </p>
        </section>
      )}
    </div>
  );
}
