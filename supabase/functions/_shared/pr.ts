import type { SupabaseClient } from '@supabase/supabase-js';

export function epley1RM(peso: number, reps: number): number {
  return Math.round(peso * (1 + reps / 30) * 10) / 10;
}

export interface PrCheckedSet {
  peso: number | null;
  reps: number;
  esPr: boolean;
}

// PR = peso más pesado levantado en ese ejercicio, a cualquier número de reps.
// La primera vez que se registra un ejercicio no cuenta como PR (no hay nada
// que superar todavía); dentro del mismo mensaje se compara en cadena, así una
// pirámide ascendente ("20x10, 22x8, 25x5") puede marcar más de un PR.
export async function markPRs(
  supabase: SupabaseClient,
  athleteId: string,
  exerciseId: string,
  sets: { peso: number | null; reps: number }[],
): Promise<PrCheckedSet[]> {
  const { data, error } = await supabase
    .from('sets')
    .select('peso, workouts!inner(athlete_id)')
    .eq('exercise_id', exerciseId)
    .eq('workouts.athlete_id', athleteId)
    .not('peso', 'is', null)
    .order('peso', { ascending: false })
    .limit(1);
  if (error) throw error;

  let runningMax: number | null =
    data && data.length > 0 && data[0].peso !== null ? parseFloat(String(data[0].peso)) : null;

  return sets.map((s) => {
    let esPr = false;
    if (s.peso !== null) {
      if (runningMax !== null && s.peso > runningMax) esPr = true;
      if (runningMax === null || s.peso > runningMax) runningMax = s.peso;
    }
    return { peso: s.peso, reps: s.reps, esPr };
  });
}
