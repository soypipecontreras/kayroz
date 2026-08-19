import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateCoachProfile } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: coach } = await supabase
    .from("coaches")
    .select("nombre, marca, telefono, plan, estado")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!coach) redirect("/onboarding");

  return (
    <div className="glass max-w-sm rounded-2xl p-8">
      <h1 className="mb-1 text-xl font-semibold">Configuración</h1>
      <p className="mb-6 text-sm text-muted">
        Plan {coach.plan} · Estado {coach.estado}
      </p>

      <form action={updateCoachProfile} className="flex flex-col gap-3">
        <input
          name="nombre"
          defaultValue={coach.nombre ?? ""}
          placeholder="Tu nombre"
          className="glass-input rounded-lg px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted"
        />
        <input
          name="marca"
          defaultValue={coach.marca ?? ""}
          placeholder="Nombre de tu marca"
          className="glass-input rounded-lg px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted"
        />
        <input
          name="telefono"
          defaultValue={coach.telefono ?? ""}
          placeholder="Teléfono (para conectar el bot más adelante)"
          className="glass-input rounded-lg px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        {saved && !error && <p className="text-sm text-green-400">Guardado.</p>}
        <button
          type="submit"
          className="self-start rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Guardar
        </button>
      </form>
    </div>
  );
}
