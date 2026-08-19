// Cerebro del bot, sin nada de un canal específico adentro: recibe
// (teléfono, texto) y devuelve una respuesta. El adaptador de cada canal
// (WhatsApp, o el que sea) solo tiene que traducir su payload de entrada a
// esta forma y mandar `BotReply` de vuelta con su propia API de mensajería.
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveIdentity } from './identity.ts';
import { createCoach, createInviteCode, redeemInviteCode, type AppCoach } from './coaches.ts';
import { createAthleteFromInvite, type AppAthlete } from './athletes.ts';
import { resolveExercise } from './exercises.ts';
import { getOrCreateActiveWorkout, insertSets } from './workouts.ts';
import { epley1RM, markPRs } from './pr.ts';
import {
  convertWeight,
  normalizeForMatch,
  parseNumericExpression,
  splitExerciseAndNumbers,
} from './parser.ts';
import { findRoutineByMuscleGroup, getRoutineForToday, listActiveRoutines } from './session.ts';
import { getAthletePRs, getExerciseProgress, getRecentWorkouts, undoLastSet } from './queries.ts';
import {
  createRoutine,
  createRoutinesFromTemplate,
  deleteDraft,
  getDraft,
  parseRoutineLine,
  saveDraft,
  TEMPLATES,
  templatesMenuText,
  type FailedRoutineLine,
  type ParsedRoutineLine,
} from './routines.ts';
import {
  ASK_FOR_START_OR_CODE_TEXT,
  athleteWelcomeText,
  ayudaAthleteText,
  coachWelcomeText,
  confirmationText,
  exerciseNotFoundText,
  GENERIC_ERROR_TEXT,
  greetingText,
  historialHeaderText,
  hoyExerciseLine,
  hoyHeaderText,
  inviteCodeInvalidText,
  newInviteCodeText,
  noEntendiText,
  noRoutineForMuscleGroupText,
  NO_HISTORIAL_TEXT,
  NO_PRS_TEXT,
  NO_ROUTINES_TEXT,
  PICK_ROUTINE_TEXT,
  prCelebrationText,
  prEntryLine,
  progresoEmptyText,
  progresoHeaderText,
  progressEntryLine,
  PROGRESO_MISSING_EXERCISE_TEXT,
  prsHeaderText,
  ROUTINE_CANCELLED_TEXT,
  ROUTINE_DRAFT_EXPIRED_TEXT,
  ROUTINE_MISSING_EXERCISES_TEXT,
  ROUTINE_NOT_FOUND_TEXT,
  routineInvalidLinesText,
  routineSavedText,
  routineSummaryText,
  templateSavedText,
  undoSuccessText,
  UNDO_NOTHING_TO_UNDO_TEXT,
  unknownCommandText,
  unrecognizedShapeText,
  workoutSummaryBlock,
} from './copy.ts';

const GREETINGS = ['hola', 'hey', 'ey', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'que tal', 'que mas', 'holi'];

const HOW_TO_TRIGGERS = [
  'como se hacen',
  'como se hace',
  'como hago',
  'muestrame',
  'imagen de',
  'foto de',
  'fotos de',
  'ejemplo de',
  'explicame',
];

const MUSCLE_GROUP_SYNONYMS: Record<string, string> = {
  pecho: 'pecho',
  espalda: 'espalda',
  hombro: 'hombro',
  hombros: 'hombro',
  biceps: 'biceps',
  bicep: 'biceps',
  triceps: 'triceps',
  tricep: 'triceps',
  brazo: 'biceps',
  brazos: 'biceps',
  pierna: 'pierna',
  piernas: 'pierna',
  gluteo: 'gluteo',
  gluteos: 'gluteo',
  core: 'core',
  abdomen: 'core',
  abs: 'core',
  cardio: 'cardio',
};

// Un código de invitación tiene 8 chars del alfabeto sin 0/O/1/l/I (ver coaches.ts).
const INVITE_CODE_RE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/i;

