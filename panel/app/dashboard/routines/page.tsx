import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { DISCIPLINA_LABEL, MODALIDAD_LABEL, NIVEL_LABEL, esDisciplina, esModalidad, esNivel } from "@/lib/disciplinas";

interface GlobalTemplate {
  id: string;
  nombre: string;
  descripcion: string | null;
  disciplina: string;
  nivel: string | null;
  modalidad: string;
  duracion_min: number | null;
  routine_template_exercises: { id: string }[] | null;
}

export default async function RoutineTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const org = await getOrgContext(supabase);

  const [{ data: templates }, { data: biblioteca }] = await Promise.all([
    supabase
      .from("routine_templates")
      .select("id, nombre, descripcion, created_at, routine_template_exercises(id)")
      .eq("org_id", org.orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("routine_templates")
      .select("id, nombre, descripcion, disciplina, nivel, modalidad, duracion_min, routine_template_exercises(id)")
      .eq("es_global", true)
      .order("disciplina", { ascending: true })
      .order("nombre", { ascending: true }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">Rutinas</h1>
          <p className="text-sm text-muted">
            Armá una rutina una vez y asignala a los atletas que quieras.
          </p>
        </div>
        <Link
          href="/dashboard/routines/new"
          className="btn-primary shrink-0 rounded-xl px-4 py-2 text-sm font-semibold"
        >
          Nueva rutina
        </Link>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {!templates || templates.length === 0 ? (
        <section className="glass rounded-3xl p-7 sm:p-8">
          <p className="text-sm text-muted">
            Todavía no armaste ninguna rutina. Creá la primera y después la asignás a tus atletas
            desde su ficha — o asigná directo una de la Biblioteca Kayroz de acá abajo.
          </p>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {templates.map((t) => (
            <li key={t.id}>
              <Link
                href={`/dashboard/routines/${t.id}`}
                className="glass flex items-center justify-between rounded-3xl p-6 transition-colors hover:border-border-strong"
              >
                <div>
                  <p className="text-[15px] font-medium">{t.nombre}</p>
                  {t.descripcion && <p className="mt-0.5 text-sm text-muted">{t.descripcion}</p>}
                </div>
                <span className="shrink-0 text-sm text-muted">
                  {t.routine_template_exercises?.length ?? 0} ejercicios
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Biblioteca Kayroz: plantillas globales de la plataforma, por
          disciplina y nivel. Solo lectura — se asignan desde la ficha del
          atleta, igual que las propias. */}
      {biblioteca && biblioteca.length > 0 && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="mb-1 text-lg font-semibold tracking-tight">Biblioteca Kayroz</h2>
            <p className="text-sm text-muted">
              Rutinas listas de gimnasio, calistenia, crossfit, hyrox y funcional. Asignalas desde
              la ficha de cada atleta; tus atletas también las ven recomendadas en su portal según
              su perfil.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(biblioteca as GlobalTemplate[]).map((t) => (
              <li key={t.id} className="glass flex flex-col gap-2 rounded-3xl p-6">
                <p className="text-[15px] font-medium">{t.nombre}</p>
                <p className="flex flex-wrap gap-2 text-xs text-muted">
                  {esDisciplina(t.disciplina) && (
                    <span className="glass-input rounded-full px-3 py-1">{DISCIPLINA_LABEL[t.disciplina]}</span>
                  )}
                  {t.nivel && esNivel(t.nivel) && (
                    <span className="glass-input rounded-full px-3 py-1">{NIVEL_LABEL[t.nivel]}</span>
                  )}
                  {esModalidad(t.modalidad) && t.modalidad !== "series" && (
                    <span className="glass-input rounded-full px-3 py-1">{MODALIDAD_LABEL[t.modalidad]}</span>
                  )}
                  {t.duracion_min && <span className="glass-input rounded-full px-3 py-1">~{t.duracion_min}′</span>}
                  <span className="glass-input rounded-full px-3 py-1">
                    {t.routine_template_exercises?.length ?? 0} ejercicios
                  </span>
                </p>
                {t.descripcion && <p className="text-sm text-muted">{t.descripcion}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
