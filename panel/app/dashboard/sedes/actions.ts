"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext, puedeVerPlata } from "@/lib/org";

export async function crearSede(formData: FormData) {
  const supabase = await createClient();
  const org = await getOrgContext(supabase);
  if (!puedeVerPlata(org.rol)) {
    redirect(`/dashboard/sedes?error=${encodeURIComponent("No tenés permiso para esto")}`);
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const direccion = String(formData.get("direccion") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();

  if (!nombre) redirect(`/dashboard/sedes?error=${encodeURIComponent("Falta el nombre")}`);

  const { error } = await supabase.from("sedes").insert({
    org_id: org.orgId,
    nombre,
    direccion: direccion || null,
    telefono: telefono || null,
  });
  if (error) redirect(`/dashboard/sedes?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/dashboard/sedes");
  redirect("/dashboard/sedes");
}

export async function alternarSede(sedeId: string, activa: boolean) {
  const supabase = await createClient();
  const org = await getOrgContext(supabase);
  if (!puedeVerPlata(org.rol)) {
    redirect(`/dashboard/sedes?error=${encodeURIComponent("No tenés permiso para esto")}`);
  }

  // No se borra: los socios y el histórico apuntan a la sede. Se desactiva.
  const { error } = await supabase.from("sedes").update({ activa }).eq("id", sedeId);
  if (error) redirect(`/dashboard/sedes?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/dashboard/sedes");
}
