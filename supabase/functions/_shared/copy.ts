import type { ParsedSet } from './parser.ts';

function pick<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

const UNKNOWN_COMMAND_TEMPLATES = [
  'Ese comando todavía no está listo. Por ahora mándame tus series directo, ej: "sentadilla 100x5x3".',
  'Todavía no tengo eso armado. Mientras tanto, mándame las series como texto, ej: "curl 20x12".',
];

const NO_ENTENDI_TEMPLATES = [
  'No te entendí 🤔. Prueba así: "ejercicio peso x reps", ej: "press banca 80x8".',
  'Esa no la agarré. Escríbeme algo como "sentadilla 100x5".',
];

const UNRECOGNIZED_SHAPE_TEMPLATES = [
  'No entendí las series 🤔. Prueba algo como "80x8, 80x7" o "100x5x3".',
  'Las series no me cuadraron. Ej: "80x8, 80x7, 75x8" o "100x5x3".',
];

export const GENERIC_ERROR_TEXT = 'Uy, algo falló de mi lado 😅. Prueba de nuevo en un toque.';

const CONFIRMATION_TEMPLATES: Array<(ejercicio: string, series: string) => string> = [
  (ejercicio, series) => `✅ ${ejercicio}: ${series} registrado`,
  (ejercicio, series) => `Anotado 💪 ${ejercicio}: ${series}`,
  (ejercicio, series) => `Va quedando — ${ejercicio}: ${series} ✅`,
  (ejercicio, series) => `${ejercicio}: ${series}. Directo a la base 📝`,
  (ejercicio, series) => `Listo, ${ejercicio}: ${series} guardado 👍`,
];

const PR_TEMPLATES: Array<(ejercicio: string, peso: number, reps: number, oneRm: number) => string> = [
  (ejercicio, peso, reps, oneRm) =>
    `🔥 ¡NUEVO PR en ${ejercicio}! ${peso}x${reps} — tu mejor marca hasta ahora. 1RM estimado: ${oneRm}kg`,
  (ejercicio, peso, reps, oneRm) =>
    `🏆 ¡Rompiste tu récord en ${ejercicio}! ${peso}x${reps}. 1RM estimado: ${oneRm}kg. ¡Así se hace!`,
  (ejercicio, peso, reps) => `💥 PR en ${ejercicio}: ${peso}x${reps}. Vas para arriba, sigue así.`,
];

export function unknownCommandText(): string {
  return pick(UNKNOWN_COMMAND_TEMPLATES);
}

export function noEntendiText(): string {
  return pick(NO_ENTENDI_TEMPLATES);
}

export function unrecognizedShapeText(): string {
  return pick(UNRECOGNIZED_SHAPE_TEMPLATES);
}

export function exerciseNotFoundText(exerciseText: string): string {
  return `No reconozco "${exerciseText}". Revisa el nombre o prueba con otra forma de escribirlo.`;
}

export function confirmationText(nombreCanonico: string, sets: ParsedSet[], rpe: number | null): string {
  const parts = sets.map((s) => (s.peso !== null ? `${s.peso}x${s.reps}` : `${s.reps} reps`));
  const rpeSuffix = rpe !== null ? ` @${rpe}` : '';
  const series = `${parts.join(', ')}${rpeSuffix}`;
  return pick(CONFIRMATION_TEMPLATES)(nombreCanonico, series);
}

export function prCelebrationText(nombreCanonico: string, peso: number, reps: number, oneRm: number): string {
  return pick(PR_TEMPLATES)(nombreCanonico, peso, reps, oneRm);
}

export function routineSummaryText(
  nombre: string,
  items: Array<{ nombre_canonico: string; series_obj: number; reps_min: number; reps_max: number | null }>,
): string {
  const lines = items.map((it, i) => {
    const reps =
      it.reps_max === null
        ? 'AMRAP'
        : it.reps_min === it.reps_max
          ? `${it.reps_min}`
          : `${it.reps_min}-${it.reps_max}`;
    return `${i + 1}. ${it.nombre_canonico} — ${it.series_obj}x${reps}`;
  });
  return `📋 ${nombre}\n${lines.join('\n')}\n\n¿Guardo esta rutina?`;
}

export function routineInvalidLinesText(
  failed: Array<{ raw: string; reason: 'formato' | 'ejercicio_no_encontrado' }>,
): string {
  const detail = failed
    .map(
      (f) =>
        `• "${f.raw}" (${f.reason === 'formato' ? 'formato no reconocido, ej: "Press banca 4x8"' : 'no reconozco ese ejercicio'})`,
    )
    .join('\n');
  return `No pude leer estas líneas:\n${detail}\n\nRevísalas y manda /nuevarutina de nuevo.`;
}

export const ROUTINE_MISSING_EXERCISES_TEXT =
  'Te faltaron los ejercicios. Manda el nombre de la rutina y una línea por ejercicio, ej:\n"Push A"\n"Press banca 4x8"';

export function routineSavedText(nombre: string): string {
  return `✅ "${nombre}" guardada. Ya la vas a poder usar.`;
}

export function templateSavedText(nombres: string[]): string {
  return `✅ Listo, quedaron guardadas: ${nombres.join(', ')}.`;
}

export const ROUTINE_CANCELLED_TEXT = 'Cancelado, no se guardó nada.';

export const ROUTINE_DRAFT_EXPIRED_TEXT = 'Esa rutina ya no está pendiente. Mándala de nuevo con /nuevarutina.';

export const NO_ROUTINES_TEXT = 'Todavía no tienes ninguna rutina guardada. Usa /nuevarutina para crear una.';

export const PICK_ROUTINE_TEXT = '¿Cuál rutina quieres ver hoy?';

export const ROUTINE_NOT_FOUND_TEXT = 'No encontré esa rutina.';

