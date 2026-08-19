import type { SupabaseClient } from '@supabase/supabase-js';

export interface LastSetsInfo {
  sets: { peso: number | null; reps: number }[];
}

// Trae las series de la última sesión donde se hizo este ejercicio (no solo
// el último set): junta todas las filas de ese mismo workout_id, en orden.
export async function getLastSetsForExercise(
  supabase: SupabaseClient,
  athleteId: string,
  exerciseId: string,
): Promise<LastSetsInfo | null> {
  const { data, error } = await supabase
    .from('sets')
    .select('peso, reps, orden, workout_id, created_at, workouts!inner(athlete_id)')
    .eq('exercise_id', exerciseId)
    .eq('workouts.athlete_id', athleteId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  if (!data || data.length === 0) return null;

  const lastWorkoutId = data[0].workout_id;
  const sets = data
    .filter((s) => s.workout_id === lastWorkoutId)
    .sort((a, b) => a.orden - b.orden)
    .map((s) => ({ peso: s.peso !== null ? parseFloat(String(s.peso)) : null, reps: s.reps as number }));

  return { sets };
}

export interface ActiveRoutine {
  id: string;
  nombre: string;
}

export async function listActiveRoutines(supabase: SupabaseClient, athleteId: string): Promise<ActiveRoutine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select('id, nombre')
    .eq('athlete_id', athleteId)
    .eq('activa', true)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ActiveRoutine[];
}

export interface RoutineExerciseWithLast {
  orden: number;
  nombre_canonico: string;
  series_obj: number;
  reps_min: number;
  reps_max: number | null;
  ultimo: string | null;
}

function formatSets(sets: { peso: number | null; reps: number }[]): string {
  return sets.map((s) => (s.peso !== null ? `${s.peso}x${s.reps}` : `${s.reps} reps`)).join(', ');
}

// "Rutina de pecho" no tiene un campo directo que la identifique — se infiere
// contando, por rutina activa, cuántos de sus ejercicios pertenecen a ese
// grupo muscular, y devolviendo la que más tiene. Funciona para cualquier
// rutina (plantilla o pegada a mano), no solo para nombres tipo "Push A".
export async function findRoutineByMuscleGroup(
  supabase: SupabaseClient,
  routines: ActiveRoutine[],
  grupoMuscular: string,
): Promise<ActiveRoutine | null> {
  const routineIds = routines.map((r) => r.id);
  if (routineIds.length === 0) return null;

  const { data, error } = await supabase
    .from('routine_exercises')
    .select('routine_id, exercises!inner(grupo_muscular)')
    .in('routine_id', routineIds)
    .eq('exercises.grupo_muscular', grupoMuscular);
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.routine_id, (counts.get(row.routine_id) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  let bestId: string | null = null;
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      bestId = id;
      bestCount = count;
    }
  }
  return routines.find((r) => r.id === bestId) ?? null;
}

export async function getRoutineForToday(
  supabase: SupabaseClient,
  athleteId: string,
  routineId: string,
): Promise<RoutineExerciseWithLast[]> {
  const { data: items, error } = await supabase
    .from('routine_exercises')
    .select('orden, series_obj, reps_min, reps_max, exercise_id, exercises(nombre_canonico)')
    .eq('routine_id', routineId)
    .order('orden', { ascending: true });
  if (error) throw error;

  const result: RoutineExerciseWithLast[] = [];
  for (const it of items ?? []) {
    const last = await getLastSetsForExercise(supabase, athleteId, it.exercise_id);
    result.push({
      orden: it.orden,
      nombre_canonico: (it.exercises as unknown as { nombre_canonico: string }).nombre_canonico,
      series_obj: it.series_obj,
      reps_min: it.reps_min,
      reps_max: it.reps_max,
      ultimo: last ? formatSets(last.sets) : null,
    });
  }
  return result;
}
