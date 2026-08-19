import { assertEquals, assert } from '@std/assert';
import {
  convertWeight,
  normalizeForMatch,
  parseNumericExpression,
  splitExerciseAndNumbers,
} from './parser.ts';

// ============================================================
// splitExerciseAndNumbers
// ============================================================

Deno.test('splitExerciseAndNumbers - separa ejercicio y números básico', () => {
  const r = splitExerciseAndNumbers('press banca 80x8');
  assertEquals(r, { exerciseText: 'press banca', numericText: '80x8' });
});

Deno.test('splitExerciseAndNumbers - quita guion/dos puntos antes del número', () => {
  assertEquals(splitExerciseAndNumbers('press banca: 80x8')?.exerciseText, 'press banca');
  assertEquals(splitExerciseAndNumbers('press banca - 80x8')?.exerciseText, 'press banca');
});

Deno.test('splitExerciseAndNumbers - sin dígitos devuelve null', () => {
  assertEquals(splitExerciseAndNumbers('press banca'), null);
});

Deno.test('splitExerciseAndNumbers - dígito al inicio (sin nombre de ejercicio) devuelve null', () => {
  assertEquals(splitExerciseAndNumbers('80x8'), null);
});

// ============================================================
// normalizeForMatch
// ============================================================

Deno.test('normalizeForMatch - quita tildes y colapsa mayúsculas/espacios', () => {
  assertEquals(normalizeForMatch('Sentadilla   Búlgara'), 'sentadilla bulgara');
  assertEquals(normalizeForMatch('  Peso Muerto  '), 'peso muerto');
});

// ============================================================
// parseNumericExpression — formatos documentados en CLAUDE.md §4
// ============================================================

Deno.test('parseNumericExpression - peso x reps simple', () => {
  const r = parseNumericExpression('80x8', null);
  assert(r.ok);
  assertEquals(r.sets, [{ peso: 80, reps: 8 }]);
  assertEquals(r.rpe, null);
  assertEquals(r.detectedUnit, null);
});

Deno.test('parseNumericExpression - series separadas por coma', () => {
  const r = parseNumericExpression('80x8, 80x7, 75x8', null);
  assert(r.ok);
  assertEquals(r.sets, [
    { peso: 80, reps: 8 },
    { peso: 80, reps: 7 },
    { peso: 75, reps: 8 },
  ]);
});

Deno.test('parseNumericExpression - peso x reps x series', () => {
  const r = parseNumericExpression('100x5x3', null);
  assert(r.ok);
  assertEquals(r.sets, [
    { peso: 100, reps: 5 },
    { peso: 100, reps: 5 },
    { peso: 100, reps: 5 },
  ]);
});

Deno.test('parseNumericExpression - peso corporal con series x reps (sin lastre)', () => {
  const r = parseNumericExpression('3x10', 'peso_corporal');
  assert(r.ok);
  assertEquals(r.sets, [
    { peso: null, reps: 10 },
    { peso: null, reps: 10 },
    { peso: null, reps: 10 },
  ]);
});

Deno.test('parseNumericExpression - peso corporal con lastre', () => {
  const r = parseNumericExpression('3x10 lastre 10', 'peso_corporal');
  assert(r.ok);
  assertEquals(r.sets, [
    { peso: 10, reps: 10 },
    { peso: 10, reps: 10 },
    { peso: 10, reps: 10 },
  ]);
});

Deno.test('parseNumericExpression - lastre con unidad propia', () => {
  const r = parseNumericExpression('3x10 lastre 10kg', 'peso_corporal');
  assert(r.ok);
  assertEquals(r.detectedUnit, 'kg');
});

Deno.test('parseNumericExpression - RPE con @', () => {
  const r = parseNumericExpression('20x12 @8', null);
  assert(r.ok);
  assertEquals(r.sets, [{ peso: 20, reps: 12 }]);
  assertEquals(r.rpe, 8);
});

