"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOwnAthleteId } from "../actions";
import { DISCIPLINAS, esNivel, esObjetivo, type Disciplina } from "@/lib/disciplinas";

export async function updatePerfil(formData: FormData) {
  const supabase = await createClient();
  const athleteId = await getOwnAthleteId(supabase);

  const objetivoRaw = String(formData.get("objetivo") ?? "");
  const nivelRaw = String(formData.get("nivel") ?? "");
  const diasRaw = Number(formData.get("dias_semana") ?? 0);

  // Los checkboxes llegan como valores repetidos de "disciplinas".
  const disciplinas = formData
    .getAll("disciplinas")
    .map(String)
    .filter((d): d is Disciplina => (DISCIPLINAS as readonly string[]).includes(d));

  const patch = {
    objetivo: esObjetivo(objetivoRaw) ? objetivoRaw : null,
    nivel: esNivel(nivelRaw) ? nivelRaw : null,
    disciplinas,
    dias_semana: Number.isInteger(diasRaw) && diasRaw >= 1 && diasRaw <= 7 ? diasRaw : null,
  };

  // .select() para que un agujero de RLS falle ruidosamente (ver §0 de CLAUDE.md).
  const { data, error } = await supabase.from("athletes").update(patch).eq("id", athleteId).select("id");

  if (error) redirect(`/app/perfil?error=${encodeURIComponent(error.message)}`);
  if (!data || data.length === 0) redirect(`/app/perfil?error=${encodeURIComponent("No pudimos guardar tu perfil")}`);

  revalidatePath("/app/perfil");
  revalidatePath("/app/recomendadas");
  redirect("/app/recomendadas");
}
