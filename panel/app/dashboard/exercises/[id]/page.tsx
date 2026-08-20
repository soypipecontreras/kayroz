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
    .select("id, nombre_canonico, grupo_muscular, tipo, instrucciones, es_global, org_id, imagen_url")
    .eq("id", id)
    .maybeSingle();
  if (!exercise) notFound();

  // La media propia de esta org sobre este ejercicio. Vive aparte de la fila
  // del ejercicio para que un gimnasio pueda ponerle su video a "Press banca"
  // (que es del catálogo compartido) sin que lo vean los demás.
  const { data: media } = await supabase
    .from("org_exercise_media")
    .select("imagen_path, video_path")
    .eq("org_id", org.orgId)
    .eq("exercise_id", id)
    .maybeSingle();

  const firmadas = await signMediaPaths(supabase, [media?.imagen_path, media?.video_path]);
  // La imagen del catálogo global es el último recurso: si la org subió la
  // suya, gana la suya.
  const imagenSrc = media?.imagen_path ? firmadas.get(media.imagen_path) : exercise.imagen_url;
  const videoSrc = media?.video_path ? firmadas.get(media.video_path) : null;

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
        <MediaUploader
          orgId={org.orgId}
          kind="imagen"
          currentPath={media?.imagen_path ?? null}
          onSave={setExerciseMedia.bind(null, exercise.id, "imagen")}
          onRemove={removeExerciseMedia.bind(null, exercise.id, "imagen")}
        />
      </section>

      <section className="glass rounded-3xl p-7 sm:p-8">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">Video de técnica</h2>
        {videoSrc ? (
          <video src={videoSrc} controls playsInline className="mb-4 max-h-80 w-full rounded-2xl border border-divider" />
        ) : (
          <p className="mb-4 text-sm text-muted">Sin video todavía.</p>
        )}
        <MediaUploader
          orgId={org.orgId}
          kind="video"
          currentPath={media?.video_path ?? null}
          onSave={setExerciseMedia.bind(null, exercise.id, "video")}
          onRemove={removeExerciseMedia.bind(null, exercise.id, "video")}
        />
        <p className="mt-4 text-sm text-muted">
          Hasta 50 MB, en mp4, webm o mov. Se guarda en tu propio espacio y solo lo ven vos y tus
          clientes — el link vence, así que no queda dando vueltas.
          {exercise.es_global && " Tu video solo lo ves vos, no los demás gimnasios."}
        </p>
      </section>
    </div>
  );
}
