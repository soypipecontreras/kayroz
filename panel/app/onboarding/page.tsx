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
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Image src="/brand/kayroz-wordmark.png" alt="Kayroz" width={220} height={92} className="mb-8" />
          <h1 className="mb-1 text-xl font-semibold">Contanos de vos</h1>
          <p className="mb-6 text-sm text-muted">Con esto arrancamos tu cuenta de coach (trial de 14 días).</p>

          <form action={createCoachProfile} className="flex flex-col gap-3">
            <input
              name="nombre"
              placeholder="Tu nombre"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-white"
            />
            <input
              name="marca"
              placeholder="Nombre de tu marca (lo ven tus atletas)"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-white"
            />
            <input
              name="telefono"
              placeholder="Teléfono (opcional, +57...)"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-white"
            />
            {error && <p className="text-sm text-red-400">No pudimos guardar: {error}</p>}
            <button
              type="submit"
              className="mt-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              Empezar
            </button>
          </form>
        </div>
      </div>

      <div className="relative hidden w-1/2 overflow-hidden bg-black lg:block">
        <Image src="/brand/kayroz-cabra.png" alt="" fill className="invert object-cover opacity-80" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent" />
      </div>
    </div>
  );
}
