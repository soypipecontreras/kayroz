import type { SupabaseClient } from '@supabase/supabase-js';
import { epley1RM } from './pr.ts';

function exerciseNameOf(row: { nombre_canonico: string } | { nombre_canonico: string }[] | null): string {
  const e = Array.isArray(row) ? row[0] : row;
  return e?.nombre_canonico ?? '—';
}

// ============================================================
// /prs — el "PR actual" de cada ejercicio siempre es el peso máximo
// histórico real, sin importar si ese set en particular quedó marcado
// es_pr=true (esa marca es solo para el mensaje de celebración en el
// momento del registro, no un estado que se recalcule después).
// ============================================================

export interface PrEntry {
  exerciseName: string;
  pesoMax: number;
  reps: number;
  fecha: string;
}

export async function getAthletePRs(supabase: SupabaseClient, athleteId: string): Promise<PrEntry[]> {
  const { data, error } = await supabase
    .from('sets')
    .select('peso, reps, created_at, exercise_id, exercises(nombre_canonico), workouts!inner(athlete_id)')
    .eq('workouts.athlete_id', athleteId)
    .not('peso', 'is', null)
    .order('peso', { ascending: false });
  if (error) throw error;

  const seen = new Set<string>();
  const result: PrEntry[] = [];
  for (const row of data ?? []) {
    if (seen.has(row.exercise_id)) continue;
    seen.add(row.exercise_id);
    result.push({
      exerciseName: exerciseNameOf(row.exercises),
      pesoMax: parseFloat(String(row.peso)),
      reps: row.reps as number,
      fecha: row.created_at as string,
    });
  }
  return result;
}

// ============================================================
// /historial — últimas N sesiones con sus series.
// ============================================================

export interface WorkoutSetSummary {
  exerciseName: string;
  peso: number | null;
  reps: number;
  esPr: boolean;
}

export interface WorkoutSummary {
  fecha: string;
  estado: string;
  sets: WorkoutSetSummary[];
}

export async function getRecentWorkouts(
  supabase: SupabaseClient,
  athleteId: string,
  limit = 10,
): Promise<WorkoutSummary[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('fecha, estado, sets(peso, reps, es_pr, orden, exercises(nombre_canonico))')
    .eq('athlete_id', athleteId)
    .order('fecha', { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((w) => ({
    fecha: w.fecha as string,
    estado: w.estado as string,
    sets: [...(w.sets ?? [])]
      .sort((a, b) => a.orden - b.orden)
      .map((s) => ({
        exerciseName: exerciseNameOf(s.exercises),
        peso: s.peso !== null ? parseFloat(String(s.peso)) : null,
        reps: s.reps as number,
        esPr: s.es_pr as boolean,
      })),
  }));
}

// ============================================================
// /progreso [ejercicio] — evolución cronológica de un ejercicio puntual.
// ============================================================

export interface ProgressEntry {
  fecha: string;
  peso: number | null;
  reps: number;
  e1rm: number | null;
}

export async function getExerciseProgress(
  supabase: SupabaseClient,
  athleteId: string,
  exerciseId: string,
  limit = 12,
): Promise<ProgressEntry[]> {
  const { data, error } = await supabase
    .from('sets')
    .select('peso, reps, created_at, workouts!inner(athlete_id)')
    .eq('exercise_id', exerciseId)
    .eq('workouts.athlete_id', athleteId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? [])
    .map((s) => {
      const peso = s.peso !== null ? parseFloat(String(s.peso)) : null;
      const reps = s.reps as number;
      return {
        fecha: s.created_at as string,
        peso,
        reps,
        e1rm: peso !== null ? epley1RM(peso, reps) : null,
      };
    })
    .reverse(); // cronológico: más viejo primero, más nuevo al final
}

// ============================================================
// /deshacer — borra todos los sets del último mensaje registrado (mismo
// workout, mismo created_at exacto: un solo INSERT comparte timestamp de
// transacción en Postgres, así que agrupa exactamente los sets de un mensaje).
// ============================================================

export interface UndoResult {
  ok: boolean;
  deletedCount: number;
  exerciseName?: string;
}

export async function undoLastSet(supabase: SupabaseClient, athleteId: string): Promise<UndoResult> {
  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .select('id')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (workoutError) throw workoutError;
  if (!workout) return { ok: false, deletedCount: 0 };

  const { data: lastSet, error: lastSetError } = await supabase
    .from('sets')
    .select('created_at, exercises(nombre_canonico)')
    .eq('workout_id', workout.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastSetError) throw lastSetError;
  if (!lastSet) return { ok: false, deletedCount: 0 };

  const { data: deleted, error: deleteError } = await supabase
    .from('sets')
    .delete()
    .eq('workout_id', workout.id)
    .eq('created_at', lastSet.created_at)
    .select('id');
  if (deleteError) throw deleteError;

  return {
    ok: true,
    deletedCount: deleted?.length ?? 0,
    exerciseName: exerciseNameOf(lastSet.exercises),
  };
}
