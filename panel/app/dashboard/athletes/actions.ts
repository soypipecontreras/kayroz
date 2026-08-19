"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

export async function assignRoutine(athleteId: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nombre = String(formData.get("nombre") ?? "").trim();
  const lineasRaw = String(formData.get("ejercicios") ?? "");

  const lineas = lineasRaw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (!nombre || lineas.length === 0) {
    redirect(`/dashboard/athletes/${athleteId}?error=${encodeURIComponent("Falta el nombre o los ejercicios")}`);
  }

  // Mismo formato que /nuevarutina en el bot: "Ejercicio SERIESxREPS", ej.
  // "Press banca 4x8". Se reimplementa acá en vez de compartir código con
  // las Edge Functions Deno — ver nota de reuso en el plan del panel.
  const LINE_RE = /^(.+?)\s+(\d+)\s*x\s*(amrap|\d+)$/i;

  type Parsed = { exerciseText: string; series_obj: number; reps_min: number; reps_max: number | null };
  const parsed: Parsed[] = [];
  const noEncontrados: string[] = [];

  for (const linea of lineas) {
    const match = linea.match(LINE_RE);
    if (!match) {
      redirect(
        `/dashboard/athletes/${athleteId}?error=${encodeURIComponent(`No entendí esta línea: "${linea}". Formato: "Press banca 4x8"`)}`,
      );
    }
    const [, exerciseText, seriesRaw, repsRaw] = match!;
    const isAmrap = repsRaw.toLowerCase() === "amrap";
    parsed.push({
      exerciseText: exerciseText.trim(),
      series_obj: parseInt(seriesRaw, 10),
      reps_min: isAmrap ? 1 : parseInt(repsRaw, 10),
      reps_max: isAmrap ? null : parseInt(repsRaw, 10),
    });
  }

  const { data: athlete } = await supabase.from("athletes").select("coach_id").eq("id", athleteId).maybeSingle();
  if (!athlete) redirect("/dashboard");

  const { data: exercisesData } = await supabase
    .from("exercises")
    .select("id, nombre_canonico")
    .or(`es_global.eq.true,coach_id.eq.${athlete.coach_id}`);

  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();

  const byName = new Map((exercisesData ?? []).map((e) => [normalize(e.nombre_canonico), e.id as string]));

  const items = parsed.map((p) => {
    const exerciseId = byName.get(normalize(p.exerciseText));
    if (!exerciseId) noEncontrados.push(p.exerciseText);
    return { ...p, exerciseId };
  });

  if (noEncontrados.length > 0) {
    redirect(
      `/dashboard/athletes/${athleteId}?error=${encodeURIComponent(`No reconozco: ${noEncontrados.join(", ")}`)}`,
    );
  }

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .insert({ athlete_id: athleteId, nombre })
    .select("id")
    .single();
  if (routineError) {
    redirect(`/dashboard/athletes/${athleteId}?error=${encodeURIComponent(routineError.message)}`);
  }

  const rows = items.map((it, i) => ({
    routine_id: routine.id,
    exercise_id: it.exerciseId,
    orden: i + 1,
    series_obj: it.series_obj,
    reps_min: it.reps_min,
    reps_max: it.reps_max,
  }));
  const { error: insertError } = await supabase.from("routine_exercises").insert(rows);
  if (insertError) {
    redirect(`/dashboard/athletes/${athleteId}?error=${encodeURIComponent(insertError.message)}`);
  }

  redirect(`/dashboard/athletes/${athleteId}`);
}
