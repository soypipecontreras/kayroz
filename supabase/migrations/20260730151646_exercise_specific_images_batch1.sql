-- Reconstruida desde la base real (20 ago 2026): se había aplicado por MCP y
-- nunca se escribió como archivo. Ver §0 de CLAUDE.md.
--
-- Dibujos propios para ejercicios puntuales, que pisan al ícono genérico por
-- tipo. Corre DESPUÉS de set_exercise_type_icons, así que asigna sin condición.

update exercises
set imagen_url = 'https://bnjjmnhyuiusrqhxzwoj.supabase.co/storage/v1/object/public/exercise-media/ejercicios/contractor.png'
where nombre_canonico = 'Contractor' and es_global;

update exercises
set imagen_url = 'https://bnjjmnhyuiusrqhxzwoj.supabase.co/storage/v1/object/public/exercise-media/ejercicios/aperturas-con-mancuernas.png'
where nombre_canonico = 'Aperturas con mancuernas' and es_global;

-- "peck deck" (con k) es un error ortográfico común de "pec deck" que ya
-- estaba como alias de Contractor — se agrega la variante mal escrita también,
-- porque el matching es exacto (sin tolerancia a typos).
insert into exercise_aliases (alias, exercise_id)
select 'peck deck', id from exercises where nombre_canonico = 'Contractor' and es_global
  and not exists (
    select 1 from exercise_aliases ea join exercises e2 on e2.id = ea.exercise_id
    where ea.alias = 'peck deck' and e2.nombre_canonico = 'Contractor'
  );
