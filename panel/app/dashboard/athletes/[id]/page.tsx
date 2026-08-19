import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assignRoutine } from "../actions";

interface RoutineExerciseRow {
  orden: number;
  series_obj: number;
  reps_min: number;
  reps_max: number | null;
  exercises: { nombre_canonico: string } | { nombre_canonico: string }[] | null;
}

function exerciseName(row: RoutineExerciseRow): string {
  const e = Array.isArray(row.exercises) ? row.exercises[0] : row.exercises;
  return e?.nombre_canonico ?? "—";
}

export default async function AthleteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id, nombre, telefono, estado, unidad_peso, ultima_sesion_en")
    .eq("id", id)
    .maybeSingle();
  if (!athlete) notFound();

  const { data: routines } = await supabase
    .from("routines")
    .select("id, nombre, activa, created_at")
    .eq("athlete_id", id)
    .eq("activa", true)
    .order("created_at", { ascending: false });

  const routineIds = (routines ?? []).map((r) => r.id);
  const { data: routineExercises } = routineIds.length
    ? await supabase
        .from("routine_exercises")
        .select("routine_id, orden, series_obj, reps_min, reps_max, exercises(nombre_canonico)")
        .in("routine_id", routineIds)
        .order("orden", { ascending: true })
    : { data: [] as (RoutineExerciseRow & { routine_id: string })[] };

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, fecha, estado, sets(id, peso, reps, es_pr, exercises(nombre_canonico))")
    .eq("athlete_id", id)
    .order("fecha", { ascending: false })
    .limit(10);

  const boundAssignRoutine = assignRoutine.bind(null, id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">{athlete.nombre || "Sin nombre"}</h1>
        <p className="text-sm text-muted">
          {athlete.telefono || "sin teléfono vinculado"} · {athlete.unidad_peso} ·{" "}
          <span className="capitalize">{athlete.estado}</span>
        </p>
      </div>

      <section className="rounded-lg border border-border p-5">
        <h2 className="mb-3 font-medium">Rutinas activas</h2>
        {!routines || routines.length === 0 ? (
          <p className="mb-4 text-sm text-muted">Todavía no tiene ninguna rutina asignada.</p>
        ) : (
          <div className="mb-4 flex flex-col gap-4">
            {routines.map((r) => (
              <div key={r.id}>
                <p className="mb-1 text-sm font-medium">{r.nombre}</p>
                <ul className="text-sm text-muted">
                  {(routineExercises ?? [])
                    .filter((re) => re.routine_id === r.id)
                    .map((re) => (
                      <li key={`${re.routine_id}-${re.orden}`}>
                        {re.orden}. {exerciseName(re)} — {re.series_obj}x
                        {re.reps_max === null ? "AMRAP" : re.reps_min === re.reps_max ? re.reps_min : `${re.reps_min}-${re.reps_max}`}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <details>
          <summary className="cursor-pointer text-sm font-medium">Asignar rutina nueva</summary>
          <form action={boundAssignRoutine} className="mt-3 flex flex-col gap-3">
            <input
              name="nombre"
              required
              placeholder="Nombre de la rutina (ej: Push A)"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-white"
            />
            <textarea
              name="ejercicios"
              required
              rows={5}
              placeholder={"Una línea por ejercicio, ej:\nPress banca 4x8\nRemo con barra 4x8\nDominadas 3xAMRAP"}
              className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-white"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              className="self-start rounded-md bg-white px-3 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              Guardar rutina
            </button>
          </form>
        </details>
      </section>

      <section className="rounded-lg border border-border p-5">
        <h2 className="mb-3 font-medium">Últimos entrenamientos</h2>
        {!workouts || workouts.length === 0 ? (
          <p className="text-sm text-muted">
            Todavía no entrenó. Los registros van a aparecer acá cuando conteste al bot.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {workouts.map((w) => (
              <li key={w.id} className="text-sm">
                <p className="font-medium">
                  {new Date(w.fecha).toLocaleDateString()} <span className="text-muted">({w.estado})</span>
                </p>
                <ul className="ml-3 text-muted">
                  {(w.sets ?? []).map((s) => {
                    const ex = Array.isArray(s.exercises) ? s.exercises[0] : s.exercises;
                    return (
                      <li key={s.id}>
                        {ex?.nombre_canonico ?? "—"}: {s.peso !== null ? `${s.peso}x${s.reps}` : `${s.reps} reps`}
                        {s.es_pr && " 🔥 PR"}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
