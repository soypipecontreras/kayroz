import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: coach } = await supabase
    .from("coaches")
    .select("marca, nombre")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!coach) redirect("/onboarding");

  return (
    <div className="min-h-screen">
      <header className="glass-nav sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-5">
            <Image src="/brand/kayroz-mark.png" alt="Kayroz" width={30} height={32} />
            <span className="text-[15px] font-semibold tracking-tight">{coach.marca || coach.nombre || "Tu cuenta"}</span>
            <nav className="ml-3 hidden gap-6 text-sm text-muted sm:flex">
              <Link href="/dashboard" className="transition-colors hover:text-foreground">
                Atletas
              </Link>
              <Link href="/dashboard/exercises" className="transition-colors hover:text-foreground">
                Ejercicios
              </Link>
              <Link href="/dashboard/settings" className="transition-colors hover:text-foreground">
                Configuración
              </Link>
            </nav>
          </div>
          <form action={signOut}>
            <button type="submit" className="text-sm text-muted underline underline-offset-4 transition-colors hover:text-foreground">
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">{children}</main>
      <footer className="mx-auto max-w-4xl px-6 pb-10 text-xs text-muted">Kayroz</footer>
    </div>
  );
}
