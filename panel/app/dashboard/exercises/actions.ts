"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { COACH_MEDIA_BUCKET } from "@/lib/media";

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
  const org = await getOrgContext(supabase);

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
    org_id: org.orgId,
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

// Devuelven { error } en vez de redirect: las llama MediaUploader (componente
// cliente) después de haber subido el archivo, y necesita poder limpiar el
// archivo huérfano si el guardado falla.
async function ownOrgOrNull(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("memberships")
    .select("org_id")
    .eq("auth_user_id", user.id)
    .eq("estado", "activo")
    .maybeSingle();
  return membership?.org_id ? (membership.org_id as string) : null;
}

export async function setExerciseMedia(
  exerciseId: string,
  kind: "imagen" | "video",
  path: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const orgId = await ownOrgOrNull(supabase);
  if (!orgId) return { error: "No hay sesión activa." };

  // La ruta la arma el navegador, así que se verifica que caiga dentro de la
  // carpeta de esta org (las policies del bucket ya lo exigen para subir,
  // esto evita además guardar una ruta ajena en la fila propia).
  if (!path.startsWith(`${orgId}/`)) return { error: "Ruta de archivo inválida." };

  const { data: exercise } = await supabase
    .from("exercises")
    .select("id, org_id, es_global, imagen_path, video_path")
    .eq("id", exerciseId)
    .maybeSingle();
  if (!exercise) return { error: "No encontramos el ejercicio." };
  if (exercise.es_global || exercise.org_id !== orgId) {
    return { error: "Solo podés cargar media en tus propios ejercicios." };
  }

  const column = kind === "imagen" ? "imagen_path" : "video_path";
  const previous = kind === "imagen" ? exercise.imagen_path : exercise.video_path;

  // El .select() no es decorativo: si una policy de RLS bloquea el update,
  // PostgREST no devuelve error, simplemente no toca ninguna fila. Sin esto el
  // archivo quedaba subido y la fila sin actualizar, en silencio.
  const { data: updated, error } = await supabase
    .from("exercises")
    .update({ [column]: path })
    .eq("id", exerciseId)
    .select("id");
  if (error) return { error: error.message };
  if (!updated || updated.length === 0) return { error: "No pudimos guardar la media." };

  if (previous && previous !== path) {
    await supabase.storage.from(COACH_MEDIA_BUCKET).remove([previous]);
  }

  revalidatePath(`/dashboard/exercises/${exerciseId}`);
  revalidatePath("/dashboard/exercises");
  return {};
}

export async function removeExerciseMedia(
  exerciseId: string,
  kind: "imagen" | "video",
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const orgId = await ownOrgOrNull(supabase);
  if (!orgId) return { error: "No hay sesión activa." };

  const { data: exercise } = await supabase
    .from("exercises")
    .select("id, org_id, es_global, imagen_path, video_path")
    .eq("id", exerciseId)
    .maybeSingle();
  if (!exercise) return { error: "No encontramos el ejercicio." };
  if (exercise.es_global || exercise.org_id !== orgId) {
    return { error: "Solo podés editar tus propios ejercicios." };
  }

  const column = kind === "imagen" ? "imagen_path" : "video_path";
  const current = kind === "imagen" ? exercise.imagen_path : exercise.video_path;

  const { data: updated, error } = await supabase
    .from("exercises")
    .update({ [column]: null })
    .eq("id", exerciseId)
    .select("id");
  if (error) return { error: error.message };
  if (!updated || updated.length === 0) return { error: "No pudimos quitar la media." };

  if (current) {
    await supabase.storage.from(COACH_MEDIA_BUCKET).remove([current]);
  }

  revalidatePath(`/dashboard/exercises/${exerciseId}`);
  revalidatePath("/dashboard/exercises");
  return {};
}
