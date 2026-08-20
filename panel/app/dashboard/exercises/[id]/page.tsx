import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { signMediaPaths } from "@/lib/media";
import MediaUploader from "../MediaUploader";
import { setExerciseMedia, removeExerciseMedia } from "../actions";

export default async function ExerciseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const org = await getOrgContext(supabase);

  const { data: exercise } = await supabase
    .from("exercises")
    .select("id, nombre_canonico, grupo_muscular, tipo, instrucciones, es_global, org_id, imagen_url, imagen_path, video_path")
    .eq("id", id)
    .maybeSingle();
  if (!exercise) notFound();

  const esPropio = !exercise.es_global && exercise.org_id === org.orgId;
  const signed = await signMediaPaths(supabase, [exercise.imagen_path, exercise.video_path]);
  const imagenSrc = exercise.imagen_path ? signed.get(exercise.imagen_path) : exercise.imagen_url;
  const videoSrc = exercise.video_path ? signed.get(exercise.video_path) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/exercises" className="text-sm text-muted underline underline-offset-4">
          ← Ejercicios
        </Link>
        <h1 className="mb-1 mt-3 text-2xl font-semibold tracking-tight">{exercise.nombre_canonico}</h1>
        <p className="text-sm text-muted">
          {exercise.grupo_muscular} · {exercise.tipo}
          {exercise.es_global && " · catálogo global"}
        </p>
        {exercise.instrucciones && <p className="mt-2 text-sm text-muted">{exercise.instrucciones}</p>}
      </div>

      <section className="glass rounded-3xl p-7 sm:p-8">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">Foto</h2>
        {imagenSrc ? (
          // URL firmada que rota en cada render: next/image la re-optimizaría al
          // pedo y encima cachearía una URL que expira.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagenSrc}
            alt={exercise.nombre_canonico}
            className="mb-4 max-h-64 rounded-2xl border border-divider object-contain"
          />
        ) : (
          <p className="mb-4 text-sm text-muted">Sin foto todavía.</p>
        )}
        {esPropio ? (
          <MediaUploader
            orgId={org.orgId}
            kind="imagen"
            currentPath={exercise.imagen_path}
            onSave={setExerciseMedia.bind(null, exercise.id, "imagen")}
            onRemove={removeExerciseMedia.bind(null, exercise.id, "imagen")}
          />
        ) : (
          <p className="text-sm text-muted">
            Este ejercicio es del catálogo global, no se puede editar su media. Si querés uno con tu
            propia foto o video, creá un ejercicio propio.
          </p>
        )}
      </section>

      <section className="glass rounded-3xl p-7 sm:p-8">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">Video de técnica</h2>
        {videoSrc ? (
          <video src={videoSrc} controls playsInline className="mb-4 max-h-80 w-full rounded-2xl border border-divider" />
        ) : (
          <p className="mb-4 text-sm text-muted">Sin video todavía.</p>
        )}
        {esPropio && (
          <MediaUploader
            orgId={org.orgId}
            kind="video"
            currentPath={exercise.video_path}
            onSave={setExerciseMedia.bind(null, exercise.id, "video")}
            onRemove={removeExerciseMedia.bind(null, exercise.id, "video")}
          />
        )}
      </section>
    </div>
  );
}
