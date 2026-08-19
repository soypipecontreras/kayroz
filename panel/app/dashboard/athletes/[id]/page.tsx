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
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">{athlete.nombre || "Sin nombre"}</h1>
        <p className="text-sm text-muted">
          {athlete.telefono || "sin teléfono vinculado"} · {athlete.unidad_peso} ·{" "}
          <span className="capitalize">{athlete.estado}</span>
        </p>
      </div>

      <section className="glass rounded-3xl p-7 sm:p-8">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">Rutinas activas</h2>
        {!routines || routines.length === 0 ? (
          <p className="mb-4 text-sm text-muted">Todavía no tiene ninguna rutina asignada.</p>
        ) : (
          <div className="mb-6 flex flex-col gap-4">
            {routines.map((r) => (
              <div key={r.id} className="glass-input rounded-2xl px-4 py-3.5">
                <p className="mb-1.5 text-[15px] font-medium">{r.nombre}</p>
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
          <summary className="cursor-pointer text-sm font-medium text-muted transition-colors hover:text-foreground">
            Asignar rutina nueva
          </summary>
          <form action={boundAssignRoutine} className="mt-4 flex flex-col gap-4">
            <input
              name="nombre"
              required
              placeholder="Nombre de la rutina (ej: Push A)"
              className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted"
            />
            <textarea
              name="ejercicios"
              required
              rows={5}
              placeholder={"Una línea por ejercicio, ej:\nPress banca 4x8\nRemo con barra 4x8\nDominadas 3xAMRAP"}
              className="glass-input rounded-2xl px-4 py-3 font-mono text-sm text-foreground outline-none placeholder:text-muted"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" className="btn-primary self-start rounded-2xl px-4 py-3 text-[15px] font-semibold">
              Guardar rutina
            </button>
          </form>
        </details>
      </section>

      <section className="glass rounded-3xl p-7 sm:p-8">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">Últimos entrenamientos</h2>
        {!workouts || workouts.length === 0 ? (
          <p className="text-sm text-muted">
            Todavía no entrenó. Los registros van a aparecer acá cuando conteste al bot.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {workouts.map((w) => (
              <li key={w.id} className="glass-input rounded-2xl px-4 py-3.5 text-sm">
                <p className="font-medium">
                  {new Date(w.fecha).toLocaleDateString()} <span className="text-muted">({w.estado})</span>
                </p>
                <ul className="ml-3 mt-1 text-muted">
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
