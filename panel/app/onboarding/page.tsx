import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "./OnboardingForm";

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

  // Ya tiene org (staff) o ya es atleta de alguien: no hay nada que crear.
  const [{ data: membership }, { data: athlete }] = await Promise.all([
    supabase.from("memberships").select("id").eq("auth_user_id", user.id).maybeSingle(),
    supabase.from("athletes").select("id").eq("auth_user_id", user.id).maybeSingle(),
  ]);
  if (membership) redirect("/dashboard");
  if (athlete) redirect("/app");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <div className="pointer-events-none absolute inset-0">
        <Image
          src="/brand/kayroz-cabra.png"
          alt=""
          fill
          className="logo-cabra object-cover object-center opacity-[0.5]"
          priority
        />
        <div className="auth-veil absolute inset-0" />
      </div>

      <div className="glass relative z-10 w-full max-w-md rounded-[28px] p-10 sm:p-12">
        <Image src="/brand/kayroz-wordmark.png" alt="Kayroz" width={200} height={95} className="logo-kayroz mb-10" />
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Contanos de vos</h1>
        <p className="mb-8 text-sm text-muted">Con esto arrancamos tu cuenta (trial de 14 días).</p>
        <OnboardingForm error={error} />
      </div>
    </div>
  );
}
