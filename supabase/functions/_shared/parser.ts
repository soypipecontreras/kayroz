export type WeightUnit = 'kg' | 'lb';

export interface SplitResult {
  exerciseText: string;
  numericText: string;
}

export function splitExerciseAndNumbers(text: string): SplitResult | null {
  const digitMatch = text.match(/\d/);
  if (!digitMatch || digitMatch.index === undefined || digitMatch.index === 0) {
    return null;
  }
  const idx = digitMatch.index;
  const exerciseText = text.slice(0, idx).replace(/[:\-–,]+\s*$/, '').trim();
  const numericText = text.slice(idx).trim();
  if (!exerciseText || !numericText) return null;
  return { exerciseText, numericText };
}

export function normalizeForMatch(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export interface ParsedSet {
  peso: number | null;
  reps: number;
}

export interface NumericParseSuccess {
  ok: true;
  sets: ParsedSet[];
  rpe: number | null;
  detectedUnit: WeightUnit | null;
}

export interface NumericParseFailure {
  ok: false;
  reason: 'no_numbers' | 'unrecognized_shape';
}

export type NumericParseResult = NumericParseSuccess | NumericParseFailure;

const RPE_RE = /@\s*(\d+(?:\.\d)?)/;
const LASTRE_RE = /\blastre\s+(\d+(?:\.\d+)?)\s*(kgs?|lbs?)?\b/i;
const UNIT_RE = /\b(kgs?|lbs?)\b/i;
const PAIR_RE = /^(\d+(?:\.\d+)?)\s*x\s*(\d+)$/i;
const TRIPLE_RE = /^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+)$/i;

function normalizeUnit(raw: string): WeightUnit {
  return raw.toLowerCase().startsWith('lb') ? 'lb' : 'kg';
}

function cut(text: string, match: RegExpMatchArray): string {
  const start = match.index ?? 0;
  return (text.slice(0, start) + text.slice(start + match[0].length)).trim();
}

export function parseNumericExpression(
  numericText: string,
  tipo: string | null,
): NumericParseResult {
  if (!/\d/.test(numericText)) {
    return { ok: false, reason: 'no_numbers' };
  }

  // Una coma pegada entre dígitos es decimal ("82,5" -> "82.5"); una coma
  // seguida de espacio ("80x8, 80x7") es separador de sets y queda intacta.
  let working = numericText.replace(/(\d),(\d)/g, '$1.$2');

  let rpe: number | null = null;
  const rpeMatch = working.match(RPE_RE);
  if (rpeMatch) {
    const value = parseFloat(rpeMatch[1]);
    if (value >= 1 && value <= 10) rpe = value;
    working = cut(working, rpeMatch);
  }

  let lastreValue: number | null = null;
  let lastreUnit: WeightUnit | null = null;
  const lastreMatch = working.match(LASTRE_RE);
  if (lastreMatch) {
    lastreValue = parseFloat(lastreMatch[1]);
    if (lastreMatch[2]) lastreUnit = normalizeUnit(lastreMatch[2]);
    working = cut(working, lastreMatch);
  }

  let detectedUnit: WeightUnit | null = lastreUnit;
  const unitMatch = working.match(UNIT_RE);
  if (unitMatch) {
    detectedUnit = detectedUnit ?? normalizeUnit(unitMatch[1]);
    working = cut(working, unitMatch);
  }

  const core = working.replace(/\s+/g, ' ').trim();
  if (!core) return { ok: false, reason: 'unrecognized_shape' };

  if (core.includes(',')) {
    const parts = core.split(',').map((p) => p.trim()).filter((p) => p.length > 0);
    const sets: ParsedSet[] = [];
    for (const part of parts) {
      const m = part.match(PAIR_RE);
      if (!m) return { ok: false, reason: 'unrecognized_shape' };
      sets.push({ peso: parseFloat(m[1]), reps: parseInt(m[2], 10) });
    }
    if (sets.length === 0) return { ok: false, reason: 'unrecognized_shape' };
    return { ok: true, sets, rpe, detectedUnit };
  }

  const tripleMatch = core.match(TRIPLE_RE);
  if (tripleMatch) {
    const peso = parseFloat(tripleMatch[1]);
    const reps = parseInt(tripleMatch[2], 10);
    const series = parseInt(tripleMatch[3], 10);
    if (series <= 0) return { ok: false, reason: 'unrecognized_shape' };
    return {
      ok: true,
      sets: Array.from({ length: series }, () => ({ peso, reps })),
      rpe,
      detectedUnit,
    };
  }

  const pairMatch = core.match(PAIR_RE);
  if (pairMatch) {
    const n1 = parseFloat(pairMatch[1]);
    const n2 = parseInt(pairMatch[2], 10);
    if (tipo === 'peso_corporal') {
      const series = Math.round(n1);
      if (series <= 0) return { ok: false, reason: 'unrecognized_shape' };
      return {
        ok: true,
        sets: Array.from({ length: series }, () => ({ peso: lastreValue, reps: n2 })),
        rpe,
        detectedUnit,
      };
    }
    return { ok: true, sets: [{ peso: n1, reps: n2 }], rpe, detectedUnit };
  }

  return { ok: false, reason: 'unrecognized_shape' };
}

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  const kg = from === 'lb' ? value * 0.453592 : value;
  const result = to === 'lb' ? kg / 0.453592 : kg;
  return Math.round(result * 100) / 100;
}
