import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeForMatch } from './parser.ts';

export interface ResolvedExercise {
  id: string;
  nombre_canonico: string;
  tipo: string;
  instrucciones: string | null;
  imagen_url: string | null;
}

export async function resolveExercise(
  supabase: SupabaseClient,
  orgId: string,
  exerciseText: string,
): Promise<ResolvedExercise | null> {
  const target = normalizeForMatch(exerciseText);

  const { data: exercises, error: exercisesError } = await supabase
    .from('exercises')
    .select('id, nombre_canonico, tipo, instrucciones, imagen_url, es_global, org_id')
    .or(`es_global.eq.true,org_id.eq.${orgId}`);
  if (exercisesError) throw exercisesError;
  if (!exercises || exercises.length === 0) return null;

  const byId = new Map<string, ResolvedExercise>();
  for (const e of exercises) {
    byId.set(e.id, {
      id: e.id,
      nombre_canonico: e.nombre_canonico,
      tipo: e.tipo,
      instrucciones: e.instrucciones,
      imagen_url: e.imagen_url,
    });
    if (normalizeForMatch(e.nombre_canonico) === target) {
      return byId.get(e.id)!;
    }
  }

  const exerciseIds = exercises.map((e) => e.id);
  const { data: aliases, error: aliasesError } = await supabase
    .from('exercise_aliases')
    .select('alias, exercise_id')
    .in('exercise_id', exerciseIds);
  if (aliasesError) throw aliasesError;

  for (const a of aliases ?? []) {
    if (normalizeForMatch(a.alias) === target) {
      return byId.get(a.exercise_id) ?? null;
    }
  }

  return null;
}
