-- Biblioteca Kayroz (Fase H): plantillas de rutina GLOBALES de la plataforma,
-- listas para asignar o para que el atleta se las autoasigne desde
-- /app/recomendadas según su perfil (objetivo/nivel/disciplinas/dias_semana).
--
-- Mismo patrón que el catálogo global de ejercicios: `es_global = true` con
-- `org_id` NULL es una fila compartida por todas las organizaciones, solo
-- lectura para todo el mundo (nadie la edita desde el panel — se siembra por
-- migración). Asignarla sigue siendo COPIAR sus filas a routines/
-- routine_exercises, así que una org nunca depende de la plantilla viva.

-- ============================================================
-- 1. Alcance global en routine_templates
-- ============================================================

alter table routine_templates alter column org_id drop not null;

alter table routine_templates
  add column es_global boolean not null default false;

alter table routine_templates add constraint routine_templates_global_scope
  check ((es_global and org_id is null) or (not es_global and org_id is not null));

-- Lectura de las globales para cualquier usuario autenticado (staff Y
-- atletas — el recomendador corre en el portal del atleta). Las policies
-- `*_by_org` existentes no las alcanzan (org_id NULL nunca iguala a
-- auth_org_id()), así que las globales quedan de solo lectura de verdad:
-- ninguna policy de escritura las cubre.
create policy routine_templates_select_global on routine_templates
  for select to authenticated using (es_global);

create policy routine_template_exercises_select_global on routine_template_exercises
  for select to authenticated using (
    exists (
      select 1 from routine_templates t
      where t.id = routine_template_exercises.template_id and t.es_global
    )
  );

-- ============================================================
-- 2. Seed de la biblioteca
-- ============================================================
-- Cada bloque inserta una plantilla y sus ejercicios buscándolos por nombre
-- canónico. El RAISE final protege contra typos: si un nombre no matchea, el
-- join lo saltaría en silencio y la plantilla quedaría incompleta — mejor que
-- la migración explote acá y no en la casa de un atleta.

do $$
declare
  tid uuid;
  esperados int;
  insertados int;
