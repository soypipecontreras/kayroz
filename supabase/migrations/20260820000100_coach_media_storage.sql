-- Bucket privado para la media que sube un coach (fotos y videos de técnica
-- de sus ejercicios y de sus rutinas).
--
-- Va aparte del bucket `exercise-media` que ya existía: ese es PÚBLICO y tiene
-- el catálogo global de la plataforma (los 45 ejercicios sembrados apuntan a
-- imágenes ahí; son dibujos genéricos, no hay nada que proteger). Este bucket
-- en cambio puede tener un video que el coach grabó para un cliente puntual
-- ("Juan, corregí la espalda así"), así que es privado y se sirve con URL
-- firmada que expira.
--
-- Convención de rutas: `{coach_id}/{uuid}.{ext}`. El primer segmento es la
-- frontera del tenant y es lo que verifican las policies de abajo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'coach-media',
  'coach-media',
  false,
  52428800, -- 50 MB: alcanza para un video de técnica de 1-2 min desde el celular
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
);

-- El coach escribe solo dentro de su propia carpeta.
create policy coach_media_insert_by_coach on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'coach-media'
    and (storage.foldername(name))[1] = public.auth_coach_id()::text
  );

create policy coach_media_update_by_coach on storage.objects
  for update to authenticated
  using (
    bucket_id = 'coach-media'
    and (storage.foldername(name))[1] = public.auth_coach_id()::text
  );

create policy coach_media_delete_by_coach on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'coach-media'
    and (storage.foldername(name))[1] = public.auth_coach_id()::text
  );

-- Lectura: el coach dueño, y los atletas de ese coach (necesitan ver el video
-- de técnica de la rutina que les asignaron). Un atleta de otro coach no
-- resuelve el mismo coach_id, así que no ve nada.
create policy coach_media_select_by_owner_or_athlete on storage.objects
  for select to authenticated
  using (
    bucket_id = 'coach-media'
    and (storage.foldername(name))[1] in (
      public.auth_coach_id()::text,
      public.auth_athlete_coach_id()::text
    )
  );
