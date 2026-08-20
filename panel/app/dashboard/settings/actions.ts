"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext, esDueno } from "@/lib/org";

export async function updateOrgProfile(formData: FormData) {
  const supabase = await createClient();
  const org = await getOrgContext(supabase);

  // La policy de RLS ya exige rol dueño para el update; esto solo evita el
  // viaje al server y da un mensaje claro.
  if (!esDueno(org.rol)) {
    redirect(`/dashboard/settings?error=${encodeURIComponent("Solo el dueño puede editar esto")}`);
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const marca = String(formData.get("marca") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();

  const { data: updated, error } = await supabase
    .from("organizations")
    .update({ nombre: nombre || null, marca: marca || null, telefono: telefono || null })
    .eq("id", org.orgId)
    .select("id");

  if (error) redirect(`/dashboard/settings?error=${encodeURIComponent(error.message)}`);
  // Un update que RLS bloquea no da error, solo no toca filas — ver §0 de CLAUDE.md.
  if (!updated || updated.length === 0) {
    redirect(`/dashboard/settings?error=${encodeURIComponent("No pudimos guardar los cambios")}`);
  }

  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?saved=1");
}