begin
  -- ---------- GIMNASIO ----------

  insert into routine_templates (org_id, es_global, nombre, descripcion, disciplina, nivel, objetivo, modalidad, duracion_min, dias_semana)
  values (null, true, 'Cuerpo completo — Principiante',
          'Tres básicos y dos accesorios para construir el hábito y la base de fuerza. Pensada para repetirse 3 veces por semana dejando un día de descanso entre sesiones.',
          'gimnasio', 'principiante', 'salud_general', 'series', 60, 3)
  returning id into tid;
  insert into routine_template_exercises (template_id, exercise_id, orden, series_obj, reps_min, reps_max, rpe_obj, descanso_seg, notas)
  select tid, e.id, x.orden, x.series, x.rmin, x.rmax, x.rpe, x.descanso, x.notas
  from (values
    (1, 'Sentadilla',                    3,  8, 10, 7::numeric, 120, null),
    (2, 'Press banca',                   3,  8, 10, 7,          120, null),
    (3, 'Remo con barra',                3,  8, 10, 7,          120, null),
    (4, 'Press militar con mancuernas',  2, 10, 12, null,        90, null),
    (5, 'Plancha',                       3,  1,  1, null,        60, 'Aguantá 30-45 segundos por serie.')
  ) as x(orden, nombre, series, rmin, rmax, rpe, descanso, notas)
  join exercises e on e.es_global and e.nombre_canonico = x.nombre;
  select count(*) into insertados from routine_template_exercises where template_id = tid;
  if insertados <> 5 then raise exception 'Cuerpo completo: % de 5 ejercicios', insertados; end if;

  insert into routine_templates (org_id, es_global, nombre, descripcion, disciplina, nivel, objetivo, modalidad, duracion_min, dias_semana)
  values (null, true, 'Empuje (Push) — Intermedio',
          'Día de empuje de una división empuje/tirón/pierna: pecho, hombro y tríceps con progresión de carga en los básicos.',
          'gimnasio', 'intermedio', 'hipertrofia', 'series', 70, 4)
  returning id into tid;
  insert into routine_template_exercises (template_id, exercise_id, orden, series_obj, reps_min, reps_max, rpe_obj, descanso_seg, notas)
  select tid, e.id, x.orden, x.series, x.rmin, x.rmax, x.rpe, x.descanso, x.notas
  from (values
    (1, 'Press banca',                     4,  6,  8, 8::numeric, 150, null),
    (2, 'Press inclinado con mancuernas',  3,  8, 10, 8,          120, null),
    (3, 'Press militar',                   3,  6,  8, 8,          150, null),
    (4, 'Elevaciones laterales',           3, 12, 15, null,        60, null),
    (5, 'Extensión de tríceps en polea',   3, 10, 12, null,        60, null)
  ) as x(orden, nombre, series, rmin, rmax, rpe, descanso, notas)
  join exercises e on e.es_global and e.nombre_canonico = x.nombre;
  select count(*) into insertados from routine_template_exercises where template_id = tid;
  if insertados <> 5 then raise exception 'Push: % de 5 ejercicios', insertados; end if;

  insert into routine_templates (org_id, es_global, nombre, descripcion, disciplina, nivel, objetivo, modalidad, duracion_min, dias_semana)
  values (null, true, 'Tirón (Pull) — Intermedio',
          'Día de tirón: bisagra pesada, dominadas y remo, con el trabajo de brazo al final.',
          'gimnasio', 'intermedio', 'hipertrofia', 'series', 70, 4)
  returning id into tid;
  insert into routine_template_exercises (template_id, exercise_id, orden, series_obj, reps_min, reps_max, rpe_obj, descanso_seg, notas)
  select tid, e.id, x.orden, x.series, x.rmin, x.rmax, x.rpe, x.descanso, x.notas
  from (values
    (1, 'Peso muerto',           3,  5,  5, 8::numeric, 180, null),
    (2, 'Dominadas',             4,  6, 10, null,       120, 'Con lastre si llegás cómodo a 10.'),
    (3, 'Remo sentado en polea', 3, 10, 12, null,        90, null),
    (4, 'Curl con barra',        3,  8, 10, null,        60, null),
    (5, 'Curl martillo',         2, 10, 12, null,        60, null)
  ) as x(orden, nombre, series, rmin, rmax, rpe, descanso, notas)
  join exercises e on e.es_global and e.nombre_canonico = x.nombre;
  select count(*) into insertados from routine_template_exercises where template_id = tid;
  if insertados <> 5 then raise exception 'Pull: % de 5 ejercicios', insertados; end if;

  insert into routine_templates (org_id, es_global, nombre, descripcion, disciplina, nivel, objetivo, modalidad, duracion_min, dias_semana)
  values (null, true, 'Pierna — Intermedio',
          'Sentadilla pesada, bisagra y accesorios de cadena posterior y pantorrilla.',
          'gimnasio', 'intermedio', 'hipertrofia', 'series', 70, 4)
  returning id into tid;
  insert into routine_template_exercises (template_id, exercise_id, orden, series_obj, reps_min, reps_max, rpe_obj, descanso_seg, notas)
  select tid, e.id, x.orden, x.series, x.rmin, x.rmax, x.rpe, x.descanso, x.notas
  from (values
    (1, 'Sentadilla',            4,  6,  8, 8::numeric, 180, null),
    (2, 'Peso muerto rumano',    3,  8, 10, 8,          150, null),
    (3, 'Prensa de pierna',      3, 10, 12, null,        90, null),
    (4, 'Curl femoral',          3, 10, 12, null,        90, null),
    (5, 'Elevación de talones',  4, 12, 15, null,        60, null)
  ) as x(orden, nombre, series, rmin, rmax, rpe, descanso, notas)
  join exercises e on e.es_global and e.nombre_canonico = x.nombre;
  select count(*) into insertados from routine_template_exercises where template_id = tid;
  if insertados <> 5 then raise exception 'Pierna: % de 5 ejercicios', insertados; end if;

  insert into routine_templates (org_id, es_global, nombre, descripcion, disciplina, nivel, objetivo, modalidad, duracion_min, dias_semana)
  values (null, true, 'Fuerza 5×5 — Intermedio',
          'Tres levantamientos, cinco series de cinco. Subí el peso cuando completes las 25 repeticiones con técnica.',
          'gimnasio', 'intermedio', 'fuerza', 'series', 60, 3)
  returning id into tid;
  insert into routine_template_exercises (template_id, exercise_id, orden, series_obj, reps_min, reps_max, rpe_obj, descanso_seg, notas)
  select tid, e.id, x.orden, x.series, x.rmin, x.rmax, x.rpe, x.descanso, x.notas
  from (values
    (1, 'Sentadilla',     5, 5, 5, 8::numeric, 180, null),
    (2, 'Press banca',    5, 5, 5, 8,          180, null),
    (3, 'Remo con barra', 5, 5, 5, 8,          180, null)
  ) as x(orden, nombre, series, rmin, rmax, rpe, descanso, notas)
  join exercises e on e.es_global and e.nombre_canonico = x.nombre;
  select count(*) into insertados from routine_template_exercises where template_id = tid;
  if insertados <> 3 then raise exception '5x5: % de 3 ejercicios', insertados; end if;

  -- ---------- CALISTENIA ----------

  insert into routine_templates (org_id, es_global, nombre, descripcion, disciplina, nivel, objetivo, modalidad, duracion_min, dias_semana)
  values (null, true, 'Calistenia desde cero',
          'Los cinco patrones básicos con el peso del cuerpo. Sin equipamiento salvo una barra baja o mesa firme para el remo.',
          'calistenia', 'principiante', 'salud_general', 'series', 45, 3)
  returning id into tid;
  insert into routine_template_exercises (template_id, exercise_id, orden, series_obj, reps_min, reps_max, rpe_obj, descanso_seg, notas)
  select tid, e.id, x.orden, x.series, x.rmin, x.rmax, x.rpe, x.descanso, x.notas
  from (values
    (1, 'Flexiones',          3,  5, 10, null::numeric, 90, 'Si no salen, apoyá las rodillas o empujá desde una banca.'),
    (2, 'Remo invertido',     3,  5, 10, null,          90, null),
    (3, 'Sentadilla al aire', 3, 10, 15, null,          60, null),
    (4, 'Plancha',            3,  1,  1, null,          60, 'Aguantá 20-40 segundos por serie.'),
    (5, 'Puente de glúteo',   3, 12, 15, null,          60, null)
  ) as x(orden, nombre, series, rmin, rmax, rpe, descanso, notas)
  join exercises e on e.es_global and e.nombre_canonico = x.nombre;
  select count(*) into insertados from routine_template_exercises where template_id = tid;
  if insertados <> 5 then raise exception 'Calistenia cero: % de 5 ejercicios', insertados; end if;

  insert into routine_templates (org_id, es_global, nombre, descripcion, disciplina, nivel, objetivo, modalidad, duracion_min, dias_semana)
  values (null, true, 'Calistenia — Tirón y empuje',
          'Dominadas y fondos como básicos, pino y L-sit como trabajo de habilidad. Para quien ya hace varias dominadas estrictas.',
          'calistenia', 'intermedio', 'fuerza', 'series', 60, 3)
  returning id into tid;
  insert into routine_template_exercises (template_id, exercise_id, orden, series_obj, reps_min, reps_max, rpe_obj, descanso_seg, notas)
  select tid, e.id, x.orden, x.series, x.rmin, x.rmax, x.rpe, x.descanso, x.notas
  from (values
    (1, 'Dominadas',            4, 5,  8, null::numeric, 120, null),
    (2, 'Fondos en paralelas',  4, 6, 10, null,          120, null),
    (3, 'Flexiones de pino',    3, 3,  6, null,          120, 'Contra la pared. Si no salen, flexiones pica con pies elevados.'),
    (4, 'Remo invertido',       3, 8, 12, null,           90, null),
    (5, 'L-sit',                3, 1,  1, null,           90, 'Acumulá 15-30 segundos por serie, aunque sea en tramos.')
  ) as x(orden, nombre, series, rmin, rmax, rpe, descanso, notas)
  join exercises e on e.es_global and e.nombre_canonico = x.nombre;
  select count(*) into insertados from routine_template_exercises where template_id = tid;
  if insertados <> 5 then raise exception 'Calistenia tirón/empuje: % de 5 ejercicios', insertados; end if;

  -- ---------- CROSSFIT ----------

  insert into routine_templates (org_id, es_global, nombre, descripcion, disciplina, nivel, objetivo, modalidad, duracion_min, dias_semana)
  values (null, true, 'WOD Cindy — AMRAP 20′',
          'Benchmark clásico: tantas rondas como puedas en 20 minutos de 5 dominadas, 10 flexiones y 15 sentadillas al aire. Anotá las rondas completadas para comparar la próxima vez.',
          'crossfit', 'principiante', 'resistencia', 'amrap', 20, 3)
  returning id into tid;
  insert into routine_template_exercises (template_id, exercise_id, orden, series_obj, reps_min, reps_max, rpe_obj, descanso_seg, notas)
  select tid, e.id, x.orden, x.series, x.rmin, x.rmax, x.rpe, x.descanso, x.notas
  from (values
    (1, 'Dominadas',          1,  5,  5, null::numeric, null::int, 'Por ronda. Escalá con banda o remo invertido.'),
    (2, 'Flexiones',          1, 10, 10, null,          null,      'Por ronda. Escalá apoyando rodillas.'),
    (3, 'Sentadilla al aire', 1, 15, 15, null,          null,      'Por ronda.')
  ) as x(orden, nombre, series, rmin, rmax, rpe, descanso, notas)
  join exercises e on e.es_global and e.nombre_canonico = x.nombre;
  select count(*) into insertados from routine_template_exercises where template_id = tid;
  if insertados <> 3 then raise exception 'Cindy: % de 3 ejercicios', insertados; end if;

  insert into routine_templates (org_id, es_global, nombre, descripcion, disciplina, nivel, objetivo, modalidad, duracion_min, dias_semana)
  values (null, true, 'WOD Fran — 21-15-9',
          'El benchmark más famoso: thrusters y dominadas en rondas de 21, 15 y 9 repeticiones, por tiempo. Corto y brutal — elegí un peso que te deje moverte casi sin pausas.',
          'crossfit', 'intermedio', 'competencia', 'fortime', 15, 3)
  returning id into tid;
  insert into routine_template_exercises (template_id, exercise_id, orden, series_obj, reps_min, reps_max, rpe_obj, descanso_seg, notas)
  select tid, e.id, x.orden, x.series, x.rmin, x.rmax, x.rpe, x.descanso, x.notas
  from (values
    (1, 'Thruster',  3, 9, 21, null::numeric, null::int, 'Rondas de 21, 15 y 9 reps. RX: 43/30 kg.'),
    (2, 'Dominadas', 3, 9, 21, null,          null,      'Rondas de 21, 15 y 9 reps. Con kipping si lo manejás.')
  ) as x(orden, nombre, series, rmin, rmax, rpe, descanso, notas)
  join exercises e on e.es_global and e.nombre_canonico = x.nombre;
  select count(*) into insertados from routine_template_exercises where template_id = tid;
  if insertados <> 2 then raise exception 'Fran: % de 2 ejercicios', insertados; end if;

  insert into routine_templates (org_id, es_global, nombre, descripcion, disciplina, nivel, objetivo, modalidad, duracion_min, dias_semana)
  values (null, true, 'EMOM 20′ — Motor',
          'Cada minuto, al minuto: min 1 burpees, min 2 kettlebell swings, min 3 wall balls, min 4 saltos dobles, min 5 descanso. Cuatro vueltas. Lo que sobra de cada minuto es tu descanso.',
          'crossfit', 'principiante', 'resistencia', 'emom', 20, 3)
  returning id into tid;
  insert into routine_template_exercises (template_id, exercise_id, orden, series_obj, reps_min, reps_max, rpe_obj, descanso_seg, notas)
  select tid, e.id, x.orden, x.series, x.rmin, x.rmax, x.rpe, x.descanso, x.notas
  from (values
    (1, 'Burpee',           4, 10, 10, null::numeric, null::int, 'En su minuto, 4 vueltas.'),
    (2, 'Kettlebell swing', 4, 15, 15, null,          null,      'En su minuto, 4 vueltas.'),
    (3, 'Wall ball',        4, 12, 12, null,          null,      'En su minuto, 4 vueltas.'),
    (4, 'Saltos dobles',    4, 30, 30, null,          null,      'En su minuto, 4 vueltas. Escalá con 60 saltos simples.')
  ) as x(orden, nombre, series, rmin, rmax, rpe, descanso, notas)
  join exercises e on e.es_global and e.nombre_canonico = x.nombre;
  select count(*) into insertados from routine_template_exercises where template_id = tid;
  if insertados <> 4 then raise exception 'EMOM: % de 4 ejercicios', insertados; end if;

  -- ---------- HYROX ----------

  insert into routine_templates (org_id, es_global, nombre, descripcion, disciplina, nivel, objetivo, modalidad, duracion_min, dias_semana)
  values (null, true, 'Hyrox — Simulación de estaciones',
          'Las 8 estaciones oficiales en orden, con 1 km de carrera antes de cada una. Recortá distancias a la mitad si es tu primera simulación completa.',
          'hyrox', 'intermedio', 'competencia', 'circuito', 90, 2)
  returning id into tid;
  insert into routine_template_exercises (template_id, exercise_id, orden, series_obj, reps_min, reps_max, rpe_obj, descanso_seg, notas)
  select tid, e.id, x.orden, x.series, x.rmin, x.rmax, x.rpe, x.descanso, x.notas
  from (values
    (1, 'Carrera',                1,  1,  1, null::numeric, null::int, '1 km antes de CADA estación (8 km en total).'),
    (2, 'Ski ergómetro',          1,  1,  1, null,          null,      '1.000 m.'),
    (3, 'Empuje de trineo',       1,  1,  1, null,          null,      '50 m (4×12,5 m). Pesado.'),
    (4, 'Arrastre de trineo',     1,  1,  1, null,          null,      '50 m (4×12,5 m).'),
    (5, 'Burpee con salto largo', 1,  1,  1, null,          null,      '80 m.'),
    (6, 'Remo ergómetro',         1,  1,  1, null,          null,      '1.000 m.'),
    (7, 'Caminata del granjero',  1,  1,  1, null,          null,      '200 m con kettlebells.'),
    (8, 'Zancadas con saco',      1,  1,  1, null,          null,      '100 m con sandbag.'),
    (9, 'Wall ball',              1, 75, 100, null,         null,      '75-100 reps según categoría. Es la última estación: guardá piernas.')
  ) as x(orden, nombre, series, rmin, rmax, rpe, descanso, notas)
  join exercises e on e.es_global and e.nombre_canonico = x.nombre;
  select count(*) into insertados from routine_template_exercises where template_id = tid;
  if insertados <> 9 then raise exception 'Hyrox sim: % de 9 ejercicios', insertados; end if;

  insert into routine_templates (org_id, es_global, nombre, descripcion, disciplina, nivel, objetivo, modalidad, duracion_min, dias_semana)
  values (null, true, 'Hyrox — Base de motor y fuerza',
          'Sesión de entrada al mundo Hyrox: tramos cortos de carrera intercalados con las estaciones más accesibles, a ritmo sostenible.',
          'hyrox', 'principiante', 'resistencia', 'circuito', 50, 3)
  returning id into tid;
  insert into routine_template_exercises (template_id, exercise_id, orden, series_obj, reps_min, reps_max, rpe_obj, descanso_seg, notas)
  select tid, e.id, x.orden, x.series, x.rmin, x.rmax, x.rpe, x.descanso, x.notas
  from (values
    (1, 'Carrera',          4,  1,  1, null::numeric,  90, '500 m a ritmo cómodo por vuelta.'),
    (2, 'Kettlebell swing', 3, 15, 15, null,            60, null),
    (3, 'Zancadas con saco',3, 10, 10, null,            60, 'Por pierna. Empezá sin saco si hace falta.'),
    (4, 'Remo ergómetro',   3,  1,  1, null,            90, '500 m por serie.'),
    (5, 'Burpee',           3, 10, 10, null,            60, null)
  ) as x(orden, nombre, series, rmin, rmax, rpe, descanso, notas)
  join exercises e on e.es_global and e.nombre_canonico = x.nombre;
  select count(*) into insertados from routine_template_exercises where template_id = tid;
  if insertados <> 5 then raise exception 'Hyrox base: % de 5 ejercicios', insertados; end if;

  -- ---------- FUNCIONAL ----------

  insert into routine_templates (org_id, es_global, nombre, descripcion, disciplina, nivel, objetivo, modalidad, duracion_min, dias_semana)
  values (null, true, 'Circuito funcional 40′',
          'Cinco estaciones en circuito, 3 rondas, descansando 60 segundos entre rondas. Equipamiento mínimo: una pesa rusa.',
          'funcional', 'principiante', 'perdida_grasa', 'circuito', 40, 3)
  returning id into tid;
  insert into routine_template_exercises (template_id, exercise_id, orden, series_obj, reps_min, reps_max, rpe_obj, descanso_seg, notas)
  select tid, e.id, x.orden, x.series, x.rmin, x.rmax, x.rpe, x.descanso, x.notas
  from (values
    (1, 'Sentadilla al aire', 3, 15, 15, null::numeric, null::int, 'Circuito: pasá al siguiente sin descansar.'),
    (2, 'Flexiones',          3, 10, 10, null,          null,      null),
    (3, 'Escaladores',        3, 20, 20, null,          null,      '20 por pierna.'),
    (4, 'Kettlebell swing',   3, 12, 12, null,          null,      null),
    (5, 'Plancha',            3,  1,  1, null,           60,       '30 segundos. Al terminar, descansá 60 s y arrancá la siguiente ronda.')
  ) as x(orden, nombre, series, rmin, rmax, rpe, descanso, notas)
  join exercises e on e.es_global and e.nombre_canonico = x.nombre;
  select count(*) into insertados from routine_template_exercises where template_id = tid;
  if insertados <> 5 then raise exception 'Funcional: % de 5 ejercicios', insertados; end if;

  -- Cierre: verificación global de la biblioteca.
  select count(*) into esperados from routine_templates where es_global;
  if esperados <> 13 then raise exception 'Biblioteca: se esperaban 13 plantillas, hay %', esperados; end if;
end $$;
