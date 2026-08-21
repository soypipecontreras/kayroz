-- Reconstruida desde la base real (20 ago 2026): se había aplicado por MCP y
-- nunca se escribió como archivo. Ver §0 de CLAUDE.md.
--
-- Segunda tanda de dibujos propios. Mismo criterio que batch1.

update exercises set imagen_url = 'https://bnjjmnhyuiusrqhxzwoj.supabase.co/storage/v1/object/public/exercise-media/ejercicios/fondos-en-paralelas.png'
where nombre_canonico = 'Fondos en paralelas' and es_global;

update exercises set imagen_url = 'https://bnjjmnhyuiusrqhxzwoj.supabase.co/storage/v1/object/public/exercise-media/ejercicios/press-banca-con-mancuernas.png'
where nombre_canonico = 'Press banca con mancuernas' and es_global;

update exercises set imagen_url = 'https://bnjjmnhyuiusrqhxzwoj.supabase.co/storage/v1/object/public/exercise-media/ejercicios/press-banca.png'
where nombre_canonico = 'Press banca' and es_global;
