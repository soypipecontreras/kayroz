-- Reconstruida desde la base real (20 ago 2026): se había aplicado por MCP y
-- nunca se escribió como archivo. Ver §0 de CLAUDE.md.
--
-- Ícono genérico por `tipo` para todo ejercicio global que no tenga un dibujo
-- propio. El `where imagen_url is null` hace que no pise a los que sí lo
-- tienen (ver exercise_specific_images_batch1/2).

update exercises
set imagen_url = 'https://bnjjmnhyuiusrqhxzwoj.supabase.co/storage/v1/object/public/exercise-media/tipos/' || tipo || '.png'
where es_global = true and imagen_url is null;
