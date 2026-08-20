"use server";

import { createClient } from "@/lib/supabase/server";

// Se llama recién después de que la persona ya tiene sesión (signUp o signIn
// del lado cliente): activate_athlete es security definer y usa auth.uid() del
// caller, así que nadie puede activar la cuenta de otro con un token ajeno.
//
// Devuelve ok también cuando el token ya no sirve pero la persona YA está
// vinculada a un atleta: eso pasa si reintenta el link después de haber
// activado, y mandarle un error ahí sería mentirle — su cuenta está lista.
export async function activateAthlete(token: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No hay sesión activa." };

  const { error } = await supabase.rpc("activate_athlete", { p_token: token });
  if (!error) return {};

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (athlete) return {};

  return { error: "El link ya no es válido. Pedile a tu entrenador uno nuevo." };
}
