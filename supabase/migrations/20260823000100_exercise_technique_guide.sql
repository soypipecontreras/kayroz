-- Guía de técnica para los 45 ejercicios del catálogo global.
--
-- `instrucciones` (una frase) se queda como estaba: es la línea corta que
-- acompaña al ejercicio dentro de la rutina. Estas columnas son la explicación
-- larga, y van separadas en vez de un solo texto con formato porque cada parte
-- se renderiza distinto (preparación y ejecución como párrafo, errores como
-- lista) y así no hay que parsear markdown.
--
-- El contenido en sí se cargó con un UPDATE masivo contra la base (ver el
-- commit "Guía de técnica escrita para los 45 ejercicios"). Si hace falta
-- reproducirlo en un entorno limpio, exportarlo con:
--   select nombre_canonico, preparacion, ejecucion, errores
--   from exercises where es_global and preparacion is not null;

alter table exercises
  add column if not exists preparacion text,
  add column if not exists ejecucion text,
  add column if not exists errores text[];

comment on column exercises.preparacion is
  'Cómo pararse / acomodarse antes de la primera repetición.';
comment on column exercises.ejecucion is
  'El movimiento en sí, incluyendo respiración y tempo.';
comment on column exercises.errores is
  'Errores típicos, redactados como "qué hacer" y no solo como reproche.';