export interface ReplyOption {
  label: string;
  id: string;
}

export interface BotReply {
  text: string;
  options?: ReplyOption[];
  photoUrl?: string;
}

// ============================================================
// Atleta: registrar series, rutinas, consultas — mismo comportamiento que
// el prototipo single-tenant, ahora resolviendo ejercicios contra el
// catálogo del coach del atleta en vez de un catálogo propio.
// ============================================================

async function handleLogMessage(
  supabase: SupabaseClient,
  athlete: AppAthlete,
  parseInput: string,
  rawFullText: string,
): Promise<string> {
  const split = splitExerciseAndNumbers(parseInput);
  if (!split) return noEntendiText();

  const exercise = await resolveExercise(supabase, athlete.coach_id, split.exerciseText);
  if (!exercise) return exerciseNotFoundText(split.exerciseText);

  const parsed = parseNumericExpression(split.numericText, exercise.tipo);
  if (!parsed.ok) return unrecognizedShapeText();

  const sourceUnit = parsed.detectedUnit ?? athlete.unidad_peso;
  const convertedSets = parsed.sets.map((s) => ({
    ...s,
    peso: s.peso !== null ? convertWeight(s.peso, sourceUnit, athlete.unidad_peso) : null,
  }));

  const prChecked = await markPRs(supabase, athlete.id, exercise.id, convertedSets);

  const workoutId = await getOrCreateActiveWorkout(supabase, athlete.id);
  await insertSets(
    supabase,
    workoutId,
    prChecked.map((s) => ({
      exercise_id: exercise.id,
      peso: s.peso,
      reps: s.reps,
      rpe: parsed.rpe,
      raw_input: rawFullText,
      es_pr: s.esPr,
    })),
  );

  let reply = confirmationText(exercise.nombre_canonico, convertedSets, parsed.rpe);

  const prSets = prChecked.filter((s) => s.esPr && s.peso !== null);
  if (prSets.length > 0) {
    const best = prSets.reduce((a, b) => (b.peso! > a.peso! ? b : a));
    reply += `\n${prCelebrationText(exercise.nombre_canonico, best.peso!, best.reps, epley1RM(best.peso!, best.reps))}`;
  }

  return reply;
}

async function handleNuevaRutina(
  supabase: SupabaseClient,
  athlete: AppAthlete,
  restText: string,
): Promise<BotReply> {
  const lines = restText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { text: templatesMenuText(), options: TEMPLATES.map((t) => ({ label: t.titulo, id: `tpl_${t.id}` })) };
  }

  const [nombre, ...exerciseLines] = lines;
  if (exerciseLines.length === 0) {
    return { text: ROUTINE_MISSING_EXERCISES_TEXT };
  }

  const results = await Promise.all(exerciseLines.map((line) => parseRoutineLine(supabase, athlete.coach_id, line)));
  const failed = results.filter((r): r is FailedRoutineLine => !r.ok);
  if (failed.length > 0) {
    return { text: routineInvalidLinesText(failed) };
  }

  const items = (results as ParsedRoutineLine[]).map((r) => r.item);
  await saveDraft(supabase, athlete.id, nombre, items);

  return {
    text: routineSummaryText(nombre, items),
    options: [
      { label: '✅ Confirmar', id: 'rutina_confirmar' },
      { label: '❌ Cancelar', id: 'rutina_cancelar' },
    ],
  };
}

async function buildHoyReply(
  supabase: SupabaseClient,
  athleteId: string,
  routineId: string,
  nombre: string,
): Promise<BotReply> {
  const items = await getRoutineForToday(supabase, athleteId, routineId);
  const lines = items.map((it) =>
    hoyExerciseLine(it.orden, it.nombre_canonico, it.series_obj, it.reps_min, it.reps_max, it.ultimo),
  );
  return { text: `${hoyHeaderText(nombre)}\n\n${lines.join('\n\n')}` };
}

