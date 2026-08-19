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
    <div className="glass max-w-md rounded-3xl p-8 sm:p-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Configuración</h1>
      <p className="mb-8 text-sm text-muted">
        Plan {coach.plan} · Estado {coach.estado}
      </p>

      <form action={updateCoachProfile} className="flex flex-col gap-4">
        <input
          name="nombre"
          defaultValue={coach.nombre ?? ""}
          placeholder="Tu nombre"
          className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted"
        />
        <input
          name="marca"
          defaultValue={coach.marca ?? ""}
          placeholder="Nombre de tu marca"
          className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted"
        />
        <input
          name="telefono"
          defaultValue={coach.telefono ?? ""}
          placeholder="Teléfono (para conectar el bot más adelante)"
          className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        {saved && !error && <p className="text-sm text-green-400">Guardado.</p>}
        <button type="submit" className="btn-primary mt-2 self-start rounded-2xl px-5 py-3 text-[15px] font-semibold">
          Guardar
        </button>
      </form>
    </div>
  );
}
