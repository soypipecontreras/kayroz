import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import RoutineBuilder, { type BuilderItem } from "../RoutineBuilder";
import { updateTemplate, deleteTemplate } from "../actions";

interface TemplateExerciseRow {
  exercise_id: string;
  orden: number;
  series_obj: number;
  reps_min: number;
  reps_max: number | null;
  rpe_obj: number | null;
  descanso_seg: number | null;
  notas: string | null;
  exercises: { nombre_canonico: string } | { nombre_canonico: string }[] | null;
}

export default async function EditRoutineTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  await getOrgContext(supabase);

  const { data: template } = await supabase
    .from("routine_templates")
    .select("id, nombre, descripcion")
    .eq("id", id)
    .maybeSingle();
  if (!template) notFound();

  const [{ data: templateExercises }, { data: exercises }] = await Promise.all([
    supabase
      .from("routine_template_exercises")
      .select("exercise_id, orden, series_obj, reps_min, reps_max, rpe_obj, descanso_seg, notas, exercises(nombre_canonico)")
      .eq("template_id", id)
      .order("orden", { ascending: true }),
    supabase
      .from("exercises")
      .select("id, nombre_canonico, grupo_muscular, tipo")
      .order("nombre_canonico", { ascending: true }),
  ]);

  const initialItems: BuilderItem[] = ((templateExercises ?? []) as TemplateExerciseRow[]).map((re) => {
    const ex = Array.isArray(re.exercises) ? re.exercises[0] : re.exercises;
    return {
      exercise_id: re.exercise_id,
      nombre: ex?.nombre_canonico ?? "—",
      series_obj: re.series_obj,
      reps_min: re.reps_min,
      reps_max: re.reps_max,
      rpe_obj: re.rpe_obj !== null ? Number(re.rpe_obj) : null,
      descanso_seg: re.descanso_seg,
      notas: re.notas ?? "",
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/routines" className="text-sm text-muted underline underline-offset-4">
          ← Rutinas
        </Link>
        <h1 className="mb-1 mt-3 text-2xl font-semibold tracking-tight">Editar rutina</h1>
        <p className="text-sm text-muted">
          Los cambios no tocan las rutinas que ya asignaste — esas quedan como estaban.
        </p>
      </div>

      <section className="glass rounded-3xl p-7 sm:p-8">
        <RoutineBuilder
          exercises={exercises ?? []}
          initialItems={initialItems}
          initialNombre={template.nombre}
          initialDescripcion={template.descripcion ?? ""}
          action={updateTemplate.bind(null, id)}
          submitLabel="Guardar cambios"
          withDescripcion
          error={error}
        />
      </section>

      <section className="glass rounded-3xl p-7 sm:p-8">
        <h2 className="mb-2 text-lg font-semibold tracking-tight">Eliminar</h2>
        <p className="mb-4 text-sm text-muted">
          Se borra la rutina de tu catálogo. Las que ya asignaste a tus atletas no se tocan.
        </p>
        <form action={deleteTemplate.bind(null, id)}>
          <button
            type="submit"
            className="glass-input rounded-xl px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:border-red-400/40"
          >
            Eliminar rutina
          </button>
        </form>
      </section>
    </div>
  );
}
