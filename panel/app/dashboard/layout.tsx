import { createClient } from "@/lib/supabase/server";
import { getOrgContext, etiquetaClientes, puedeVerPlata, esDueno } from "@/lib/org";
import Sidebar, { type NavItem } from "./Sidebar";
import { signOut } from "./actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const org = await getOrgContext(supabase);

  // El menú se arma según el tipo de cuenta y el rol: un entrenador
  // independiente no tiene sedes ni staff, y un entrenador empleado no ve la
  // caja del gimnasio. Ocultar no es seguridad — el candado real son las
  // policies de RLS; esto es para no mostrar puertas que están cerradas.
  const items: NavItem[] = [
    { href: "/dashboard", label: "Resumen", grupo: "entrenamiento", icon: "resumen" },
  ];

  if (org.tipo !== "individual") {
    items.push({
      href: "/dashboard/athletes",
      label: etiquetaClientes(org.tipo),
      grupo: "entrenamiento",
      icon: "clientes",
    });
  }
  items.push(
    { href: "/dashboard/routines", label: "Rutinas", grupo: "entrenamiento", icon: "rutinas" },
    { href: "/dashboard/exercises", label: "Ejercicios", grupo: "entrenamiento", icon: "ejercicios" },
  );

  if (org.tipo === "gimnasio") {
    items.push({ href: "/dashboard/sedes", label: "Sedes", grupo: "gestion", icon: "sedes" });
  }
  if (org.tipo !== "individual" && esDueno(org.rol)) {
    items.push({ href: "/dashboard/equipo", label: "Equipo", grupo: "gestion", icon: "equipo" });
  }
  // La web pública solo tiene sentido si hay algo que vender: una cuenta
  // personal no le muestra su perfil a nadie.
  if (org.tipo !== "individual" && esDueno(org.rol)) {
    items.push({ href: "/dashboard/web", label: "Mi web", grupo: "gestion", icon: "web" });
  }

  if (org.tipo !== "individual" && puedeVerPlata(org.rol)) {
    items.push(
      { href: "/dashboard/planes", label: "Planes", grupo: "negocio", icon: "planes" },
      { href: "/dashboard/finanzas", label: "Finanzas", grupo: "negocio", icon: "finanzas" },
      { href: "/dashboard/productos", label: "Productos", grupo: "negocio", icon: "productos" },
    );
  }

  items.push({ href: "/dashboard/settings", label: "Configuración", grupo: "gestion", icon: "config" });

  const marca = org.marca || org.nombre || "Kayroz";

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar items={items} marca={marca} signOut={signOut} />
      <div className="min-w-0 flex-1 lg:ml-64">
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
        <footer className="mx-auto max-w-5xl px-6 pb-10 text-xs text-muted">Kayroz</footer>
      </div>
    </div>
  );
}
