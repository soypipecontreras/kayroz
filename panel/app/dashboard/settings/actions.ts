"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateCoachProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nombre = String(formData.get("nombre") ?? "").trim();
  const marca = String(formData.get("marca") ?? "").trim();
  const telefonoRaw = String(formData.get("telefono") ?? "").trim();

  const { error } = await supabase
    .from("coaches")
    .update({ nombre: nombre || null, marca: marca || null, telefono: telefonoRaw || null })
    .eq("auth_user_id", user.id);

  if (error) {
    const msg = error.code === "23505" ? "Ese teléfono ya está en uso por otra cuenta" : error.message;
    redirect(`/dashboard/settings?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  redirect("/dashboard/settings?saved=1");
}
