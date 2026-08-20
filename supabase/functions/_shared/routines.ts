import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveExercise } from './exercises.ts';

export interface RoutineLineItem {
  exercise_id: string;
  nombre_canonico: string;
  series_obj: number;
  reps_min: number;
  reps_max: number | null;
}

export interface ParsedRoutineLine {
  ok: true;
  item: RoutineLineItem;
}
export interface FailedRoutineLine {
  ok: false;
  raw: string;
  reason: 'formato' | 'ejercicio_no_encontrado';
}

const LINE_RE = /^(.+?)\s+(\d+)\s*x\s*(amrap|\d+)$/i;

export async function parseRoutineLine(
  supabase: SupabaseClient,
  orgId: string,
  line: string,
): Promise<ParsedRoutineLine | FailedRoutineLine> {
  const trimmed = line.trim();
  const match = trimmed.match(LINE_RE);
  if (!match) return { ok: false, raw: trimmed, reason: 'formato' };

  const [, exerciseText, seriesRaw, repsRaw] = match;
  const exercise = await resolveExercise(supabase, orgId, exerciseText.trim());
  if (!exercise) return { ok: false, raw: trimmed, reason: 'ejercicio_no_encontrado' };

  const isAmrap = repsRaw.toLowerCase() === 'amrap';
  return {
    ok: true,
    item: {
      exercise_id: exercise.id,
      nombre_canonico: exercise.nombre_canonico,
      series_obj: parseInt(seriesRaw, 10),
      reps_min: isAmrap ? 1 : parseInt(repsRaw, 10),
      reps_max: isAmrap ? null : parseInt(repsRaw, 10),
    },
  };
}

export async function createRoutine(
  supabase: SupabaseClient,
  athleteId: string,
  nombre: string,
  items: RoutineLineItem[],
): Promise<string> {
  const { data: routine, error: routineError } = await supabase
    .from('routines')
    .insert({ athlete_id: athleteId, nombre })
    .select('id')
    .single();
  if (routineError) throw routineError;

  const rows = items.map((it, i) => ({
    routine_id: routine.id,
    exercise_id: it.exercise_id,
    orden: i + 1,
    series_obj: it.series_obj,
    reps_min: it.reps_min,
    reps_max: it.reps_max,
  }));
  const { error: exercisesError } = await supabase.from('routine_exercises').insert(rows);
  if (exercisesError) throw exercisesError;

  return routine.id as string;
}

export async function saveDraft(
  supabase: SupabaseClient,
  athleteId: string,
  nombre: string,
  items: RoutineLineItem[],
): Promise<void> {
  const { error } = await supabase
    .from('routine_drafts')
    .upsert({ athlete_id: athleteId, nombre, ejercicios: items });
  if (error) throw error;
}

export async function getDraft(
  supabase: SupabaseClient,
  athleteId: string,
): Promise<{ nombre: string; ejercicios: RoutineLineItem[] } | null> {
  const { data, error } = await supabase
    .from('routine_drafts')
    .select('nombre, ejercicios')
    .eq('athlete_id', athleteId)
    .maybeSingle();
  if (error) throw error;
  return data as { nombre: string; ejercicios: RoutineLineItem[] } | null;
}

export async function deleteDraft(supabase: SupabaseClient, athleteId: string): Promise<void> {
  const { error } = await supabase.from('routine_drafts').delete().eq('athlete_id', athleteId);
  if (error) throw error;
}

export interface TemplateExercise {
  nombre_canonico: string;
  series_obj: number;
  reps_min: number;
  reps_max: number | null;
}
export interface TemplateRoutine {
  nombre: string;
  ejercicios: TemplateExercise[];
}
export interface Template {
  id: string;
  titulo: string;
  rutinas: TemplateRoutine[];
}

