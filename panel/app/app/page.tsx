import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signMediaPaths } from "@/lib/media";

interface ExerciseRef {
  nombre_canonico: string;
  instrucciones: string | null;
  imagen_url: string | null;
  imagen_path: string | null;
  video_path: string | null;
}

interface RoutineExerciseRow {
  routine_id: string;
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
        .select(
          "routine_id, orden, series_obj, reps_min, reps_max, rpe_obj, descanso_seg, notas, imagen_path, video_path, exercises(nombre_canonico, instrucciones, imagen_url, imagen_path, video_path)",
        )
        .in("routine_id", routineIds)
        .order("orden", { ascending: true })
    : { data: [] as RoutineExerciseRow[] };

  const rows = (routineExercises ?? []) as unknown as RoutineExerciseRow[];

  // La media del bucket del coach es privada, así que hay que firmarla. Se
  // firma todo de una sola vez en vez de una llamada por ejercicio.
  const signed = await signMediaPaths(
    supabase,
    rows.flatMap((re) => {
      const ex = exerciseOf(re);
      return [re.imagen_path, re.video_path, ex?.imagen_path, ex?.video_path];
    }),
  );

  // El override de la rutina gana sobre lo que traiga el ejercicio del
  // catálogo; la imagen pública del catálogo global es el último recurso.
  function mediaFor(re: RoutineExerciseRow): { imagen: string | null; video: string | null } {
    const ex = exerciseOf(re);
    const imagen =
      (re.imagen_path && signed.get(re.imagen_path)) ||
      (ex?.imagen_path && signed.get(ex.imagen_path)) ||
      ex?.imagen_url ||
      null;
    const video =
      (re.video_path && signed.get(re.video_path)) || (ex?.video_path && signed.get(ex.video_path)) || null;
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
                            className="h-16 w-16 shrink-0 rounded-xl border border-white/10 object-cover"
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
                            className="mt-2 w-full rounded-xl border border-white/10"
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
