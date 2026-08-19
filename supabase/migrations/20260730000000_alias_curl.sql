-- "curl" a secas es el ejemplo canónico del CLAUDE.md (curl 20x12 @8) pero no
-- existía como alias — solo variantes compuestas (curl mancuernas, curl barra...).
-- Se asume la variante con mancuernas por ser la más común/accesible en gimnasios comerciales.
insert into exercise_aliases (alias, exercise_id)
select 'curl', id from exercises where nombre_canonico = 'Curl con mancuernas' and es_global;
