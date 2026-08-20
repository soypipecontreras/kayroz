import { cache } from "react";
import { redirect } from "next/navigation";
import type { createClient } from "@/lib/supabase/server";

export type OrgTipo = "gimnasio" | "entrenador" | "individual";
export type Rol = "dueno" | "entrenador" | "recepcion";

export interface OrgContext {
  orgId: string;
  tipo: OrgTipo;
  nombre: string | null;
  marca: string | null;
  plan: string;
  trialTerminaEn: string | null;
  rol: Rol;
  membershipId: string;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Puede tocar plata (planes, pagos, productos). Espeja auth_can_manage_money()
// del lado SQL — la de verdad es esa, que corre en RLS; esta es para no dibujar
// botones que van a fallar.
export function puedeVerPlata(rol: Rol): boolean {
  return rol === "dueno" || rol === "recepcion";
}

export function esDueno(rol: Rol): boolean {
  return rol === "dueno";
}

// Cómo le dice cada tipo de org a la gente que entrena ahí: un gimnasio tiene
// socios, un entrenador tiene clientes. Es la misma tabla `athletes`.
export function etiquetaClientes(tipo: OrgTipo): string {
  return tipo === "gimnasio" ? "Socios" : "Clientes";
}

// Contexto del usuario logueado. Si no tiene membership, no es staff: puede ser
// un atleta (va a /app) o alguien recién registrado (va a /onboarding).
//
// Envuelto en `cache()`: el layout del panel y la página SIEMPRE lo llaman los
// dos, y sin esto cada página hacía cuatro viajes de red por identidad (dos
// validaciones de sesión + dos consultas) donde alcanzan dos. Era la causa de
// que el panel tardara en abrir. Depende de que `createClient` también esté
// cacheado, si no llega un cliente distinto cada vez y el caché nunca acierta.
export const getOrgContext = cache(async (supabase: SupabaseServerClient): Promise<OrgContext> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("memberships")
    .select("id, rol, org_id, organizations(id, tipo, nombre, marca, plan, trial_termina_en)")
    .eq("auth_user_id", user.id)
    .eq("estado", "activo")
    .maybeSingle();

  if (!membership) {
    // ¿Es un atleta? Entonces su lugar es el portal, no el panel.
    const { data: athlete } = await supabase
      .from("athletes")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    redirect(athlete ? "/app" : "/onboarding");
  }

  const org = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;
  if (!org) redirect("/onboarding");

  return {
    orgId: org.id,
    tipo: org.tipo as OrgTipo,
    nombre: org.nombre,
    marca: org.marca,
    plan: org.plan,
    trialTerminaEn: org.trial_termina_en,
    rol: membership.rol as Rol,
    membershipId: membership.id,
  };
});
