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
      <div className="mb-2">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Ejercicios</h1>
        <p className="text-sm text-muted">Catálogo global más los tuyos propios.</p>
      </div>

      <section className="glass rounded-3xl p-7 sm:p-8">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">Agregar ejercicio propio</h2>
        <form action={createExercise} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            name="nombre_canonico"
            required
            placeholder="Nombre del ejercicio"
            className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted sm:col-span-2"
          />
          <select
            name="grupo_muscular"
            required
            defaultValue=""
            className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none"
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
            className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none"
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
            className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted sm:col-span-2"
          />
          {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}
          <button type="submit" className="btn-primary rounded-2xl px-4 py-3 text-[15px] font-semibold sm:col-span-2">
            Agregar
          </button>
        </form>
      </section>

      {propios.length > 0 && (
        <section className="glass rounded-3xl p-7 sm:p-8">
          <h2 className="mb-5 text-lg font-semibold tracking-tight">Tus ejercicios ({propios.length})</h2>
          <ExerciseList exercises={propios} />
        </section>
      )}

      <section className="glass rounded-3xl p-7 sm:p-8">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">Catálogo global ({globales.length})</h2>
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
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {exercises.map((e) => (
        <li
          key={e.id}
          className="glass-input flex items-center justify-between rounded-2xl px-4 py-3 text-[15px] transition-colors hover:border-white/25"
        >
          <span>{e.nombre_canonico}</span>
          <span className="text-xs text-muted">
            {e.grupo_muscular} · {e.tipo}
          </span>
        </li>
      ))}
    </ul>
  );
}
