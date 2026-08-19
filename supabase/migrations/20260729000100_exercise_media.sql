-- Campos para mostrar contexto visual y de ejecución de cada ejercicio,
-- pensado para mostrarse en el bot antes de la primera serie de un ejercicio
-- en la sesión guiada (ver "Última vez / Sugerido" en CLAUDE.md).

alter table exercises
  add column instrucciones text,
  add column imagen_url text;

comment on column exercises.instrucciones is
  'Explicación breve (1 frase) de cómo ejecutar el ejercicio. Tono directo, sin relleno.';
comment on column exercises.imagen_url is
  'URL pública de una imagen/GIF de referencia (Supabase Storage u otra fuente con licencia verificada). NULL hasta que se cargue — ver README de seed para el proceso.';
