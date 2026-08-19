import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createCoachProfile } from "./actions";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const { error } = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existingCoach } = await supabase
    .from("coaches")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (existingCoach) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <div className="pointer-events-none absolute inset-0">
        <Image
          src="/brand/kayroz-cabra.png"
          alt=""
          fill
          className="invert object-cover object-center opacity-[0.14]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/60 to-black" />
      </div>

      <div className="glass relative z-10 w-full max-w-md rounded-[28px] p-10 sm:p-12">
        <Image src="/brand/kayroz-wordmark.png" alt="Kayroz" width={200} height={95} className="mb-10" />
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Contanos de vos</h1>
        <p className="mb-8 text-sm text-muted">Con esto arrancamos tu cuenta de coach (trial de 14 días).</p>

        <form action={createCoachProfile} className="flex flex-col gap-4">
          <input
            name="nombre"
            placeholder="Tu nombre"
            className="glass-input rounded-2xl px-4 py-3.5 text-[15px] text-foreground outline-none placeholder:text-muted"
          />
          <input
            name="marca"
            placeholder="Nombre de tu marca (lo ven tus atletas)"
            className="glass-input rounded-2xl px-4 py-3.5 text-[15px] text-foreground outline-none placeholder:text-muted"
          />
          <input
            name="telefono"
            placeholder="Teléfono (opcional, +57...)"
            className="glass-input rounded-2xl px-4 py-3.5 text-[15px] text-foreground outline-none placeholder:text-muted"
          />
          {error && <p className="text-sm text-red-400">No pudimos guardar: {error}</p>}
          <button type="submit" className="btn-primary mt-2 rounded-2xl px-4 py-3.5 text-[15px] font-semibold">
            Empezar
          </button>
        </form>
      </div>
    </div>
  );
}