Deno.test('parseNumericExpression - RPE decimal', () => {
  const r = parseNumericExpression('20x12 @7.5', null);
  assert(r.ok);
  assertEquals(r.rpe, 7.5);
});

Deno.test('parseNumericExpression - RPE fuera de rango 1-10 se ignora', () => {
  const r = parseNumericExpression('20x12 @15', null);
  assert(r.ok);
  assertEquals(r.rpe, null);
});

Deno.test('parseNumericExpression - unidad kg explícita (separada por espacio)', () => {
  const r = parseNumericExpression('80 kg x8', null);
  assert(r.ok);
  assertEquals(r.detectedUnit, 'kg');
  assertEquals(r.sets, [{ peso: 80, reps: 8 }]);
});

Deno.test('parseNumericExpression - unidad lb explícita (separada por espacio)', () => {
  const r = parseNumericExpression('180 lb x8', null);
  assert(r.ok);
  assertEquals(r.detectedUnit, 'lb');
  assertEquals(r.sets, [{ peso: 180, reps: 8 }]);
});

// UNIT_RE usa \b, que no marca límite entre dígito y letra ("80" y "kg" son
// ambos \w) — así que la unidad pegada al número, sin espacio, no se
// detecta y el mensaje completo queda irreconocible. Gap real del parser
// actual, documentado acá para no perderlo de vista (ver CLAUDE.md §4).
Deno.test('parseNumericExpression - unidad pegada al número (sin espacio) NO se detecta hoy', () => {
  const r = parseNumericExpression('80kg x8', null);
  assert(!r.ok);
  assertEquals(r.reason, 'unrecognized_shape');
});

Deno.test('parseNumericExpression - decimal con coma se normaliza a punto', () => {
  const r = parseNumericExpression('82,5x8', null);
  assert(r.ok);
  assertEquals(r.sets, [{ peso: 82.5, reps: 8 }]);
});

Deno.test('parseNumericExpression - decimal con punto', () => {
  const r = parseNumericExpression('82.5x8', null);
  assert(r.ok);
  assertEquals(r.sets, [{ peso: 82.5, reps: 8 }]);
});

Deno.test('parseNumericExpression - sin dígitos falla con no_numbers', () => {
  const r = parseNumericExpression('', null);
  assert(!r.ok);
  assertEquals(r.reason, 'no_numbers');
});

Deno.test('parseNumericExpression - forma irreconocible falla con unrecognized_shape', () => {
  const r = parseNumericExpression('8', null);
  assert(!r.ok);
  assertEquals(r.reason, 'unrecognized_shape');
});

Deno.test('parseNumericExpression - serie con 0 series en peso x reps x series falla', () => {
  const r = parseNumericExpression('100x5x0', null);
  assert(!r.ok);
});

Deno.test('parseNumericExpression - una de las series separadas por coma con forma inválida falla todo el grupo', () => {
  const r = parseNumericExpression('80x8, invalido', null);
  assert(!r.ok);
  assertEquals(r.reason, 'unrecognized_shape');
});

Deno.test('parseNumericExpression - RPE y unidad combinados', () => {
  const r = parseNumericExpression('80 kg x8 @9', null);
  assert(r.ok);
  assertEquals(r.sets, [{ peso: 80, reps: 8 }]);
  assertEquals(r.rpe, 9);
  assertEquals(r.detectedUnit, 'kg');
});

// ============================================================
// convertWeight
// ============================================================

Deno.test('convertWeight - misma unidad no cambia', () => {
  assertEquals(convertWeight(80, 'kg', 'kg'), 80);
});

Deno.test('convertWeight - kg a lb', () => {
  assertEquals(convertWeight(100, 'kg', 'lb'), 220.46);
});

Deno.test('convertWeight - lb a kg', () => {
  assertEquals(convertWeight(220.46, 'lb', 'kg'), 100);
});
