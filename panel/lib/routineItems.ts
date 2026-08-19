// Validación de los ejercicios que manda RoutineBuilder. Vive acá y no en un
// actions.ts porque un módulo "use server" solo puede exportar funciones async,
// y esto lo usan tanto las plantillas como la asignación directa a un atleta.

export interface ParsedItem {
  exercise_id: string;
  series_obj: number;
  reps_min: number;
  reps_max: number | null;
  rpe_obj: number | null;
  descanso_seg: number | null;
  notas: string | null;
}

function toIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

// El JSON viene del navegador, así que no se confía: se valida forma y rangos
// acá. El aislamiento por coach lo sigue garantizando RLS (el select de
// `exercises` solo devuelve globales + los del propio coach, así que un
// exercise_id ajeno no sobrevive a la verificación del caller).
export function parseItems(raw: string): { items: ParsedItem[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "No pudimos leer los ejercicios. Recargá la página y probá de nuevo." };
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { error: "Agregá al menos un ejercicio." };
  }

  const items: ParsedItem[] = [];
  for (const row of parsed) {
    if (typeof row !== "object" || row === null) return { error: "Ejercicio inválido." };
    const r = row as Record<string, unknown>;

    const exercise_id = typeof r.exercise_id === "string" ? r.exercise_id : null;
    const series_obj = toIntOrNull(r.series_obj);
    const reps_min = toIntOrNull(r.reps_min);
    if (!exercise_id || !series_obj || series_obj < 1 || !reps_min || reps_min < 1) {
      return { error: "Revisá que todos los ejercicios tengan series y reps válidas." };
    }

    // reps_max null = AMRAP, es intencional y hay que preservarlo.
    const repsMaxRaw = r.reps_max;
    const reps_max = repsMaxRaw === null ? null : toIntOrNull(repsMaxRaw);
    if (reps_max !== null && reps_max < reps_min) {
      return { error: "El máximo de reps no puede ser menor que el mínimo." };
    }

    const rpeRaw = r.rpe_obj;
    let rpe_obj: number | null = null;
    if (rpeRaw !== null && rpeRaw !== undefined && rpeRaw !== "") {
      const n = Number(rpeRaw);
      if (!Number.isFinite(n) || n < 1 || n > 10) return { error: "El RPE tiene que estar entre 1 y 10." };
      rpe_obj = n;
    }

    const descanso_seg = toIntOrNull(r.descanso_seg);
    if (descanso_seg !== null && descanso_seg < 0) return { error: "El descanso no puede ser negativo." };

    const notasRaw = typeof r.notas === "string" ? r.notas.trim() : "";

    items.push({
      exercise_id,
      series_obj,
      reps_min,
      reps_max,
      rpe_obj,
      descanso_seg,
      notas: notasRaw || null,
    });
  }
  return { items };
}
