"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const GRUPOS_MUSCULARES = [
  "pecho",
  "espalda",
  "hombro",
  "biceps",
  "triceps",
  "pierna",
  "gluteo",
  "core",
  "cardio",
  "otro",
] as const;

const TIPOS = ["barra", "mancuerna", "maquina", "cable", "peso_corporal", "banda", "otro"] as const;

export async function createExercise(formData: FormData) {
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

  const nombreCanonico = String(formData.get("nombre_canonico") ?? "").trim();
  const grupoMuscular = String(formData.get("grupo_muscular") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const instrucciones = String(formData.get("instrucciones") ?? "").trim();

  if (!nombreCanonico) redirect("/dashboard/exercises?error=Falta el nombre del ejercicio");
  if (!GRUPOS_MUSCULARES.includes(grupoMuscular as (typeof GRUPOS_MUSCULARES)[number])) {
    redirect("/dashboard/exercises?error=Grupo muscular inválido");
  }
  if (!TIPOS.includes(tipo as (typeof TIPOS)[number])) {
    redirect("/dashboard/exercises?error=Tipo inválido");
  }

  const { error } = await supabase.from("exercises").insert({
    coach_id: coach.id,
    nombre_canonico: nombreCanonico,
    grupo_muscular: grupoMuscular,
    tipo,
    instrucciones: instrucciones || null,
    es_global: false,
  });

  if (error) {
    const msg = error.code === "23505" ? "Ya tenés un ejercicio con ese nombre" : error.message;
    redirect(`/dashboard/exercises?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/dashboard/exercises");
  redirect("/dashboard/exercises");
}
