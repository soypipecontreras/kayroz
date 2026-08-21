"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOwnAthleteId } from "../actions";

// El token se genera del lado del server (crypto.randomUUID) y se guarda en la
// fila del propio atleta vía RLS (athletes_update_own_by_athlete_auth).
// Regenerarlo invalida el anterior — es la forma de "cerrar sesión" del Atajo.
export async function generarHealthToken() {
  const supabase = await createClient();
  const athleteId = await getOwnAthleteId(supabase);

  const { data, error } = await supabase
    .from("athletes")
    .update({ health_ingest_token: crypto.randomUUID() })
    .eq("id", athleteId)
    .select("id");

  if (error) redirect(`/app/salud?error=${encodeURIComponent(error.message)}`);
  if (!data || data.length === 0) redirect(`/app/salud?error=${encodeURIComponent("No pudimos generar el token")}`);

  revalidatePath("/app/salud");
  redirect("/app/salud");
}

export async function revocarHealthToken() {
  const supabase = await createClient();
  const athleteId = await getOwnAthleteId(supabase);

  const { data, error } = await supabase
    .from("athletes")
    .update({ health_ingest_token: null })
    .eq("id", athleteId)
    .select("id");

  if (error) redirect(`/app/salud?error=${encodeURIComponent(error.message)}`);
  if (!data || data.length === 0) redirect(`/app/salud?error=${encodeURIComponent("No pudimos revocar el token")}`);

  revalidatePath("/app/salud");
  redirect("/app/salud");
}
