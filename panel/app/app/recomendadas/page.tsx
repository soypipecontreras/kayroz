import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recomendar, type PerfilAtleta, type TemplateParaRecomendar } from "@/lib/recommend";
import { DISCIPLINA_LABEL, MODALIDAD_LABEL, NIVEL_LABEL, esModalidad, type Disciplina, type Nivel, type Objetivo } from "@/lib/disciplinas";
import { usarPlantilla } from "./actions";

interface ExerciseRef {
  nombre_canonico: string;
  imagen_url: string | null;
}

interface TemplateExerciseRow {
  template_id: string;
  orden: number;
  series_obj: number;
  reps_min: number;
  reps_max: number | null;
  notas: string | null;
  exercises: ExerciseRef | ExerciseRef[] | null;
}

function exerciseOf(row: TemplateExerciseRow): ExerciseRef | null {
  return Array.isArray(row.exercises) ? (row.exercises[0] ?? null) : row.exercises;
}

function formatReps(row: TemplateExerciseRow): string {
  if (row.reps_max === null) return "AMRAP";
  if (row.reps_min === row.reps_max) return String(row.reps_min);
  return `${row.reps_min}-${row.reps_max}`;
}

export default async function RecomendadasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id, objetivo, nivel, disciplinas, dias_semana")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!athlete) redirect("/login");

  const perfil: PerfilAtleta = {
    objetivo: (athlete.objetivo as Objetivo | null) ?? null,
    nivel: (athlete.nivel as Nivel | null) ?? null,
    disciplinas: (athlete.disciplinas ?? []) as Disciplina[],
    dias_semana: athlete.dias_semana ?? null,
  };
  const sinPerfil = !perfil.objetivo && !perfil.nivel && perfil.disciplinas.length === 0;

  const [{ data: templates }, { data: templateExercises }, { data: activas }] = await Promise.all([
    supabase
      .from("routine_templates")
      .select("id, nombre, descripcion, disciplina, nivel, objetivo, modalidad, duracion_min, dias_semana")
      .eq("es_global", true),
    supabase
      .from("routine_template_exercises")
      .select("template_id, orden, series_obj, reps_min, reps_max, notas, exercises(nombre_canonico, imagen_url)")
      .order("orden", { ascending: true }),
    supabase.from("routines").select("nombre").eq("athlete_id", athlete.id).eq("activa", true),
  ]);

  const rows = (templateExercises ?? []) as unknown as TemplateExerciseRow[];
  const nombresActivos = new Set((activas ?? []).map((r) => r.nombre));

  const recomendadas = recomendar(perfil, (templates ?? []) as TemplateParaRecomendar[]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Rutinas recomendadas</h1>
        <p className="text-sm text-muted">
          {sinPerfil ? (
            <>
              La Biblioteca Kayroz completa.{" "}
              <Link href="/app/perfil" className="underline underline-offset-4">
                Completá tu perfil
              </Link>{" "}
              para ordenarlas a tu medida.
            </>
          ) : (
            <>
              Según tu perfil.{" "}
              <Link href="/app/perfil" className="underline underline-offset-4">
                Ajustalo acá
              </Link>
              .
            </>
          )}
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {recomendadas.length === 0 ? (
        <section className="glass rounded-3xl p-7 sm:p-8">
          <p className="text-sm text-muted">No hay rutinas en la biblioteca todavía.</p>
        </section>
      ) : (
        recomendadas.map(({ template: t, razones }) => {
          const ejercicios = rows.filter((re) => re.template_id === t.id);
          const yaActiva = nombresActivos.has(t.nombre);
          return (
            <section key={t.id} className="glass rounded-3xl p-7 sm:p-8">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">{t.nombre}</h2>
              </div>
              <p className="mb-3 flex flex-wrap gap-2 text-xs text-muted">
                <span className="glass-input rounded-full px-3 py-1">{DISCIPLINA_LABEL[t.disciplina]}</span>
                {t.nivel && <span className="glass-input rounded-full px-3 py-1">{NIVEL_LABEL[t.nivel]}</span>}
                {esModalidad(t.modalidad) && t.modalidad !== "series" && (
                  <span className="glass-input rounded-full px-3 py-1">{MODALIDAD_LABEL[t.modalidad]}</span>
                )}
                {t.duracion_min && <span className="glass-input rounded-full px-3 py-1">~{t.duracion_min}′</span>}
              </p>

              {t.descripcion && <p className="mb-4 text-sm text-muted">{t.descripcion}</p>}

              {razones.length > 0 && (
                <ul className="mb-4 flex flex-col gap-1 text-sm">
                  {razones.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden="true" className="shrink-0 text-muted">
                        ✓
                      </span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              )}

              <ul className="mb-5 flex flex-col gap-2">
                {ejercicios.map((re) => {
                  const ex = exerciseOf(re);
                  return (
                    <li key={`${t.id}-${re.orden}`} className="glass-input flex items-center gap-3 rounded-2xl p-3">
                      {ex?.imagen_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ex.imagen_url}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-xl border border-divider object-cover"
                        />
                      )}
                      <div className="min-w-0 text-sm">
                        <p className="font-medium">
                          {re.orden}. {ex?.nombre_canonico ?? "—"}
                        </p>
                        <p className="text-muted">
                          {re.series_obj} × {formatReps(re)}
                          {re.notas && ` · ${re.notas}`}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {yaActiva ? (
                <p className="text-sm text-muted">Ya la tenés activa en tu rutina.</p>
              ) : (
                <form action={usarPlantilla}>
                  <input type="hidden" name="template_id" value={t.id} />
                  <button type="submit" className="btn-primary rounded-2xl px-5 py-3 text-[15px] font-semibold">
                    Usar esta rutina
                  </button>
                </form>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
