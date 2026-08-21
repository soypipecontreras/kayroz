import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAthlete } from "./actions";
import PortalTabs from "./PortalTabs";

const LINKS = [
  { href: "/app", label: "Hoy" },
  { href: "/app/log", label: "Cargar" },
  { href: "/app/recomendadas", label: "Rutinas" },
  { href: "/app/historial", label: "Historial" },
  { href: "/app/prs", label: "PRs" },
  { href: "/app/perfil", label: "Perfil" },
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
            <Image src="/brand/kayroz-mark.png" alt="Kayroz" width={30} height={32} className="logo-kayroz" />
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
      {/* En el celular la navegación vive abajo, al alcance del pulgar, como
          en una app nativa — el portal es la "app" hasta que exista la nativa.
          El padding de abajo del main deja lugar para la barra fija. */}
      <main className="mx-auto max-w-2xl px-6 py-10 pb-28 sm:pb-10">{children}</main>
      <PortalTabs />
      <footer className="mx-auto max-w-2xl px-6 pb-28 text-xs text-muted sm:pb-10">Kayroz</footer>
    </div>
  );
}
