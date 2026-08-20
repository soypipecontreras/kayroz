"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext, esDueno } from "@/lib/org";

const ROLES = ["entrenador", "recepcion"] as const;

export async function invitarMiembro(formData: FormData) {
  const supabase = await createClient();
  const org = await getOrgContext(supabase);
  if (!esDueno(org.rol)) {
    redirect(`/dashboard/equipo?error=${encodeURIComponent("Solo el dueño puede invitar")}`);
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const rol = String(formData.get("rol") ?? "");

  if (!nombre) redirect(`/dashboard/equipo?error=${encodeURIComponent("Falta el nombre")}`);
  if (!ROLES.includes(rol as (typeof ROLES)[number])) {
    redirect(`/dashboard/equipo?error=${encodeURIComponent("Elegí un rol válido")}`);
  }

  // Se crea el membership sin auth_user_id y con token: la persona lo activa
  // desde el link, igual que un atleta. Así el dueño nunca maneja contraseñas
  // ajenas y no hace falta la service_role key en el panel.
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("memberships").insert({
    org_id: org.orgId,
    rol,
    nombre,
    email: email || null,
    activation_token: token,
    activation_expires_at: expiresAt,
  });

  if (error) redirect(`/dashboard/equipo?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/dashboard/equipo");
  redirect("/dashboard/equipo");
}

export async function regenerarAcceso(membershipId: string) {
  const supabase = await createClient();
  const org = await getOrgContext(supabase);
  if (!esDueno(org.rol)) {
    redirect(`/dashboard/equipo?error=${encodeURIComponent("Solo el dueño puede hacer esto")}`);
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: updated, error } = await supabase
    .from("memberships")
    .update({ activation_token: token, activation_expires_at: expiresAt })
    .eq("id", membershipId)
    .select("id");

  if (error) redirect(`/dashboard/equipo?error=${encodeURIComponent(error.message)}`);
  if (!updated || updated.length === 0) {
    redirect(`/dashboard/equipo?error=${encodeURIComponent("No pudimos generar el link")}`);
  }

  revalidatePath("/dashboard/equipo");
}

export async function quitarMiembro(membershipId: string) {
  const supabase = await createClient();
  const org = await getOrgContext(supabase);
  if (!esDueno(org.rol)) {
    redirect(`/dashboard/equipo?error=${encodeURIComponent("Solo el dueño puede hacer esto")}`);
  }
  // Quedarse sin dueño dejaría la org sin nadie que la administre.
  if (membershipId === org.membershipId) {
    redirect(`/dashboard/equipo?error=${encodeURIComponent("No podés quitarte a vos mismo")}`);
  }

  const { error } = await supabase.from("memberships").delete().eq("id", membershipId);
  if (error) redirect(`/dashboard/equipo?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/dashboard/equipo");
  redirect("/dashboard/equipo");
}
