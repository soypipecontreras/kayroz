import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import RoutineBuilder from "../RoutineBuilder";
import TemplateMetaFields from "../TemplateMetaFields";
import { createTemplate } from "../actions";

export default async function NewRoutineTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  await getOrgContext(supabase);

  // RLS ya limita esto a globales + los del propio coach.
  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, nombre_canonico, grupo_muscular, tipo")
    .order("nombre_canonico", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/routines" className="text-sm text-muted underline underline-offset-4">
          ← Rutinas
        </Link>
        <h1 className="mb-1 mt-3 text-2xl font-semibold tracking-tight">Nueva rutina</h1>
        <p className="text-sm text-muted">Buscá cada ejercicio y ajustá series, reps y descanso.</p>
      </div>

      <section className="glass rounded-3xl p-7 sm:p-8">
        <RoutineBuilder
          exercises={exercises ?? []}
          action={createTemplate}
          submitLabel="Guardar rutina"
          withDescripcion
          metaFields={<TemplateMetaFields />}
          error={error}
        />
      </section>
    </div>
  );
}
