import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logSet } from "./actions";

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id, org_id, unidad_peso")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!athlete) redirect("/login");

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, nombre_canonico")
    .or(`es_global.eq.true,org_id.eq.${athlete.org_id}`)
    .order("nombre_canonico", { ascending: true });

  return (
    <div className="glass max-w-md rounded-3xl p-8 sm:p-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Cargar serie</h1>
      <p className="mb-8 text-sm text-muted">Un ejercicio a la vez. Podés cargar varios seguidos.</p>

      <form action={logSet} className="flex flex-col gap-4">
        <select
          name="exercise_id"
          required
          defaultValue=""
          className="glass-input rounded-2xl px-4 py-3.5 text-[15px] text-foreground outline-none"
        >
          <option value="" disabled>
            Elegí un ejercicio
          </option>
          {(exercises ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre_canonico}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-3 gap-3">
          <input
            name="peso"
            type="number"
            step="0.5"
            min="0"
            placeholder={`Peso (${athlete.unidad_peso})`}
            className="glass-input rounded-2xl px-3 py-3.5 text-[15px] text-foreground outline-none placeholder:text-muted"
          />
          <input
            name="reps"
            type="number"
            min="1"
            required
            placeholder="Reps"
            className="glass-input rounded-2xl px-3 py-3.5 text-[15px] text-foreground outline-none placeholder:text-muted"
          />
          <input
            name="series"
            type="number"
            min="1"
            required
            defaultValue="1"
            placeholder="Series"
            className="glass-input rounded-2xl px-3 py-3.5 text-[15px] text-foreground outline-none placeholder:text-muted"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {ok && !error && <p className="text-sm text-green-400">Cargado.</p>}
        <button type="submit" className="btn-primary mt-2 rounded-2xl px-4 py-3.5 text-[15px] font-semibold">
          Guardar
        </button>
      </form>
    </div>
  );
}
