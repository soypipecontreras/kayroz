import type { SupabaseClient } from '@supabase/supabase-js';

export async function getOrCreateActiveWorkout(
  supabase: SupabaseClient,
  athleteId: string,
): Promise<string> {
  const { data: existing, error: selectError } = await supabase
    .from('workouts')
    .select('id')
    .eq('athlete_id', athleteId)
    .eq('estado', 'en_curso')
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id as string;

  const { data: inserted, error: insertError } = await supabase
    .from('workouts')
    .insert({ athlete_id: athleteId })
    .select('id')
    .single();

  if (!insertError) return inserted.id as string;

  // Carrera con otro mensaje del mismo atleta creando el workout al mismo tiempo:
  // el índice único parcial (un solo 'en_curso' por atleta) rechaza el segundo insert.
  if (insertError.code === '23505') {
    const { data: retried, error: retryError } = await supabase
      .from('workouts')
      .select('id')
      .eq('athlete_id', athleteId)
      .eq('estado', 'en_curso')
      .single();
    if (retryError) throw retryError;
    return retried.id as string;
  }

  throw insertError;
}

export interface SetToInsert {
  exercise_id: string;
  peso: number | null;
  reps: number;
  rpe: number | null;
  raw_input: string;
  es_pr: boolean;
}

export async function insertSets(
  supabase: SupabaseClient,
  workoutId: string,
  sets: SetToInsert[],
): Promise<void> {
  const { data: last, error: lastError } = await supabase
    .from('sets')
    .select('orden')
    .eq('workout_id', workoutId)
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw lastError;

  let nextOrden = (last?.orden ?? 0) + 1;
  const rows = sets.map((s) => ({
    workout_id: workoutId,
    exercise_id: s.exercise_id,
    orden: nextOrden++,
    peso: s.peso,
    reps: s.reps,
    rpe: s.rpe,
    es_pr: s.es_pr,
    fuera_de_rutina: false,
    raw_input: s.raw_input,
  }));

  const { error: insertError } = await supabase.from('sets').insert(rows);
  if (insertError) throw insertError;
}
