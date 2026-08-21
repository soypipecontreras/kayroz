"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { COACH_MEDIA_BUCKET } from "@/lib/media";
import { DISCIPLINAS, type Disciplina } from "@/lib/disciplinas";

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
  const disciplinas = formData
    .getAll("disciplinas")
    .map(String)
    .filter((d): d is Disciplina => (DISCIPLINAS as readonly string[]).includes(d));

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
    // Sin ninguna marcada se cae al default del esquema ('{gimnasio}').
    ...(disciplinas.length > 0 ? { disciplinas } : {}),
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
  // esto evita además guardar una ruta ajena).
  if (!path.startsWith(`${orgId}/`)) return { error: "Ruta de archivo inválida." };

  // Solo hace falta comprobar que el ejercicio EXISTE y que esta org lo puede
  // ver: RLS ya limita el select a los globales más los propios. La media va
  // siempre a org_exercise_media, tanto para un ejercicio propio como para uno
  // del catálogo — así una org nunca escribe sobre la fila compartida.
  const { data: exercise } = await supabase
    .from("exercises")
    .select("id")
    .eq("id", exerciseId)
    .maybeSingle();
  if (!exercise) return { error: "No encontramos el ejercicio." };

  const columna = kind === "imagen" ? "imagen_path" : "video_path";

  const { data: previo } = await supabase
    .from("org_exercise_media")
    .select("imagen_path, video_path")
    .eq("org_id", orgId)
    .eq("exercise_id", exerciseId)
    .maybeSingle();
  const anterior = kind === "imagen" ? previo?.imagen_path : previo?.video_path;

  const { data: guardado, error } = await supabase
    .from("org_exercise_media")
    .upsert(
      { org_id: orgId, exercise_id: exerciseId, [columna]: path, updated_at: new Date().toISOString() },
      { onConflict: "org_id,exercise_id" },
    )
    .select("exercise_id");

  if (error) return { error: error.message };
  // Un upsert que RLS bloquea no da error, solo no toca filas (ver §0).
  if (!guardado || guardado.length === 0) return { error: "No pudimos guardar la media." };

  // El archivo viejo ya no lo referencia nadie: si no, el bucket se llena de
  // versiones huérfanas que igual se pagan.
  if (anterior && anterior !== path) {
    await supabase.storage.from(COACH_MEDIA_BUCKET).remove([anterior]);
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

  const { data: previo } = await supabase
    .from("org_exercise_media")
    .select("imagen_path, video_path")
    .eq("org_id", orgId)
    .eq("exercise_id", exerciseId)
    .maybeSingle();
  if (!previo) return {};

  const columna = kind === "imagen" ? "imagen_path" : "video_path";
  const actual = kind === "imagen" ? previo.imagen_path : previo.video_path;
  const otro = kind === "imagen" ? previo.video_path : previo.imagen_path;

  // Si al quitar esta no queda ninguna, se borra la fila entera en vez de
  // dejarla con las dos columnas en null.
  const { error } = otro
    ? await supabase
        .from("org_exercise_media")
        .update({ [columna]: null, updated_at: new Date().toISOString() })
        .eq("org_id", orgId)
        .eq("exercise_id", exerciseId)
    : await supabase
        .from("org_exercise_media")
        .delete()
        .eq("org_id", orgId)
        .eq("exercise_id", exerciseId);

  if (error) return { error: error.message };

  if (actual) {
    await supabase.storage.from(COACH_MEDIA_BUCKET).remove([actual]);
  }

  revalidatePath(`/dashboard/exercises/${exerciseId}`);
  revalidatePath("/dashboard/exercises");
  return {};
}
