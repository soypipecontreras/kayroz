"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { parseItems, type ParsedItem } from "@/lib/routineItems";

// Verifica que todos los exercise_id sean visibles para este coach (globales o
// propios). RLS ya lo garantiza en el select, así que si falta alguno es que no
// existe o es de otro coach.
async function assertExercisesVisible(
  supabase: Awaited<ReturnType<typeof createClient>>,
  items: ParsedItem[],
): Promise<boolean> {
  const ids = [...new Set(items.map((i) => i.exercise_id))];
  const { data } = await supabase.from("exercises").select("id").in("id", ids);
  return (data?.length ?? 0) === ids.length;
}

export async function createTemplate(formData: FormData) {
  const supabase = await createClient();
  const org = await getOrgContext(supabase);

  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const parsed = parseItems(String(formData.get("items") ?? ""));

  if (!nombre) redirect(`/dashboard/routines/new?error=${encodeURIComponent("Falta el nombre")}`);
  if ("error" in parsed) redirect(`/dashboard/routines/new?error=${encodeURIComponent(parsed.error)}`);
  if (!(await assertExercisesVisible(supabase, parsed.items))) {
    redirect(`/dashboard/routines/new?error=${encodeURIComponent("Alguno de los ejercicios ya no existe")}`);
  }

  const { data: template, error } = await supabase
    .from("routine_templates")
    .insert({ org_id: org.orgId, nombre, descripcion: descripcion || null })
    .select("id")
    .single();
  if (error) redirect(`/dashboard/routines/new?error=${encodeURIComponent(error.message)}`);

  const rows = parsed.items.map((it, i) => ({ template_id: template.id, orden: i + 1, ...it }));
  const { error: itemsError } = await supabase.from("routine_template_exercises").insert(rows);
  if (itemsError) {
    // No dejamos una plantilla vacía dando vueltas si falló el segundo insert.
    await supabase.from("routine_templates").delete().eq("id", template.id);
    redirect(`/dashboard/routines/new?error=${encodeURIComponent(itemsError.message)}`);
  }

  revalidatePath("/dashboard/routines");
  redirect("/dashboard/routines");
}

export async function updateTemplate(templateId: string, formData: FormData) {
  const supabase = await createClient();
  await getOrgContext(supabase);

  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const parsed = parseItems(String(formData.get("items") ?? ""));

  const back = `/dashboard/routines/${templateId}`;
  if (!nombre) redirect(`${back}?error=${encodeURIComponent("Falta el nombre")}`);
  if ("error" in parsed) redirect(`${back}?error=${encodeURIComponent(parsed.error)}`);
  if (!(await assertExercisesVisible(supabase, parsed.items))) {
    redirect(`${back}?error=${encodeURIComponent("Alguno de los ejercicios ya no existe")}`);
  }

  const { error: updateError } = await supabase
    .from("routine_templates")
    .update({ nombre, descripcion: descripcion || null })
    .eq("id", templateId);
  if (updateError) redirect(`${back}?error=${encodeURIComponent(updateError.message)}`);

  // Se reemplazan los ejercicios enteros en vez de hacer un diff: son pocos y
  // el orden importa, así queda mucho más simple de razonar.
  const { error: deleteError } = await supabase
    .from("routine_template_exercises")
    .delete()
    .eq("template_id", templateId);
  if (deleteError) redirect(`${back}?error=${encodeURIComponent(deleteError.message)}`);

  const rows = parsed.items.map((it, i) => ({ template_id: templateId, orden: i + 1, ...it }));
  const { error: insertError } = await supabase.from("routine_template_exercises").insert(rows);
  if (insertError) redirect(`${back}?error=${encodeURIComponent(insertError.message)}`);

  revalidatePath("/dashboard/routines");
  redirect("/dashboard/routines");
}

export async function deleteTemplate(templateId: string) {
  const supabase = await createClient();
  await getOrgContext(supabase);

  // routine_template_exercises cae por ON DELETE CASCADE.
  const { error } = await supabase.from("routine_templates").delete().eq("id", templateId);
  if (error) {
    redirect(`/dashboard/routines?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/routines");
  redirect("/dashboard/routines");
}
