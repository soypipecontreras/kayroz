-- Bucket PÚBLICO para las imágenes de la web de cada org. Va aparte de
-- coach-media (privado, con URL firmada) porque una página pública no puede
-- servir imágenes que expiran: el link tiene que andar para cualquiera, sin
-- sesión y sin vencimiento.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  10485760, -- 10 MB: son fotos de una web, no videos
  array['image/jpeg', 'image/png', 'image/webp']
);

-- Escritura solo del dueño y solo dentro de su carpeta {org_id}/...
create policy site_media_insert_by_owner on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'site-media'
    and (storage.foldername(name))[1] = public.auth_org_id()::text
    and public.auth_org_role() = 'dueno'
  );

create policy site_media_update_by_owner on storage.objects
  for update to authenticated
  using (
    bucket_id = 'site-media'
    and (storage.foldername(name))[1] = public.auth_org_id()::text
    and public.auth_org_role() = 'dueno'
  );

create policy site_media_delete_by_owner on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'site-media'
    and (storage.foldername(name))[1] = public.auth_org_id()::text
    and public.auth_org_role() = 'dueno'
  );
