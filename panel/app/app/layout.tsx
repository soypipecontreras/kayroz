import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAthlete } from "./actions";

export default async function AthletePortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: athlete } = await supabase
    .from("athletes")
    .select("nombre, coaches(marca, nombre)")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!athlete) redirect("/login");

  const coach = Array.isArray(athlete.coaches) ? athlete.coaches[0] : athlete.coaches;

  return (
    <div className="min-h-screen">
      <header className="glass-nav sticky top-0 z-10">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-5">
            <Image src="/brand/kayroz-mark.png" alt="Kayroz" width={30} height={32} />
            <span className="text-[15px] font-semibold tracking-tight">{coach?.marca || coach?.nombre || "Kayroz"}</span>
            <nav className="ml-3 hidden gap-6 text-sm text-muted sm:flex">
              <Link href="/app" className="transition-colors hover:text-foreground">
                Hoy
              </Link>
              <Link href="/app/log" className="transition-colors hover:text-foreground">
                Cargar
              </Link>
              <Link href="/app/historial" className="transition-colors hover:text-foreground">
                Historial
              </Link>
              <Link href="/app/prs" className="transition-colors hover:text-foreground">
                PRs
              </Link>
            </nav>
          </div>
          <form action={signOutAthlete}>
            <button type="submit" className="text-sm text-muted underline underline-offset-4 transition-colors hover:text-foreground">
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>
      <nav className="mx-auto flex max-w-2xl gap-5 px-6 pt-4 text-sm text-muted sm:hidden">
        <Link href="/app" className="transition-colors hover:text-foreground">
          Hoy
        </Link>
        <Link href="/app/log" className="transition-colors hover:text-foreground">
          Cargar
        </Link>
        <Link href="/app/historial" className="transition-colors hover:text-foreground">
          Historial
        </Link>
        <Link href="/app/prs" className="transition-colors hover:text-foreground">
          PRs
        </Link>
      </nav>
      <main className="mx-auto max-w-2xl px-6 py-10">{children}</main>
      <footer className="mx-auto max-w-2xl px-6 pb-10 text-xs text-muted">Kayroz</footer>
    </div>
  );
}
