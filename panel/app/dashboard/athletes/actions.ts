"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseItems } from "@/lib/routineItems";

// Alta manual: no pasa por código de invitación ni WhatsApp (todavía no hay
// canal conectado). El coach carga el atleta directo desde el panel; cuando
// el bot esté activo, ese mismo atleta puede vincular su teléfono más
// adelante (columna telefono queda libre para completarse después).
export async function createAthlete(formData: FormData) {
  const supabase = await createClient();

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

  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefonoRaw = String(formData.get("telefono") ?? "").trim();
  const unidadPeso = String(formData.get("unidad_peso") ?? "kg");

  if (!nombre) redirect("/dashboard/athletes/new?error=Falta el nombre");

  const { data: athlete, error } = await supabase
    .from("athletes")
    .insert({
      coach_id: coach.id,
      nombre,
      telefono: telefonoRaw || null,
      unidad_peso: unidadPeso === "lb" ? "lb" : "kg",
    })
    .select("id")
    .single();

  if (error) {
    const msg = error.code === "23505" ? "Ese teléfono ya está en uso" : error.message;
    redirect(`/dashboard/athletes/new?error=${encodeURIComponent(msg)}`);
  }

  redirect(`/dashboard/athletes/${athlete.id}`);
}

// Mismo patrón que generateInviteCode en app/dashboard/actions.ts. El token
// es un uuid (no un código corto tipo invite_codes) porque va en un link, no
// se dicta ni se tipea a mano.
export async function generateAthleteAccess(athleteId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: athlete } = await supabase.from("athletes").select("id").eq("id", athleteId).maybeSingle();
  if (!athlete) redirect("/dashboard");

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("athletes")
    .update({ activation_token: token, activation_expires_at: expiresAt })
    .eq("id", athleteId);
  if (error) {
    redirect(`/dashboard/athletes/${athleteId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/athletes/${athleteId}`);
}

// Copia una plantilla del coach a un atleta. Se COPIA, no se referencia: si
// después el coach edita la plantilla, lo que ese atleta ya venía entrenando no
// cambia solo. Ver 20260820000000_routine_templates.sql.
export async function assignFromTemplate(athleteId: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const templateId = String(formData.get("template_id") ?? "");
  const back = `/dashboard/athletes/${athleteId}`;
  if (!templateId) redirect(`${back}?error=${encodeURIComponent("Elegí una rutina")}`);

  const { data: template } = await supabase
    .from("routine_templates")
    .select("id, nombre")
    .eq("id", templateId)
    .maybeSingle();
  if (!template) redirect(`${back}?error=${encodeURIComponent("No encontramos esa rutina")}`);

  const { data: templateExercises } = await supabase
    .from("routine_template_exercises")
    .select("exercise_id, orden, series_obj, reps_min, reps_max, rpe_obj, descanso_seg, notas, imagen_path, video_path")
    .eq("template_id", templateId)
    .order("orden", { ascending: true });

  if (!templateExercises || templateExercises.length === 0) {
    redirect(`${back}?error=${encodeURIComponent("Esa rutina no tiene ejercicios")}`);
  }

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .insert({ athlete_id: athleteId, nombre: template.nombre })
    .select("id")
    .single();
  if (routineError) redirect(`${back}?error=${encodeURIComponent(routineError.message)}`);

  const rows = templateExercises.map((te) => ({ routine_id: routine.id, ...te }));
  const { error: insertError } = await supabase.from("routine_exercises").insert(rows);
  if (insertError) {
    await supabase.from("routines").delete().eq("id", routine.id);
    redirect(`${back}?error=${encodeURIComponent(insertError.message)}`);
  }

  revalidatePath(back);
  redirect(back);
}

// Rutina armada a mano para un atleta puntual, sin pasar por plantilla.
export async function assignCustomRoutine(athleteId: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const back = `/dashboard/athletes/${athleteId}`;
  const nombre = String(formData.get("nombre") ?? "").trim();
  const parsed = parseItems(String(formData.get("items") ?? ""));

  if (!nombre) redirect(`${back}?error=${encodeURIComponent("Falta el nombre de la rutina")}`);
  if ("error" in parsed) redirect(`${back}?error=${encodeURIComponent(parsed.error)}`);

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .insert({ athlete_id: athleteId, nombre })
    .select("id")
    .single();
  if (routineError) redirect(`${back}?error=${encodeURIComponent(routineError.message)}`);

  const rows = parsed.items.map((it, i) => ({ routine_id: routine.id, orden: i + 1, ...it }));
  const { error: insertError } = await supabase.from("routine_exercises").insert(rows);
  if (insertError) {
    await supabase.from("routines").delete().eq("id", routine.id);
    redirect(`${back}?error=${encodeURIComponent(insertError.message)}`);
  }

  revalidatePath(back);
  redirect(back);
}

export async function deleteRoutine(athleteId: string, routineId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const back = `/dashboard/athletes/${athleteId}`;

  // Los workouts ya registrados referencian routine_id, así que borrar la
  // rutina se los llevaría puesto (o fallaría por FK). En vez de eso se
  // desactiva: desaparece del portal del atleta y el historial queda intacto.
  const { error } = await supabase.from("routines").update({ activa: false }).eq("id", routineId);
  if (error) redirect(`${back}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(back);
  redirect(back);
}
