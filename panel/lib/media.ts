import type { createClient } from "@/lib/supabase/server";

// Bucket privado con la media que sube el coach. El catálogo global de la
// plataforma vive aparte en `exercise-media`, que es público — ver
// supabase/migrations/20260820000100_coach_media_storage.sql.
export const COACH_MEDIA_BUCKET = "coach-media";

export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

// Una hora: suficiente para ver la ficha o entrenar con el video abierto, y
// corto para que un link filtrado no sirva indefinidamente.
const SIGNED_URL_TTL_SECONDS = 60 * 60;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export function mediaKind(mimeType: string): "imagen" | "video" | null {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return "imagen";
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return "video";
  return null;
}

export function extensionFor(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };
  return map[mimeType] ?? "bin";
}

// El primer segmento de la ruta es la frontera del tenant: las policies de
// storage.objects comparan ese folder contra auth_coach_id(). Si esto cambia,
// hay que cambiar la migración también.
export function buildMediaPath(coachId: string, mimeType: string): string {
  return `${coachId}/${crypto.randomUUID()}.${extensionFor(mimeType)}`;
}

// Firma varias rutas de una sola vez. Las rutas nulas se ignoran, y el mapa
// devuelto solo trae las que se pudieron firmar — así el caller cae al
// fallback (imagen_url del catálogo global) sin tener que distinguir errores.
export async function signMediaPaths(
  supabase: SupabaseServerClient,
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase.storage
    .from(COACH_MEDIA_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return new Map();

  const result = new Map<string, string>();
  for (const row of data) {
    if (row.signedUrl && row.path) result.set(row.path, row.signedUrl);
  }
  return result;
}
