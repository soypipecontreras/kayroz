"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Mismo patrón que getOwnCoachId en app/dashboard/actions.ts, del lado atleta.
export async function getOwnAthleteId(supabase: Awaited<ReturnType<typeof createClient>>) {
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

  return athlete.id as string;
}

export async function signOutAthlete() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