// Los nombre_canonico de acá deben calzar EXACTO con la seed global de
// `exercises` (se resuelven por nombre canónico, no por alias, para no
// depender del matcher difuso en algo que controlamos nosotros).
export const TEMPLATES: Template[] = [
  {
    id: 'fullbody',
    titulo: 'Full Body (principiante, 3 días/semana)',
    rutinas: [
      {
        nombre: 'Full Body A',
        ejercicios: [
          { nombre_canonico: 'Sentadilla', series_obj: 3, reps_min: 8, reps_max: 10 },
          { nombre_canonico: 'Press banca', series_obj: 3, reps_min: 8, reps_max: 10 },
          { nombre_canonico: 'Remo con barra', series_obj: 3, reps_min: 8, reps_max: 10 },
          { nombre_canonico: 'Curl con mancuernas', series_obj: 2, reps_min: 10, reps_max: 12 },
          { nombre_canonico: 'Plancha', series_obj: 3, reps_min: 30, reps_max: 45 },
        ],
      },
      {
        nombre: 'Full Body B',
        ejercicios: [
          { nombre_canonico: 'Peso muerto', series_obj: 3, reps_min: 6, reps_max: 8 },
          { nombre_canonico: 'Press militar', series_obj: 3, reps_min: 8, reps_max: 10 },
          { nombre_canonico: 'Jalón al pecho', series_obj: 3, reps_min: 8, reps_max: 10 },
          { nombre_canonico: 'Elevaciones laterales', series_obj: 2, reps_min: 12, reps_max: 15 },
          { nombre_canonico: 'Extensión de tríceps en polea', series_obj: 2, reps_min: 10, reps_max: 12 },
        ],
      },
      {
        nombre: 'Full Body C',
        ejercicios: [
          { nombre_canonico: 'Prensa de pierna', series_obj: 3, reps_min: 10, reps_max: 12 },
          { nombre_canonico: 'Press inclinado con mancuernas', series_obj: 3, reps_min: 8, reps_max: 10 },
          { nombre_canonico: 'Remo sentado en polea', series_obj: 3, reps_min: 8, reps_max: 10 },
          { nombre_canonico: 'Curl femoral', series_obj: 2, reps_min: 10, reps_max: 12 },
          { nombre_canonico: 'Abdominales', series_obj: 3, reps_min: 15, reps_max: 15 },
        ],
      },
    ],
  },
  {
    id: 'ppl',
    titulo: 'Push / Pull / Legs (intermedio, 3 días/semana)',
    rutinas: [
      {
        nombre: 'Push A',
        ejercicios: [
          { nombre_canonico: 'Press banca', series_obj: 4, reps_min: 8, reps_max: 8 },
          { nombre_canonico: 'Press inclinado con mancuernas', series_obj: 3, reps_min: 10, reps_max: 10 },
          { nombre_canonico: 'Aperturas con mancuernas', series_obj: 3, reps_min: 12, reps_max: 12 },
          { nombre_canonico: 'Fondos en paralelas', series_obj: 3, reps_min: 1, reps_max: null },
          { nombre_canonico: 'Extensión de tríceps en polea', series_obj: 4, reps_min: 12, reps_max: 12 },
        ],
      },
      {
        nombre: 'Pull A',
        ejercicios: [
          { nombre_canonico: 'Dominadas', series_obj: 4, reps_min: 1, reps_max: null },
          { nombre_canonico: 'Remo con barra', series_obj: 4, reps_min: 8, reps_max: 8 },
          { nombre_canonico: 'Jalón al pecho', series_obj: 3, reps_min: 10, reps_max: 10 },
          { nombre_canonico: 'Curl con barra', series_obj: 3, reps_min: 10, reps_max: 10 },
          { nombre_canonico: 'Curl martillo', series_obj: 2, reps_min: 12, reps_max: 12 },
        ],
      },
      {
        nombre: 'Legs A',
        ejercicios: [
          { nombre_canonico: 'Sentadilla', series_obj: 4, reps_min: 8, reps_max: 8 },
          { nombre_canonico: 'Peso muerto rumano', series_obj: 3, reps_min: 10, reps_max: 10 },
          { nombre_canonico: 'Prensa de pierna', series_obj: 3, reps_min: 12, reps_max: 12 },
          { nombre_canonico: 'Curl femoral', series_obj: 3, reps_min: 12, reps_max: 12 },
          { nombre_canonico: 'Elevación de talones', series_obj: 4, reps_min: 15, reps_max: 15 },
        ],
      },
    ],
  },
  {
    id: 'upperlower',
    titulo: 'Upper / Lower (intermedio, 4 días/semana)',
    rutinas: [
      {
        nombre: 'Upper A',
        ejercicios: [
          { nombre_canonico: 'Press banca', series_obj: 4, reps_min: 8, reps_max: 8 },
          { nombre_canonico: 'Remo con barra', series_obj: 4, reps_min: 8, reps_max: 8 },
          { nombre_canonico: 'Press militar', series_obj: 3, reps_min: 10, reps_max: 10 },
          { nombre_canonico: 'Jalón al pecho', series_obj: 3, reps_min: 10, reps_max: 10 },
          { nombre_canonico: 'Curl con mancuernas', series_obj: 2, reps_min: 12, reps_max: 12 },
          { nombre_canonico: 'Extensión de tríceps en polea', series_obj: 2, reps_min: 12, reps_max: 12 },
        ],
      },
      {
        nombre: 'Lower A',
        ejercicios: [
          { nombre_canonico: 'Sentadilla', series_obj: 4, reps_min: 8, reps_max: 8 },
          { nombre_canonico: 'Peso muerto rumano', series_obj: 3, reps_min: 10, reps_max: 10 },
          { nombre_canonico: 'Prensa de pierna', series_obj: 3, reps_min: 12, reps_max: 12 },
          { nombre_canonico: 'Curl femoral', series_obj: 3, reps_min: 12, reps_max: 12 },
          { nombre_canonico: 'Elevación de talones', series_obj: 4, reps_min: 15, reps_max: 15 },
        ],
      },
      {
        nombre: 'Upper B',
        ejercicios: [
          { nombre_canonico: 'Press inclinado con mancuernas', series_obj: 4, reps_min: 10, reps_max: 10 },
          { nombre_canonico: 'Remo con mancuerna', series_obj: 4, reps_min: 10, reps_max: 10 },
          { nombre_canonico: 'Elevaciones laterales', series_obj: 3, reps_min: 12, reps_max: 12 },
          { nombre_canonico: 'Curl martillo', series_obj: 2, reps_min: 12, reps_max: 12 },
          { nombre_canonico: 'Fondos en banco', series_obj: 2, reps_min: 12, reps_max: 12 },
        ],
      },
      {
        nombre: 'Lower B',
        ejercicios: [
          { nombre_canonico: 'Zancadas', series_obj: 3, reps_min: 10, reps_max: 10 },
          { nombre_canonico: 'Peso muerto', series_obj: 3, reps_min: 6, reps_max: 6 },
          { nombre_canonico: 'Extensión de cuádriceps', series_obj: 3, reps_min: 12, reps_max: 12 },
          { nombre_canonico: 'Puente de glúteo', series_obj: 3, reps_min: 12, reps_max: 12 },
          { nombre_canonico: 'Elevación de talones', series_obj: 4, reps_min: 15, reps_max: 15 },
        ],
      },
    ],
  },
  {
    id: 'brosplit',
    titulo: 'Split muscular (5 días, un grupo por día)',
    rutinas: [
      {
        nombre: 'Día Pecho',
        ejercicios: [
          { nombre_canonico: 'Press banca', series_obj: 4, reps_min: 8, reps_max: 8 },
          { nombre_canonico: 'Press inclinado con mancuernas', series_obj: 3, reps_min: 10, reps_max: 10 },
          { nombre_canonico: 'Aperturas con mancuernas', series_obj: 3, reps_min: 12, reps_max: 12 },
          { nombre_canonico: 'Fondos en paralelas', series_obj: 3, reps_min: 1, reps_max: null },
          { nombre_canonico: 'Press de pecho en máquina', series_obj: 3, reps_min: 12, reps_max: 12 },
        ],
      },
      {
        nombre: 'Día Espalda',
        ejercicios: [
          { nombre_canonico: 'Dominadas', series_obj: 4, reps_min: 1, reps_max: null },
          { nombre_canonico: 'Remo con barra', series_obj: 4, reps_min: 8, reps_max: 8 },
          { nombre_canonico: 'Jalón al pecho', series_obj: 3, reps_min: 10, reps_max: 10 },
          { nombre_canonico: 'Remo sentado en polea', series_obj: 3, reps_min: 10, reps_max: 10 },
          { nombre_canonico: 'Peso muerto', series_obj: 3, reps_min: 6, reps_max: 6 },
        ],
      },
      {
        nombre: 'Día Hombro',
        ejercicios: [
          { nombre_canonico: 'Press militar', series_obj: 4, reps_min: 8, reps_max: 8 },
          { nombre_canonico: 'Elevaciones laterales', series_obj: 3, reps_min: 12, reps_max: 12 },
          { nombre_canonico: 'Elevaciones frontales', series_obj: 3, reps_min: 12, reps_max: 12 },
          { nombre_canonico: 'Pájaros', series_obj: 3, reps_min: 12, reps_max: 12 },
          { nombre_canonico: 'Press Arnold', series_obj: 3, reps_min: 10, reps_max: 10 },
        ],
      },
      {
        nombre: 'Día Pierna',
        ejercicios: [
          { nombre_canonico: 'Sentadilla', series_obj: 4, reps_min: 8, reps_max: 8 },
          { nombre_canonico: 'Peso muerto rumano', series_obj: 3, reps_min: 10, reps_max: 10 },
          { nombre_canonico: 'Prensa de pierna', series_obj: 3, reps_min: 12, reps_max: 12 },
          { nombre_canonico: 'Extensión de cuádriceps', series_obj: 3, reps_min: 12, reps_max: 12 },
          { nombre_canonico: 'Curl femoral', series_obj: 3, reps_min: 12, reps_max: 12 },
          { nombre_canonico: 'Elevación de talones', series_obj: 4, reps_min: 15, reps_max: 15 },
        ],
      },
      {
        nombre: 'Día Brazo',
        ejercicios: [
          { nombre_canonico: 'Curl con barra', series_obj: 3, reps_min: 10, reps_max: 10 },
          { nombre_canonico: 'Curl martillo', series_obj: 3, reps_min: 12, reps_max: 12 },
          { nombre_canonico: 'Curl predicador', series_obj: 3, reps_min: 10, reps_max: 10 },
          { nombre_canonico: 'Press francés', series_obj: 3, reps_min: 10, reps_max: 10 },
          { nombre_canonico: 'Extensión de tríceps en polea', series_obj: 3, reps_min: 12, reps_max: 12 },
          { nombre_canonico: 'Patada de tríceps', series_obj: 2, reps_min: 12, reps_max: 12 },
        ],
      },
    ],
  },
];

export function templatesMenuText(): string {
  return (
    '¿Qué rutina armamos? Elige una plantilla:\n\n' +
    'O si ya tienes la tuya, mándala así:\n' +
    '"/nuevarutina Push A" y una línea por ejercicio, ej: "Press banca 4x8"'
  );
}

export async function createRoutinesFromTemplate(
  supabase: SupabaseClient,
  athleteId: string,
  template: Template,
): Promise<string[]> {
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, nombre_canonico')
    .eq('es_global', true);
  if (error) throw error;
  const byName = new Map((exercises ?? []).map((e) => [e.nombre_canonico, e.id as string]));

  const nombresCreados: string[] = [];
  for (const rutina of template.rutinas) {
    const items: RoutineLineItem[] = rutina.ejercicios.map((ex) => {
      const exercise_id = byName.get(ex.nombre_canonico);
      if (!exercise_id) throw new Error(`Template exercise not found in DB: ${ex.nombre_canonico}`);
      return { exercise_id, ...ex };
    });
    await createRoutine(supabase, athleteId, rutina.nombre, items);
    nombresCreados.push(rutina.nombre);
  }
  return nombresCreados;
}
