"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOwnAthleteId } from "../actions";

// El atleta se autoasigna una plantilla de la Biblioteca Kayroz. Mismo modelo
// que cuando asigna el coach: se COPIAN las filas a routines/routine_exercises,
// la plantilla global nunca se referencia en vivo. RLS lo permite vía
// routines_write_own_by_athlete / routine_exercises_by_athlete.
export async function usarPlantilla(formData: FormData) {
  const supabase = await createClient();
  const athleteId = await getOwnAthleteId(supabase);

  const templateId = String(formData.get("template_id") ?? "");
  const back = "/app/recomendadas";
  if (!templateId) redirect(`${back}?error=${encodeURIComponent("Elegí una rutina")}`);

  const { data: template } = await supabase
    .from("routine_templates")
    .select("id, nombre, es_global")
    .eq("id", templateId)
    .eq("es_global", true)
    .maybeSingle();
  if (!template) redirect(`${back}?error=${encodeURIComponent("No encontramos esa rutina")}`);

  // Evita duplicar: si ya tiene esa misma rutina activa, no la copia de nuevo.
  const { data: yaAsignada } = await supabase
    .from("routines")
    .select("id")
    .eq("athlete_id", athleteId)
    .eq("nombre", template.nombre)
    .eq("activa", true)
    .maybeSingle();
  if (yaAsignada) redirect(`${back}?error=${encodeURIComponent("Ya tenés esa rutina activa")}`);

  const { data: templateExercises } = await supabase
    .from("routine_template_exercises")
    .select("exercise_id, orden, series_obj, reps_min, reps_max, rpe_obj, descanso_seg, notas")
    .eq("template_id", templateId)
    .order("orden", { ascending: true });
  if (!templateExercises || templateExercises.length === 0) {
    redirect(`${back}?error=${encodeURIComponent("Esa rutina no tiene ejercicios")}`);
  }

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .insert({ athlete_id: athleteId, nombre: template.nombre })
    .select("id")
    .single();
  if (routineError) redirect(`${back}?error=${encodeURIComponent(routineError.message)}`);

  const rows = templateExercises.map((te) => ({ routine_id: routine.id, ...te }));
  const { error: insertError } = await supabase.from("routine_exercises").insert(rows);
  if (insertError) {
    await supabase.from("routines").delete().eq("id", routine.id);
    redirect(`${back}?error=${encodeURIComponent(insertError.message)}`);
  }

  revalidatePath("/app");
  redirect("/app");
}
