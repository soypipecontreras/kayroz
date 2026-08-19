import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HistorialPage() {
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

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, fecha, estado, sets(id, peso, reps, es_pr, orden, exercises(nombre_canonico))")
    .eq("athlete_id", athlete.id)
    .order("fecha", { ascending: false })
    .limit(20);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Historial</h1>

      <section className="glass rounded-3xl p-7 sm:p-8">
        {!workouts || workouts.length === 0 ? (
          <p className="text-sm text-muted">Todavía no cargaste ningún entrenamiento.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {workouts.map((w) => (
              <li key={w.id} className="glass-input rounded-2xl px-4 py-3.5 text-sm">
                <p className="font-medium">
                  {new Date(w.fecha).toLocaleDateString()} <span className="text-muted">({w.estado})</span>
                </p>
                <ul className="ml-3 mt-1 text-muted">
                  {[...(w.sets ?? [])]
                    .sort((a, b) => a.orden - b.orden)
                    .map((s) => {
                      const ex = Array.isArray(s.exercises) ? s.exercises[0] : s.exercises;
                      return (
                        <li key={s.id}>
                          {ex?.nombre_canonico ?? "—"}: {s.peso !== null ? `${s.peso}x${s.reps}` : `${s.reps} reps`}
                          {s.es_pr && " 🔥 PR"}
                        </li>
                      );
                    })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
