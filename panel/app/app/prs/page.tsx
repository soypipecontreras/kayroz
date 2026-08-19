import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface SetRow {
  peso: number;
  reps: number;
  created_at: string;
  exercise_id: string;
  exercises: { nombre_canonico: string } | { nombre_canonico: string }[] | null;
}

export default async function PrsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!athlete) redirect("/login");

  // Mismo criterio que getAthletePRs en supabase/functions/_shared/queries.ts:
  // el PR de cada ejercicio es el peso máximo histórico, sin importar si ese
  // set puntual quedó marcado es_pr=true.
  const { data } = await supabase
    .from("sets")
    .select("peso, reps, created_at, exercise_id, exercises(nombre_canonico), workouts!inner(athlete_id)")
    .eq("workouts.athlete_id", athlete.id)
    .not("peso", "is", null)
    .order("peso", { ascending: false });

  const seen = new Set<string>();
  const prs: { exerciseName: string; pesoMax: number; reps: number; fecha: string }[] = [];
  for (const row of (data ?? []) as unknown as SetRow[]) {
    if (seen.has(row.exercise_id)) continue;
    seen.add(row.exercise_id);
    const ex = Array.isArray(row.exercises) ? row.exercises[0] : row.exercises;
    prs.push({ exerciseName: ex?.nombre_canonico ?? "—", pesoMax: row.peso, reps: row.reps, fecha: row.created_at });
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Récords personales</h1>

      <section className="glass rounded-3xl p-7 sm:p-8">
        {prs.length === 0 ? (
          <p className="text-sm text-muted">Todavía no tenés ningún PR registrado.</p>
        ) : (
          <ul className="flex flex-col gap-2.5 text-sm">
            {prs.map((pr) => (
              <li key={pr.exerciseName} className="glass-input flex items-center justify-between rounded-2xl px-4 py-3">
                <span className="font-medium">{pr.exerciseName}</span>
                <span className="text-muted">
                  {pr.pesoMax}x{pr.reps} · {new Date(pr.fecha).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
