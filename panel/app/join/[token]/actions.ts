"use server";

import { createClient } from "@/lib/supabase/server";

// Se llama recién después de que el atleta ya tiene sesión (signUp corrido
// del lado cliente) — activate_athlete (security definer) usa auth.uid() del
// caller, así que esto tiene que correr con la sesión ya puesta en cookies.
export async function activateAthlete(token: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No hay sesión activa." };

  const { error } = await supabase.rpc("activate_athlete", { p_token: token });
  if (error) return { error: "El link ya no es válido. Pedile a tu entrenador uno nuevo." };

  return {};
}
