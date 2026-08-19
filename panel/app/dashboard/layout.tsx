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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Image src="/brand/kayroz-mark.png" alt="Kayroz" width={28} height={28} className="rounded-sm" />
            <span className="font-semibold">{coach.marca || coach.nombre || "Tu cuenta"}</span>
            <nav className="ml-2 flex gap-4 text-sm text-muted">
              <Link href="/dashboard" className="hover:text-foreground">
                Atletas
              </Link>
              <Link href="/dashboard/exercises" className="hover:text-foreground">
                Ejercicios
              </Link>
              <Link href="/dashboard/settings" className="hover:text-foreground">
                Configuración
              </Link>
            </nav>
          </div>
          <form action={signOut}>
            <button type="submit" className="text-sm text-muted underline hover:text-foreground">
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
      <footer className="mx-auto max-w-3xl px-4 pb-8 text-xs text-muted">Kayroz</footer>
    </div>
  );
}
