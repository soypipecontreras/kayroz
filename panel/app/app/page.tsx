import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signMediaPaths } from "@/lib/media";

interface ExerciseRef {
  nombre_canonico: string;
  instrucciones: string | null;
  imagen_url: string | null;
  preparacion: string | null;
  ejecucion: string | null;
  errores: string[] | null;
}

interface RoutineExerciseRow {
  routine_id: string;
  exercise_id: string;
  orden: number;
  series_obj: number;
  reps_min: number;
  reps_max: number | null;
  rpe_obj: number | null;
  descanso_seg: number | null;
  notas: string | null;
  imagen_path: string | null;
  video_path: string | null;
  exercises: ExerciseRef | ExerciseRef[] | null;
}

function exerciseOf(row: RoutineExerciseRow): ExerciseRef | null {
  return Array.isArray(row.exercises) ? (row.exercises[0] ?? null) : row.exercises;
}

function formatReps(row: RoutineExerciseRow): string {
  if (row.reps_max === null) return "AMRAP";
  if (row.reps_min === row.reps_max) return String(row.reps_min);
  return `${row.reps_min}-${row.reps_max}`;
}

function formatDescanso(segundos: number): string {
  if (segundos < 60) return `${segundos}s`;
  const min = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return resto === 0 ? `${min} min` : `${min}:${String(resto).padStart(2, "0")} min`;
}

export default async function AthleteHomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id, nombre, org_id")
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
        .select(
          "routine_id, exercise_id, orden, series_obj, reps_min, reps_max, rpe_obj, descanso_seg, notas, imagen_path, video_path, exercises(nombre_canonico, instrucciones, imagen_url, preparacion, ejecucion, errores)",
        )
        .in("routine_id", routineIds)
        .order("orden", { ascending: true })
    : { data: [] as RoutineExerciseRow[] };

  const rows = (routineExercises ?? []) as unknown as RoutineExerciseRow[];

  // Media que el gimnasio subió para estos ejercicios. Vive aparte porque los
  // del catálogo son filas compartidas entre todas las organizaciones.
  const exerciseIds = [...new Set(rows.map((re) => re.exercise_id).filter(Boolean))];
  const { data: orgMedia } = exerciseIds.length
    ? await supabase
        .from("org_exercise_media")
        .select("exercise_id, imagen_path, video_path")
        .eq("org_id", athlete.org_id)
        .in("exercise_id", exerciseIds)
    : { data: [] as { exercise_id: string; imagen_path: string | null; video_path: string | null }[] };

  const mediaPorEjercicio = new Map(
    (orgMedia ?? []).map((m) => [m.exercise_id, m]),
  );

  // La media del bucket del coach es privada, así que hay que firmarla. Se
  // firma todo de una sola vez en vez de una llamada por ejercicio.
  const signed = await signMediaPaths(
    supabase,
    rows.flatMap((re) => {
      const propia = mediaPorEjercicio.get(re.exercise_id);
      return [re.imagen_path, re.video_path, propia?.imagen_path, propia?.video_path];
    }),
  );

  // El override de la rutina gana sobre lo que traiga el ejercicio del
  // catálogo; la imagen pública del catálogo global es el último recurso.
  // Prioridad: lo puesto para ESTA rutina gana sobre lo del ejercicio en
  // general, y la imagen del catálogo global es el último recurso.
  function mediaFor(re: RoutineExerciseRow): { imagen: string | null; video: string | null } {
    const ex = exerciseOf(re);
    const propia = mediaPorEjercicio.get(re.exercise_id);
    const imagen =
      (re.imagen_path && signed.get(re.imagen_path)) ||
      (propia?.imagen_path && signed.get(propia.imagen_path)) ||
      ex?.imagen_url ||
      null;
    const video =
      (re.video_path && signed.get(re.video_path)) ||
      (propia?.video_path && signed.get(propia.video_path)) ||
      null;
    return { imagen, video };
  }

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
            <ul className="flex flex-col gap-3">
              {rows
                .filter((re) => re.routine_id === r.id)
                .map((re) => {
                  const ex = exerciseOf(re);
                  const { imagen, video } = mediaFor(re);
                  return (
                    <li key={`${re.routine_id}-${re.orden}`} className="glass-input rounded-2xl p-4">
                      <div className="flex gap-4">
                        {imagen && (
                          // URL firmada que rota en cada render; next/image no
                          // aporta acá y cachearía una URL que expira.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imagen}
                            alt=""
                            className="h-16 w-16 shrink-0 rounded-xl border border-divider object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-medium">
                            {re.orden}. {ex?.nombre_canonico ?? "—"}
                          </p>
                          <p className="mt-0.5 text-sm text-muted">
                            {re.series_obj} series × {formatReps(re)}
                            {re.descanso_seg !== null && ` · descanso ${formatDescanso(re.descanso_seg)}`}
                            {re.rpe_obj !== null && ` · RPE ${re.rpe_obj}`}
                          </p>
                          {re.notas && <p className="mt-1.5 text-sm italic text-foreground/80">{re.notas}</p>}
                          {!re.notas && ex?.instrucciones && (
                            <p className="mt-1.5 text-sm text-muted">{ex.instrucciones}</p>
                          )}
                        </div>
                      </div>

                      {(ex?.preparacion || ex?.ejecucion || ex?.errores?.length) && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm text-muted transition-colors hover:text-foreground">
                            Cómo se hace
                          </summary>
                          <div className="mt-2 flex flex-col gap-3 text-sm leading-relaxed">
                            {ex?.preparacion && (
                              <p>
                                <span className="text-muted">Preparación. </span>
                                {ex.preparacion}
                              </p>
                            )}
                            {ex?.ejecucion && (
                              <p>
                                <span className="text-muted">Ejecución. </span>
                                {ex.ejecucion}
                              </p>
                            )}
                            {ex?.errores && ex.errores.length > 0 && (
                              <div>
                                <p className="mb-1 text-muted">Errores comunes</p>
                                <ul className="flex flex-col gap-1.5">
                                  {ex.errores.map((err, i) => (
                                    <li key={i} className="flex gap-2">
                                      <span aria-hidden="true" className="shrink-0 text-muted">
                                        —
                                      </span>
                                      <span>{err}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </details>
                      )}

                      {video && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm text-muted transition-colors hover:text-foreground">
                            Ver video de técnica
                          </summary>
                          {/* preload=none: si no, el navegador se baja todos los
                              videos de la rutina apenas abre la página. */}
                          <video
                            src={video}
                            controls
                            playsInline
                            preload="none"
                            className="mt-2 w-full rounded-xl border border-divider"
                          />
                        </details>
                      )}
                    </li>
                  );
                })}
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
