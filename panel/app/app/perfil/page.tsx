import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePerfil } from "./actions";
import {
  DISCIPLINAS,
  DISCIPLINA_LABEL,
  NIVELES,
  NIVEL_LABEL,
  OBJETIVOS,
  OBJETIVO_LABEL,
} from "@/lib/disciplinas";

export default async function PerfilPage({
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

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id, nombre, objetivo, nivel, disciplinas, dias_semana")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!athlete) redirect("/login");

  const disciplinasActuales = new Set<string>(athlete.disciplinas ?? []);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Tu perfil de entrenamiento</h1>
        <p className="text-sm text-muted">
          Con esto te recomendamos rutinas a tu medida. Lo podés cambiar cuando quieras.
        </p>
      </div>

      <form action={updatePerfil} className="glass flex flex-col gap-6 rounded-3xl p-7 sm:p-8">
        <div>
          <p className="mb-3 text-sm font-medium">¿Qué disciplinas entrenás?</p>
          <div className="flex flex-wrap gap-2">
            {DISCIPLINAS.map((d) => (
              <label
                key={d}
                className="glass-input flex cursor-pointer items-center gap-2 rounded-2xl px-4 py-2.5 text-sm has-[:checked]:border-foreground/60 has-[:checked]:font-semibold"
              >
                <input
                  type="checkbox"
                  name="disciplinas"
                  value={d}
                  defaultChecked={disciplinasActuales.has(d)}
                  className="accent-current"
                />
                {DISCIPLINA_LABEL[d]}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">Objetivo</span>
            <select
              name="objetivo"
              defaultValue={athlete.objetivo ?? ""}
              className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none"
            >
              <option value="">Sin definir</option>
              {OBJETIVOS.map((o) => (
                <option key={o} value={o}>
                  {OBJETIVO_LABEL[o]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">Nivel</span>
            <select
              name="nivel"
              defaultValue={athlete.nivel ?? ""}
              className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none"
            >
              <option value="">Sin definir</option>
              {NIVELES.map((n) => (
                <option key={n} value={n}>
                  {NIVEL_LABEL[n]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">Días por semana</span>
            <select
              name="dias_semana"
              defaultValue={athlete.dias_semana ?? ""}
              className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none"
            >
              <option value="">Sin definir</option>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" className="btn-primary self-start rounded-2xl px-5 py-3 text-[15px] font-semibold">
          Guardar y ver recomendadas
        </button>
      </form>
    </div>
  );
}
