"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createCoachProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nombre = String(formData.get("nombre") ?? "").trim();
  const marca = String(formData.get("marca") ?? "").trim();
  const telefonoRaw = String(formData.get("telefono") ?? "").trim();

  const trialTerminaEn = new Date();
  trialTerminaEn.setDate(trialTerminaEn.getDate() + 14);

  const { error } = await supabase.from("coaches").insert({
    auth_user_id: user.id,
    nombre: nombre || null,
    marca: marca || null,
    telefono: telefonoRaw || null,
    trial_termina_en: trialTerminaEn.toISOString().slice(0, 10),
  });

  if (error) {
    // Único caso esperable acá: el teléfono ya está en uso por otro coach
    // (columna unique). El resto de errores son bugs, no algo que el
    // usuario pueda arreglar desde este form.
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}
