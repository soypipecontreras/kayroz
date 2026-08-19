import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export default async function AthleteHomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id, nombre")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!athlete) redirect("/login");

  const { data: routines } = await supabase
    .from("routines")
    .select("id, nombre, created_at")
    .eq("athlete_id", athlete.id)
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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Hola, {athlete.nombre || "atleta"}</h1>
        <p className="text-sm text-muted">Tu rutina asignada.</p>
      </div>

      {!routines || routines.length === 0 ? (
        <section className="glass rounded-3xl p-7 sm:p-8">
          <p className="text-sm text-muted">Todavía no tenés ninguna rutina asignada. Hablá con tu entrenador.</p>
        </section>
      ) : (
        routines.map((r) => (
          <section key={r.id} className="glass rounded-3xl p-7 sm:p-8">
            <h2 className="mb-5 text-lg font-semibold tracking-tight">{r.nombre}</h2>
            <ul className="flex flex-col gap-2.5 text-sm">
              {(routineExercises ?? [])
                .filter((re) => re.routine_id === r.id)
                .map((re) => (
                  <li key={`${re.routine_id}-${re.orden}`} className="glass-input rounded-2xl px-4 py-3">
                    {re.orden}. {exerciseName(re)} — {re.series_obj}x
                    {re.reps_max === null ? "AMRAP" : re.reps_min === re.reps_max ? re.reps_min : `${re.reps_min}-${re.reps_max}`}
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}

      <Link href="/app/log" className="btn-primary self-start rounded-2xl px-5 py-3 text-[15px] font-semibold">
        Cargar una serie
      </Link>
    </div>
  );
}
