"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnAthleteId } from "../actions";

// Reimplementa getOrCreateActiveWorkout/insertSets/markPRs de
// supabase/functions/_shared/{workouts,pr}.ts (Deno, lado bot) para el
// portal del atleta en el panel — mismo criterio de reuso que ya se usa para
// el parser de rutinas en app/dashboard/athletes/actions.ts.
export async function logSet(formData: FormData) {
  const supabase = await createClient();
  const athleteId = await getOwnAthleteId(supabase);

  const exerciseId = String(formData.get("exercise_id") ?? "");
  const pesoRaw = String(formData.get("peso") ?? "").trim();
  const reps = parseInt(String(formData.get("reps") ?? ""), 10);
  const series = parseInt(String(formData.get("series") ?? "1"), 10);
  const peso = pesoRaw ? parseFloat(pesoRaw) : null;

  if (!exerciseId || !reps || !series) {
    redirect(`/app/log?error=${encodeURIComponent("Completá ejercicio, reps y series")}`);
  }

  const { data: existingWorkout } = await supabase
    .from("workouts")
    .select("id")
    .eq("athlete_id", athleteId)
    .eq("estado", "en_curso")
    .maybeSingle();

  let workoutId = existingWorkout?.id as string | undefined;
  if (!workoutId) {
    const { data: inserted, error: insertWorkoutError } = await supabase
      .from("workouts")
      .insert({ athlete_id: athleteId })
      .select("id")
      .single();
    if (insertWorkoutError) {
      redirect(`/app/log?error=${encodeURIComponent(insertWorkoutError.message)}`);
    }
    workoutId = inserted!.id as string;
  }

  // PR = peso más pesado histórico para ese ejercicio — mismo criterio que
  // markPRs en _shared/pr.ts.
  let runningMax: number | null = null;
  if (peso !== null) {
    const { data: maxRow } = await supabase
      .from("sets")
      .select("peso, workouts!inner(athlete_id)")
      .eq("exercise_id", exerciseId)
      .eq("workouts.athlete_id", athleteId)
      .not("peso", "is", null)
      .order("peso", { ascending: false })
      .limit(1)
      .maybeSingle();
    runningMax = maxRow?.peso !== undefined && maxRow?.peso !== null ? parseFloat(String(maxRow.peso)) : null;
  }

  const { data: lastSet } = await supabase
    .from("sets")
    .select("orden")
    .eq("workout_id", workoutId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  let nextOrden = (lastSet?.orden ?? 0) + 1;

  const rows = Array.from({ length: series }, () => {
    let esPr = false;
    if (peso !== null) {
      if (runningMax !== null && peso > runningMax) esPr = true;
      if (runningMax === null || peso > runningMax) runningMax = peso;
    }
    return {
      workout_id: workoutId,
      exercise_id: exerciseId,
      orden: nextOrden++,
      peso,
      reps,
      rpe: null,
      es_pr: esPr,
      fuera_de_rutina: false,
      raw_input: `${peso !== null ? `${peso}x${reps}` : `${reps} reps`} (portal)`,
    };
  });

  const { error: insertSetsError } = await supabase.from("sets").insert(rows);
  if (insertSetsError) {
    redirect(`/app/log?error=${encodeURIComponent(insertSetsError.message)}`);
  }

  await supabase.from("athletes").update({ ultima_sesion_en: new Date().toISOString() }).eq("id", athleteId);

  redirect("/app/log?ok=1");
}
