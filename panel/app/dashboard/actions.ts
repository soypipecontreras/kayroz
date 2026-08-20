"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { generateInviteCodeString } from "@/lib/inviteCode";

export async function generateInviteCode() {
  const supabase = await createClient();
  const org = await getOrgContext(supabase);

  // Reintenta en la rara colisión de código (unique constraint) — mismo
  // criterio que createInviteCode en _shared/coaches.ts (lado bot).
  for (let attempt = 0; attempt < 5; attempt++) {
    const codigo = generateInviteCodeString();
    const { error } = await supabase.from("invite_codes").insert({ org_id: org.orgId, codigo });
    if (!error) {
      revalidatePath("/dashboard/athletes");
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
