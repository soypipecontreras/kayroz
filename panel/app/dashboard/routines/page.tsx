import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RoutineTemplatesPage({
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

  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!coach) redirect("/onboarding");

  const { data: templates } = await supabase
    .from("routine_templates")
    .select("id, nombre, descripcion, created_at, routine_template_exercises(id)")
    .eq("coach_id", coach.id)
    .order("created_at", { ascending: false });

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
            desde su ficha.
          </p>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {templates.map((t) => (
            <li key={t.id}>
              <Link
                href={`/dashboard/routines/${t.id}`}
                className="glass flex items-center justify-between rounded-3xl p-6 transition-colors hover:border-white/25"
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
    </div>
  );
}
