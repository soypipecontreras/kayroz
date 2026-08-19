"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateInviteCodeString } from "@/lib/inviteCode";

async function getOwnCoachId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!coach) redirect("/onboarding");

  return coach.id as string;
}

export async function generateInviteCode() {
  const supabase = await createClient();
  const coachId = await getOwnCoachId(supabase);

  // Reintenta en la rara colisión de código (unique constraint) — mismo
  // criterio que createInviteCode en _shared/coaches.ts (lado bot).
  for (let attempt = 0; attempt < 5; attempt++) {
    const codigo = generateInviteCodeString();
    const { error } = await supabase.from("invite_codes").insert({ coach_id: coachId, codigo });
    if (!error) {
      revalidatePath("/dashboard");
      return;
    }
    if (error.code !== "23505") throw new Error(error.message);
  }
  throw new Error("No se pudo generar un código único tras varios intentos");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