async function handleHoy(supabase: SupabaseClient, athlete: AppAthlete, routineNameQuery: string): Promise<BotReply> {
  const routines = await listActiveRoutines(supabase, athlete.id);
  if (routines.length === 0) return { text: NO_ROUTINES_TEXT };

  const matched = routineNameQuery
    ? routines.find((r) => normalizeForMatch(r.nombre) === normalizeForMatch(routineNameQuery))
    : undefined;
  if (matched) return buildHoyReply(supabase, athlete.id, matched.id, matched.nombre);

  if (routines.length === 1) {
    return buildHoyReply(supabase, athlete.id, routines[0].id, routines[0].nombre);
  }

  return {
    text: PICK_ROUTINE_TEXT,
    options: routines.map((r) => ({ label: r.nombre, id: `hoy_${r.id}` })),
  };
}

async function handleRoutineIntent(
  supabase: SupabaseClient,
  athlete: AppAthlete,
  normalizedText: string,
): Promise<BotReply> {
  const routines = await listActiveRoutines(supabase, athlete.id);
  if (routines.length === 0) return { text: NO_ROUTINES_TEXT };

  const words = normalizedText.split(/\s+/);
  const grupoMuscular = words.map((w) => MUSCLE_GROUP_SYNONYMS[w]).find((g) => g !== undefined);

  if (grupoMuscular) {
    const best = await findRoutineByMuscleGroup(supabase, routines, grupoMuscular);
    if (!best) return { text: noRoutineForMuscleGroupText(grupoMuscular) };
    return buildHoyReply(supabase, athlete.id, best.id, best.nombre);
  }

  if (routines.length === 1) {
    return buildHoyReply(supabase, athlete.id, routines[0].id, routines[0].nombre);
  }

  return {
    text: PICK_ROUTINE_TEXT,
    options: routines.map((r) => ({ label: r.nombre, id: `hoy_${r.id}` })),
  };
}

async function handleGreeting(supabase: SupabaseClient, athlete: AppAthlete): Promise<BotReply> {
  const routines = await listActiveRoutines(supabase, athlete.id);
  if (routines.length === 1) {
    const hoy = await buildHoyReply(supabase, athlete.id, routines[0].id, routines[0].nombre);
    return { text: `${greetingText()}\n\n${hoy.text}` };
  }
  return { text: greetingText() };
}

function stripLeadingFillers(text: string): string {
  return text.replace(/^(el|la|los|las|de|del|un|una)\s+/, '').trim();
}

async function handleHowTo(supabase: SupabaseClient, athlete: AppAthlete, normalizedText: string): Promise<BotReply> {
  const trigger = HOW_TO_TRIGGERS.find((t) => normalizedText.includes(t));
  if (!trigger) return { text: noEntendiText() };

  let candidate = normalizedText.slice(normalizedText.indexOf(trigger) + trigger.length).trim();
  let prev: string;
  do {
    prev = candidate;
    candidate = stripLeadingFillers(candidate);
  } while (candidate !== prev);

  if (!candidate) return { text: noEntendiText() };

  const exercise = await resolveExercise(supabase, athlete.coach_id, candidate);
  if (!exercise) return { text: exerciseNotFoundText(candidate) };

  const text = exercise.instrucciones
    ? `${exercise.nombre_canonico}: ${exercise.instrucciones}`
    : exercise.nombre_canonico;

  return { text, photoUrl: exercise.imagen_url ?? undefined };
}

function handleFreeText(supabase: SupabaseClient, athlete: AppAthlete, text: string): Promise<BotReply> {
  const normalized = normalizeForMatch(text);

  if (normalized.includes('rutina')) {
    return handleRoutineIntent(supabase, athlete, normalized);
  }

  if (HOW_TO_TRIGGERS.some((t) => normalized.includes(t))) {
    return handleHowTo(supabase, athlete, normalized);
  }

  if (GREETINGS.some((g) => normalized === g || normalized.startsWith(`${g} `))) {
    return handleGreeting(supabase, athlete);
  }

  return Promise.resolve({ text: noEntendiText() });
}

