-- Rutinas: plantillas reusables + media + campos que el esquema ya tenía pero
-- la UI nunca expuso (rpe_obj, descanso_seg, notas).
--
-- Hasta ahora una rutina colgaba de un athlete_id directo, así que un coach con
-- 20 atletas haciendo "Push A" tenía que cargarla 20 veces (deuda anotada en
-- §3 de CLAUDE.md). Estas tablas son la plantilla del coach; `routines` sigue
-- siendo la copia asignada a un atleta concreto — se copia, no se referencia,
-- para que editar la plantilla no altere retroactivamente lo que un atleta ya
-- venía entrenando.

create table routine_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  nombre text not null,
  descripcion text,
  created_at timestamptz not null default now()
);

create index routine_templates_coach_id_idx on routine_templates(coach_id);

create table routine_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references routine_templates(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  orden smallint not null,
  series_obj smallint not null,
  reps_min smallint not null,
  reps_max smallint,
  rpe_obj numeric check (rpe_obj >= 1 and rpe_obj <= 10),
  descanso_seg smallint,
  notas text,
  -- Override de media para este ejercicio dentro de esta plantilla: pisa lo
  -- que traiga el ejercicio del catálogo. Es una ruta dentro del bucket
  -- privado `coach-media`, no una URL — se firma al servirla.
  imagen_path text,
  video_path text
);

create index routine_template_exercises_template_id_idx on routine_template_exercises(template_id);

alter table routine_templates enable row level security;
alter table routine_template_exercises enable row level security;

-- Helper security definer: resuelve el coach del auth.uid() sin volver a
-- disparar RLS sobre `coaches`. Mismo patrón que auth_athlete_coach_id()
-- (20260819000400) — acá además lo van a usar las policies de storage, que se
-- evalúan una vez por archivo, así que conviene que sea barato y estable.
create or replace function public.auth_coach_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from coaches where auth_user_id = auth.uid() limit 1;
$$;

revoke all on function public.auth_coach_id() from public;
revoke execute on function public.auth_coach_id() from anon;
grant execute on function public.auth_coach_id() to authenticated;

create policy routine_templates_by_coach_auth on routine_templates
  for all using (coach_id = public.auth_coach_id())
  with check (coach_id = public.auth_coach_id());

create policy routine_template_exercises_by_coach_auth on routine_template_exercises
  for all using (
    exists (
      select 1 from routine_templates t
      where t.id = routine_template_exercises.template_id and t.coach_id = public.auth_coach_id()
    )
  )
  with check (
    exists (
      select 1 from routine_templates t
      where t.id = routine_template_exercises.template_id and t.coach_id = public.auth_coach_id()
    )
  );

-- Media en el catálogo de ejercicios. `imagen_url` (que ya existía) apunta al
-- bucket PÚBLICO `exercise-media` y es el catálogo global de la plataforma:
-- los 45 ejercicios sembrados ya tienen una imagen ahí y no se toca. Estas
-- columnas nuevas son para lo que sube un COACH, que va al bucket privado
-- `coach-media` y se sirve con URL firmada. Al renderizar: si hay
-- imagen_path/video_path se usa eso; si no, se cae a imagen_url.
alter table exercises
  add column imagen_path text,
  add column video_path text;

comment on column exercises.imagen_path is
  'Ruta dentro del bucket privado coach-media. Media subida por el coach, pisa a imagen_url. NULL en el catálogo global.';
comment on column exercises.video_path is
  'Ruta de video dentro del bucket privado coach-media. Subido por el coach.';

-- Override de media por ejercicio dentro de una rutina ya asignada.
alter table routine_exercises
  add column imagen_path text,
  add column video_path text;

-- El coach necesita poder editar y borrar rutinas ya asignadas: hasta ahora
-- routines solo tenía select e insert por auth.uid()
-- (20260816000000 / 20260816010000).
create policy routines_update_by_coach_auth on routines
  for update using (
    exists (
      select 1 from athletes a
      join coaches c on c.id = a.coach_id
      where a.id = routines.athlete_id and c.auth_user_id = auth.uid()
    )
  );

create policy routines_delete_by_coach_auth on routines
  for delete using (
    exists (
      select 1 from athletes a
      join coaches c on c.id = a.coach_id
      where a.id = routines.athlete_id and c.auth_user_id = auth.uid()
    )
  );
