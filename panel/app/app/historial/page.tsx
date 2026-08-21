import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function formatDuracion(segundos: number): string {
  const min = Math.round(segundos / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const resto = min % 60;
  return resto === 0 ? `${h} h` : `${h} h ${resto} min`;
}

const FUENTE_LABEL: Record<string, string> = {
  apple_watch: "Apple Watch",
  apple_health: "Apple Salud",
};

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
    .select(
      "id, fecha, estado, fuente, tipo_actividad, duracion_seg, calorias, fc_promedio, fc_max, distancia_m, sets(id, peso, reps, es_pr, orden, exercises(nombre_canonico))",
    )
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
            {workouts.map((w) => {
              const delReloj = w.fuente === "apple_watch" || w.fuente === "apple_health";
              // Métricas del wearable, solo las que vinieron.
              const metricas = delReloj
                ? [
                    w.duracion_seg !== null && formatDuracion(w.duracion_seg),
                    w.distancia_m !== null && w.distancia_m > 0 && `${(w.distancia_m / 1000).toFixed(1)} km`,
                    w.calorias !== null && `${w.calorias} kcal`,
                    w.fc_promedio !== null && `♥ ${w.fc_promedio}${w.fc_max !== null ? `/${w.fc_max}` : ""} ppm`,
                  ].filter((m): m is string => Boolean(m))
                : [];
              return (
                <li key={w.id} className="glass-input rounded-2xl px-4 py-3.5 text-sm">
                  <p className="font-medium">
                    {new Date(w.fecha).toLocaleDateString()}{" "}
                    {delReloj ? (
                      <span className="text-muted">
                        · {w.tipo_actividad || "Entreno"} ({FUENTE_LABEL[w.fuente] ?? w.fuente})
                      </span>
                    ) : (
                      <span className="text-muted">({w.estado})</span>
                    )}
                  </p>
                  {metricas.length > 0 && <p className="mt-1 text-muted">{metricas.join(" · ")}</p>}
                  {(w.sets?.length ?? 0) > 0 && (
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
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
