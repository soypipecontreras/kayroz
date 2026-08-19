"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  COACH_MEDIA_BUCKET,
  MAX_MEDIA_BYTES,
  buildMediaPath,
  mediaKind,
} from "@/lib/media";

// El archivo va directo del navegador al Storage de Supabase, no a través de un
// Server Action: un video de 50 MB por el server de Next sería lento y además
// choca con el bodySizeLimit por defecto. RLS igual aplica — las policies del
// bucket exigen que la ruta arranque con el coach_id del usuario logueado.
export default function MediaUploader({
  coachId,
  kind,
  currentPath,
  onSave,
  onRemove,
}: {
  coachId: string;
  kind: "imagen" | "video";
  currentPath: string | null;
  onSave: (path: string) => Promise<{ error?: string }>;
  onRemove: () => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const accept = (kind === "imagen" ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES).join(",");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > MAX_MEDIA_BYTES) {
      setError(`El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. El máximo son 50 MB.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (mediaKind(file.type) !== kind) {
      setError(kind === "imagen" ? "Elegí una imagen (jpg, png, webp o gif)." : "Elegí un video (mp4, webm o mov).");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const path = buildMediaPath(coachId, file.type);

    const { error: uploadError } = await supabase.storage
      .from(COACH_MEDIA_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setBusy(false);
      setError("No pudimos subir el archivo. Probá de nuevo.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const result = await onSave(path);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";

    if (result.error) {
      // La fila no se actualizó, así que el archivo recién subido queda
      // huérfano: lo borramos para no llenar el bucket de basura.
      await supabase.storage.from(COACH_MEDIA_BUCKET).remove([path]);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleRemove() {
    setBusy(true);
    setError(null);
    const result = await onRemove();
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="glass-input cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:border-white/40">
          {busy ? "Subiendo…" : currentPath ? `Cambiar ${kind}` : `Subir ${kind}`}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            disabled={busy}
            onChange={handleFile}
            className="hidden"
          />
        </label>
        {currentPath && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="text-sm text-muted underline underline-offset-4 transition-colors hover:text-red-400 disabled:opacity-40"
          >
            Quitar
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
