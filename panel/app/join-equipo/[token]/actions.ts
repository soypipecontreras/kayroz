"use server";

import { createClient } from "@/lib/supabase/server";

// Se llama recién después de que la persona ya tiene sesión (signUp del lado
// cliente): activate_membership es security definer y usa auth.uid() del
// caller, así que nadie puede activar el acceso de otro con un token ajeno.
export async function activateMembership(token: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No hay sesión activa." };

  const { error } = await supabase.rpc("activate_membership", { p_token: token });
  if (error) return { error: "El link ya no es válido. Pedí uno nuevo." };

  return {};
}