async function handleAthleteOption(supabase: SupabaseClient, athlete: AppAthlete, optionId: string): Promise<string> {
  if (optionId === 'rutina_confirmar') {
    const draft = await getDraft(supabase, athlete.id);
    if (!draft) return ROUTINE_DRAFT_EXPIRED_TEXT;
    await createRoutine(supabase, athlete.id, draft.nombre, draft.ejercicios);
    await deleteDraft(supabase, athlete.id);
    return routineSavedText(draft.nombre);
  }

  if (optionId === 'rutina_cancelar') {
    await deleteDraft(supabase, athlete.id);
    return ROUTINE_CANCELLED_TEXT;
  }

  if (optionId.startsWith('hoy_')) {
    const routineId = optionId.slice('hoy_'.length);
    const { data: routine, error } = await supabase
      .from('routines')
      .select('id, nombre')
      .eq('id', routineId)
      .eq('athlete_id', athlete.id)
      .maybeSingle();
    if (error) throw error;
    if (!routine) return ROUTINE_NOT_FOUND_TEXT;
    const reply = await buildHoyReply(supabase, athlete.id, routine.id, routine.nombre);
    return reply.text;
  }

  const template = TEMPLATES.find((t) => `tpl_${t.id}` === optionId);
  if (template) {
    const nombres = await createRoutinesFromTemplate(supabase, athlete.id, template);
    return templateSavedText(nombres);
  }

  return GENERIC_ERROR_TEXT;
}

async function handlePrs(supabase: SupabaseClient, athlete: AppAthlete): Promise<BotReply> {
  const prs = await getAthletePRs(supabase, athlete.id);
  if (prs.length === 0) return { text: NO_PRS_TEXT };
  const lines = prs.map((p) => prEntryLine(p.exerciseName, p.pesoMax, p.reps));
  return { text: `${prsHeaderText()}\n${lines.join('\n')}` };
}

async function handleHistorial(supabase: SupabaseClient, athlete: AppAthlete): Promise<BotReply> {
  const workouts = await getRecentWorkouts(supabase, athlete.id, 10);
  const withSets = workouts.filter((w) => w.sets.length > 0);
  if (withSets.length === 0) return { text: NO_HISTORIAL_TEXT };
  const blocks = withSets.map((w) => workoutSummaryBlock(w.fecha, w.sets));
  return { text: `${historialHeaderText()}\n\n${blocks.join('\n\n')}` };
}

async function handleProgreso(supabase: SupabaseClient, athlete: AppAthlete, exerciseQuery: string): Promise<BotReply> {
  const query = exerciseQuery.trim();
  if (!query) return { text: PROGRESO_MISSING_EXERCISE_TEXT };

  const exercise = await resolveExercise(supabase, athlete.coach_id, query);
  if (!exercise) return { text: exerciseNotFoundText(query) };

  const entries = await getExerciseProgress(supabase, athlete.id, exercise.id);
  if (entries.length === 0) return { text: progresoEmptyText(exercise.nombre_canonico) };

  const lines = entries.map((e) => progressEntryLine(e.fecha, e.peso, e.reps, e.e1rm));
  return { text: `${progresoHeaderText(exercise.nombre_canonico)}\n${lines.join('\n')}` };
}

async function handleDeshacer(supabase: SupabaseClient, athlete: AppAthlete): Promise<BotReply> {
  const result = await undoLastSet(supabase, athlete.id);
  if (!result.ok || result.deletedCount === 0) return { text: UNDO_NOTHING_TO_UNDO_TEXT };
  return { text: undoSuccessText(result.exerciseName ?? '—', result.deletedCount) };
}