const GREETING_TEMPLATES = [
  '¡Hola! 💪 Mándame tus series cuando quieras, o pregúntame por tu rutina (ej: "dame mi rutina de pecho").',
  '¡Qué más! 💪 Cuando quieras registrar algo, mándamelo directo. También puedes pedirme tu rutina de hoy.',
];

export function greetingText(): string {
  return pick(GREETING_TEMPLATES);
}

export function noRoutineForMuscleGroupText(grupoMuscular: string): string {
  return `No tienes ninguna rutina activa con ejercicios de ${grupoMuscular}.`;
}

export function hoyHeaderText(nombre: string): string {
  return `🏋️ Hoy toca: ${nombre}`;
}

export function coachWelcomeText(codigo: string): string {
  return (
    `💼 ¡Listo! Ya tenés tu cuenta de coach (14 días de prueba).\n\n` +
    `Este es tu primer código de invitación para que un atleta se sume:\n\n` +
    `*${codigo}*\n\n` +
    `Compartíselo — con mandarlo tal cual queda vinculado. Más adelante vas a poder ` +
    `poner tu nombre y el de tu marca con /config.`
  );
}

export function newInviteCodeText(codigo: string): string {
  return `Nuevo código: *${codigo}*\nCompartíselo a tu próximo atleta.`;
}

export function athleteWelcomeText(): string {
  return (
    `💪 ¡Quedaste vinculado con tu coach! Ya podés mandarme tus series, ej: ` +
    `"press banca 80x8, 80x7".\nCuando quieras, contame tu nombre con /nombre.`
  );
}

export function inviteCodeInvalidText(reason: 'no_encontrado' | 'agotado' | 'vencido' | 'inactivo'): string {
  const detail = {
    no_encontrado: 'No reconozco ese código. Revisalo con tu coach.',
    agotado: 'Ese código ya se usó el máximo de veces permitido.',
    vencido: 'Ese código venció. Pedile uno nuevo a tu coach.',
    inactivo: 'Ese código ya no está activo.',
  }[reason];
  return `${detail} Si es un error, avisale a tu coach para que te pase uno nuevo.`;
}

export const ASK_FOR_START_OR_CODE_TEXT =
  '¡Hola! Si sos entrenador y querés armar tu cuenta, mandá /start.\n' +
  'Si un coach ya te invitó, mandame el código que te compartió.';

// ============================================================
// /prs, /historial, /progreso, /deshacer
// ============================================================

export const NO_PRS_TEXT = 'Todavía no tenés ningún récord registrado. Mandame una serie con peso y arrancamos.';

export function prsHeaderText(): string {
  return '🏆 Tus récords:';
}

export function prEntryLine(exerciseName: string, peso: number, reps: number): string {
  return `• ${exerciseName}: ${peso}x${reps}`;
}

export const NO_HISTORIAL_TEXT = 'Todavía no tenés sesiones registradas.';

export function historialHeaderText(): string {
  return '📅 Tus últimas sesiones:';
}

export function workoutSummaryBlock(
  fecha: string,
  sets: Array<{ exerciseName: string; peso: number | null; reps: number; esPr: boolean }>,
): string {
  const fechaFmt = new Date(fecha).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const lines = sets.map(
    (s) => `  ${s.exerciseName}: ${s.peso !== null ? `${s.peso}x${s.reps}` : `${s.reps} reps`}${s.esPr ? ' 🔥' : ''}`,
  );
  return `${fechaFmt}\n${lines.join('\n')}`;
}

export const PROGRESO_MISSING_EXERCISE_TEXT =
  'Decime qué ejercicio querés ver, ej: "/progreso press banca".';

export function progresoHeaderText(exerciseName: string): string {
  return `📈 Evolución de ${exerciseName}:`;
}

export function progresoEmptyText(exerciseName: string): string {
  return `Todavía no registraste ninguna serie de ${exerciseName}.`;
}

export function progressEntryLine(fecha: string, peso: number | null, reps: number, e1rm: number | null): string {
  const fechaFmt = new Date(fecha).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
  const serie = peso !== null ? `${peso}x${reps}` : `${reps} reps`;
  const e1rmSuffix = e1rm !== null ? ` (1RM est. ${e1rm}kg)` : '';
  return `${fechaFmt} — ${serie}${e1rmSuffix}`;
}

export const UNDO_NOTHING_TO_UNDO_TEXT = 'No tenés nada reciente para deshacer.';

export function undoSuccessText(exerciseName: string, count: number): string {
  return `✅ Borrado: ${exerciseName} (${count} serie${count === 1 ? '' : 's'}).`;
}

export function ayudaAthleteText(): string {
  return (
    '💪 Comandos disponibles:\n\n' +
    'Mandá una serie directo, ej: "press banca 80x8, 80x7"\n\n' +
    '/hoy — qué toca hoy según tu rutina\n' +
    '/prs — tus récords\n' +
    '/historial — tus últimas sesiones\n' +
    '/progreso [ejercicio] — evolución de un ejercicio\n' +
    '/deshacer — borra el último registro\n' +
    '/nuevarutina — cargar una rutina nueva\n' +
    '/ayuda — este mensaje'
  );
}

export function hoyExerciseLine(
  orden: number,
  nombreCanonico: string,
  series_obj: number,
  reps_min: number,
  reps_max: number | null,
  ultimo: string | null,
): string {
  const objetivo = reps_max === null ? 'AMRAP' : reps_min === reps_max ? `${reps_min}` : `${reps_min}-${reps_max}`;
  const ultimoLine = ultimo ? `   Último: ${ultimo}` : '   Último: todavía no la has hecho';
  return `${orden}. ${nombreCanonico} — ${series_obj}x${objetivo}\n${ultimoLine}`;
}
