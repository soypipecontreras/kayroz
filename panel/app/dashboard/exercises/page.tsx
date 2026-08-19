import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createExercise } from "./actions";

const GRUPOS_MUSCULARES = ["pecho", "espalda", "hombro", "biceps", "triceps", "pierna", "gluteo", "core", "cardio", "otro"];
const TIPOS = ["barra", "mancuerna", "maquina", "cable", "peso_corporal", "banda", "otro"];

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const { error } = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!coach) redirect("/onboarding");

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, nombre_canonico, grupo_muscular, tipo, es_global")
    .order("es_global", { ascending: false })
    .order("nombre_canonico", { ascending: true });

  const globales = (exercises ?? []).filter((e) => e.es_global);
  const propios = (exercises ?? []).filter((e) => !e.es_global);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-lg border border-border p-5">
        <h2 className="mb-3 font-medium">Agregar ejercicio propio</h2>
        <form action={createExercise} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            name="nombre_canonico"
            required
            placeholder="Nombre del ejercicio"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-white sm:col-span-2"
          />
          <select
            name="grupo_muscular"
            required
            defaultValue=""
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-white"
          >
            <option value="" disabled>
              Grupo muscular
            </option>
            {GRUPOS_MUSCULARES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            name="tipo"
            required
            defaultValue=""
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-white"
          >
            <option value="" disabled>
              Tipo
            </option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            name="instrucciones"
            placeholder="Instrucciones (opcional)"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-white sm:col-span-2"
          />
          {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}
          <button
            type="submit"
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 sm:col-span-2"
          >
            Agregar
          </button>
        </form>
      </section>

      {propios.length > 0 && (
        <section className="rounded-lg border border-border p-5">
          <h2 className="mb-3 font-medium">Tus ejercicios ({propios.length})</h2>
          <ExerciseList exercises={propios} />
        </section>
      )}

      <section className="rounded-lg border border-border p-5">
        <h2 className="mb-3 font-medium">Catálogo global ({globales.length})</h2>
        <ExerciseList exercises={globales} />
      </section>
    </div>
  );
}

function ExerciseList({
  exercises,
}: {
  exercises: { id: string; nombre_canonico: string; grupo_muscular: string; tipo: string }[];
}) {
  return (
    <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
      {exercises.map((e) => (
        <li key={e.id} className="flex items-center justify-between rounded-md bg-surface px-3 py-2 text-sm">
          <span>{e.nombre_canonico}</span>
          <span className="text-xs text-muted">
            {e.grupo_muscular} · {e.tipo}
          </span>
        </li>
      ))}
    </ul>
  );
}
