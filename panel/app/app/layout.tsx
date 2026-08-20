import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAthlete } from "./actions";

const LINKS = [
  { href: "/app", label: "Hoy" },
  { href: "/app/log", label: "Cargar" },
  { href: "/app/historial", label: "Historial" },
  { href: "/app/prs", label: "PRs" },
];

export default async function AthletePortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: athlete } = await supabase
    .from("athletes")
    .select("nombre, organizations(marca, nombre)")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!athlete) {
    // No es atleta. Puede ser staff (su lugar es el panel) o alguien recién
    // registrado que todavía no armó su cuenta. Mandarlo a /login sería un
    // rebote, porque sesión ya tiene.
    const { data: membership } = await supabase
      .from("memberships")
      .select("id")
      .eq("auth_user_id", user.id)
      .eq("estado", "activo")
      .maybeSingle();
    redirect(membership ? "/dashboard" : "/onboarding");
  }

  const org = Array.isArray(athlete.organizations) ? athlete.organizations[0] : athlete.organizations;

  return (
    <div className="min-h-screen">
      <header className="glass-nav sticky top-0 z-10">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-5">
            <Image src="/brand/kayroz-mark.png" alt="Kayroz" width={30} height={32} />
            <span className="text-[15px] font-semibold tracking-tight">
              {org?.marca || org?.nombre || "Kayroz"}
            </span>
            <nav className="ml-3 hidden gap-6 text-sm text-muted sm:flex">
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="transition-colors hover:text-foreground">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <form action={signOutAthlete}>
            <button
              type="submit"
              className="text-sm text-muted underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>
      <nav className="mx-auto flex max-w-2xl gap-5 px-6 pt-4 text-sm text-muted sm:hidden">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="transition-colors hover:text-foreground">
            {l.label}
          </Link>
        ))}
      </nav>
      <main className="mx-auto max-w-2xl px-6 py-10">{children}</main>
      <footer className="mx-auto max-w-2xl px-6 pb-10 text-xs text-muted">Kayroz</footer>
    </div>
  );
}