async function handleAthleteMessage(supabase: SupabaseClient, athlete: AppAthlete, texto: string): Promise<BotReply> {
  const text = texto.trim();
  const firstWhitespaceIdx = text.search(/\s/);
  const rawCommand = firstWhitespaceIdx === -1 ? text : text.slice(0, firstWhitespaceIdx);
  const restText = firstWhitespaceIdx === -1 ? '' : text.slice(firstWhitespaceIdx + 1);
  const commandLower = rawCommand.toLowerCase();

  if (commandLower === '/log') {
    const body = restText.trim();
    return { text: body ? await handleLogMessage(supabase, athlete, body, text) : noEntendiText() };
  }
  if (commandLower === '/nuevarutina') {
    return handleNuevaRutina(supabase, athlete, restText);
  }
  if (commandLower === '/hoy') {
    return handleHoy(supabase, athlete, restText.trim());
  }
  if (commandLower === '/prs') {
    return handlePrs(supabase, athlete);
  }
  if (commandLower === '/historial') {
    return handleHistorial(supabase, athlete);
  }
  if (commandLower === '/progreso') {
    return handleProgreso(supabase, athlete, restText);
  }
  if (commandLower === '/deshacer') {
    return handleDeshacer(supabase, athlete);
  }
  if (commandLower === '/ayuda') {
    return { text: ayudaAthleteText() };
  }
  if (text.startsWith('/')) {
    return { text: unknownCommandText() };
  }
  if (/\d/.test(text)) {
    return { text: await handleLogMessage(supabase, athlete, text, text) };
  }
  return handleFreeText(supabase, athlete, text);
}

// ============================================================
// Coach: por ahora solo /invitar. El resto de comandos de coach
// (§6/§9 de CLAUDE.md) todavía no tiene lógica.
// ============================================================

async function handleCoachMessage(supabase: SupabaseClient, coach: AppCoach, texto: string): Promise<BotReply> {
  const commandLower = texto.trim().split(/\s+/)[0]?.toLowerCase() ?? '';

  if (commandLower === '/invitar') {
    const codigo = await createInviteCode(supabase, coach.id);
    return { text: newInviteCodeText(codigo) };
  }

  return { text: unknownCommandText() };
}

// ============================================================
// Alta: quien escribe todavía no es ni coach ni atleta.
// ============================================================

async function handleUnknownSender(supabase: SupabaseClient, telefono: string, texto: string): Promise<BotReply> {
  const trimmed = texto.trim();

  if (INVITE_CODE_RE.test(trimmed)) {
    const result = await redeemInviteCode(supabase, trimmed);
    if (!result.ok) return { text: inviteCodeInvalidText(result.reason) };
    await createAthleteFromInvite(supabase, telefono, undefined, result.coachId);
    return { text: athleteWelcomeText() };
  }

  if (trimmed.toLowerCase() === '/start') {
    const coach = await createCoach(supabase, telefono, undefined);
    const codigo = await createInviteCode(supabase, coach.id);
    return { text: coachWelcomeText(codigo) };
  }

  return { text: ASK_FOR_START_OR_CODE_TEXT };
}

// ============================================================
// Punto de entrada único del canal que sea.
// ============================================================

export async function handleIncomingMessage(
  supabase: SupabaseClient,
  telefono: string,
  texto: string,
): Promise<BotReply> {
  const identity = await resolveIdentity(supabase, telefono);
  if (identity.kind === 'coach') return handleCoachMessage(supabase, identity.coach, texto);
  if (identity.kind === 'athlete') return handleAthleteMessage(supabase, identity.athlete, texto);
  return handleUnknownSender(supabase, telefono, texto);
}

// Para canales con respuestas interactivas (botones, listas): `optionId` es
// el id que ese canal devuelve cuando el usuario elige una de las `options`
// de un BotReply anterior.
export async function handleIncomingOption(
  supabase: SupabaseClient,
  telefono: string,
  optionId: string,
): Promise<BotReply> {
  const identity = await resolveIdentity(supabase, telefono);
  if (identity.kind !== 'athlete') return { text: GENERIC_ERROR_TEXT };
  return { text: await handleAthleteOption(supabase, identity.athlete, optionId) };
}
