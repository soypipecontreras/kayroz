-- Bucket público para imágenes/GIFs de referencia de ejercicios.
-- Público de lectura porque el bot necesita una URL que Telegram pueda
-- descargar directamente (sendPhoto). La carga de archivos la hace un
-- admin/seed script con service_role o manualmente desde el dashboard de
-- Supabase, así que no se agregan policies de escritura para anon/authenticated.

insert into storage.buckets (id, name, public)
values ('exercise-media', 'exercise-media', true)
on conflict (id) do nothing;
