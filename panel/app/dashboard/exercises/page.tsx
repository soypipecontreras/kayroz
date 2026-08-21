import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { DISCIPLINAS, DISCIPLINA_LABEL, esDisciplina, type Disciplina } from "@/lib/disciplinas";
import { createExercise } from "./actions";

const GRUPOS_MUSCULARES = ["pecho", "espalda", "hombro", "biceps", "triceps", "pierna", "gluteo", "core", "cardio", "otro"];
const TIPOS = ["barra", "mancuerna", "maquina", "cable", "peso_corporal", "banda", "otro"];

interface ExerciseRow {
  id: string;
  nombre_canonico: string;
  grupo_muscular: string;
  tipo: string;
  es_global: boolean;
  disciplinas: string[] | null;
}

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; d?: string }>;
}) {
  const supabase = await createClient();
  const { error, d } = await searchParams;
  const filtro: Disciplina | null = d && esDisciplina(d) ? d : null;

  const org = await getOrgContext(supabase);

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, nombre_canonico, grupo_muscular, tipo, es_global, disciplinas")
    .order("es_global", { ascending: false })
    .order("nombre_canonico", { ascending: true });

  // Para marcar cuáles ya tienen video propio de esta org.
  const { data: media } = await supabase
    .from("org_exercise_media")
    .select("exercise_id, video_path")
    .eq("org_id", org.orgId);
  const conVideo = new Set(
    (media ?? []).filter((m) => m.video_path).map((m) => m.exercise_id),
  );

  const filtrados = ((exercises ?? []) as ExerciseRow[]).filter(
    (e) => !filtro || (e.disciplinas ?? []).includes(filtro),
  );
  const globales = filtrados.filter((e) => e.es_global);
  const propios = filtrados.filter((e) => !e.es_global);

  return (
    <div className="flex flex-col gap-8">
      <div className="mb-2">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Ejercicios</h1>
        <p className="text-sm text-muted">Catálogo global más los tuyos propios.</p>
      </div>

      {/* Filtro por disciplina: links, no estado — así la URL es compartible
          y la página sigue siendo un server component. */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/exercises"
          className={`glass-input rounded-full px-4 py-2 text-sm transition-colors ${!filtro ? "border-border-strong font-semibold" : "text-muted hover:text-foreground"}`}
        >
          Todas
        </Link>
        {DISCIPLINAS.map((disc) => (
          <Link
            key={disc}
            href={`/dashboard/exercises?d=${disc}`}
            className={`glass-input rounded-full px-4 py-2 text-sm transition-colors ${filtro === disc ? "border-border-strong font-semibold" : "text-muted hover:text-foreground"}`}
          >
            {DISCIPLINA_LABEL[disc]}
          </Link>
        ))}
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
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <span className="mr-1 text-sm text-muted">Disciplinas:</span>
            {DISCIPLINAS.map((disc) => (
              <label
                key={disc}
                className="glass-input flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-sm has-[:checked]:border-border-strong has-[:checked]:font-semibold"
              >
                <input
                  type="checkbox"
                  name="disciplinas"
                  value={disc}
                  defaultChecked={disc === "gimnasio"}
                  className="accent-current"
                />
                {DISCIPLINA_LABEL[disc]}
              </label>
            ))}
          </div>
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
          <ExerciseList exercises={propios} conVideo={conVideo} />
        </section>
      )}

      <section className="glass rounded-3xl p-7 sm:p-8">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">
          Catálogo global ({globales.length})
          {filtro && <span className="ml-2 text-sm font-normal text-muted">· {DISCIPLINA_LABEL[filtro]}</span>}
        </h2>
        <ExerciseList exercises={globales} conVideo={conVideo} />
      </section>
    </div>
  );
}

function ExerciseList({
  exercises,
  conVideo,
}: {
  exercises: ExerciseRow[];
  conVideo: Set<string>;
}) {
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {exercises.map((e) => (
        <li key={e.id}>
          <Link
            href={`/dashboard/exercises/${e.id}`}
            className="glass-input flex items-center justify-between rounded-2xl px-4 py-3 text-[15px] transition-colors hover:border-border-strong"
          >
            <span>
              {e.nombre_canonico}
              {conVideo.has(e.id) && <span className="ml-2 text-xs text-muted" title="Tiene video">▶</span>}
            </span>
            <span className="text-right text-xs text-muted">
              {e.grupo_muscular} · {e.tipo}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
