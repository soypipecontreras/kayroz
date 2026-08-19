-- Pivote a SaaS multi-tenant: coaches (entrenadores) con sus athletes (atletas).
-- Ver CLAUDE.md para el modelo de negocio completo.
--
-- La base es de pruebas (confirmado con el dueño del proyecto, sin usuarios reales
-- que preservar), así que esta migración limpia las tablas afectadas en vez de
-- hacer un backfill de coach_id. Se preserva el catálogo global de `exercises`
-- (es_global = true): esos ~90 ejercicios sembrados no dependen de ningún
-- usuario/coach y no hay razón para perderlos.
delete from sets;
delete from session_progress;
delete from routine_exercises;
delete from routine_cycles;
delete from workouts;
delete from routines;
delete from routine_drafts;
delete from body_metrics;
delete from reminder_log;
delete from exercises where not es_global;
delete from users;

-- ============================================================
-- coaches
-- ============================================================
create table coaches (
  id uuid primary key default gen_random_uuid(),
  -- identificador neutral de canal (número en formato E.164 para WhatsApp;
  -- si el canal cambia en el futuro, sigue siendo el mismo identificador).
  telefono text not null unique,
  nombre text,
  marca text,
  timezone text not null default 'America/Bogota',
  plan text not null default 'trial' check (plan in ('trial', 'starter', 'pro', 'elite')),
  estado text not null default 'activo' check (estado in ('activo', 'moroso', 'cancelado')),
  trial_termina_en date,
  created_at timestamptz not null default now()
);

alter table coaches enable row level security;

-- ============================================================
-- invite_codes: un coach los genera, un atleta los canjea una vez en /start.
-- ============================================================
create table invite_codes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  codigo text not null unique,
  usos_max integer not null default 1,
  usos_actuales integer not null default 0,
  expira_en timestamptz,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index invite_codes_coach_idx on invite_codes (coach_id);

alter table invite_codes enable row level security;

-- Canje atómico: PostgREST no soporta expresiones (usos_actuales + 1) en el
-- payload de un update, así que el incremento condicional necesita esta
-- función en vez de un read-then-write desde la app (carrera entre dos
-- atletas canjeando el mismo código al mismo tiempo). Vive en `public`
-- (no en `app`) porque PostgREST solo expone RPCs de los schemas en
-- api.schemas, y `app` no está en esa lista.
create or replace function public.redeem_invite_code(p_codigo text) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_coach_id uuid;
begin
  update public.invite_codes
  set usos_actuales = usos_actuales + 1
  where codigo = p_codigo
    and activo
    and usos_actuales < usos_max
    and (expira_en is null or expira_en > now())
  returning coach_id into v_coach_id;

  return v_coach_id; -- null si no se pudo canjear (no existe, agotado, vencido o inactivo)
end;
$$;

grant execute on function public.redeem_invite_code(text) to anon, authenticated;

-- ============================================================
-- Renombrar app.current_user_id() -> app.current_athlete_id(), agregar
-- app.current_coach_id(). Hay que tirar antes las policies que lo usan
-- (no se puede dropear una función con dependientes).
-- ============================================================
drop policy users_select_own on users;
drop policy users_update_own on users;
drop policy exercises_select on exercises;
drop policy exercises_insert_own on exercises;
drop policy exercises_update_own on exercises;
drop policy exercises_delete_own on exercises;
drop policy exercise_aliases_select on exercise_aliases;
drop policy exercise_aliases_insert_own on exercise_aliases;
drop policy routines_all_own on routines;
drop policy routine_exercises_all_own on routine_exercises;
drop policy routine_cycles_all_own on routine_cycles;
drop policy workouts_all_own on workouts;
drop policy sets_all_own on sets;
drop policy session_progress_all_own on session_progress;
drop policy body_metrics_all_own on body_metrics;
drop policy reminder_log_all_own on reminder_log;
drop policy routine_drafts_all_own on routine_drafts;

drop function app.current_user_id();

create or replace function app.current_athlete_id() returns uuid
language sql stable
set search_path = ''
as $$
  select nullif(current_setting('app.current_athlete_id', true), '')::uuid
$$;

create or replace function app.current_coach_id() returns uuid
language sql stable
set search_path = ''
as $$
  select nullif(current_setting('app.current_coach_id', true), '')::uuid
$$;

grant execute on function app.current_athlete_id() to anon, authenticated;
grant execute on function app.current_coach_id() to anon, authenticated;

-- ============================================================
-- users -> athletes
-- ============================================================
alter table users rename to athletes;

alter table athletes
  add column coach_id uuid references coaches(id) on delete cascade,
  add column estado text not null default 'activo' check (estado in ('activo', 'pausado', 'archivado')),
  add column ultima_sesion_en timestamptz;

alter table athletes alter column coach_id set not null;

-- un teléfono puede tener historial bajo más de un coach (si cambia de
-- entrenador), pero solo un registro activo a la vez: así el alta siempre
-- resuelve sin ambigüedad.
alter table athletes drop constraint users_telegram_id_key;
alter table athletes rename column telegram_id to telefono;
alter table athletes alter column telefono type text using telefono::text;
alter table athletes add constraint athletes_coach_telefono_unique unique (coach_id, telefono);
create unique index athletes_telefono_activo_idx on athletes (telefono) where estado = 'activo';

create policy athletes_select_own on athletes
  for select using (id = app.current_athlete_id());
create policy athletes_update_own on athletes
  for update using (id = app.current_athlete_id());
-- para el futuro panel del coach (fase posterior): puede leer a sus atletas.
create policy athletes_select_by_coach on athletes
  for select using (coach_id = app.current_coach_id());

create policy coaches_select_own on coaches
  for select using (id = app.current_coach_id());
create policy coaches_update_own on coaches
  for update using (id = app.current_coach_id());

create policy invite_codes_all_own on invite_codes
  for all using (coach_id = app.current_coach_id())
  with check (coach_id = app.current_coach_id());

-- ============================================================
-- exercises: catálogo por coach (compartido por todos sus atletas), antes
-- era por usuario individual.
-- ============================================================
alter table exercises rename column user_id to coach_id;
alter table exercises drop constraint exercises_user_id_fkey;
alter table exercises add constraint exercises_coach_id_fkey foreign key (coach_id) references coaches(id) on delete cascade;
alter index exercises_user_nombre_unique rename to exercises_coach_nombre_unique;

create policy exercises_select on exercises
  for select using (es_global or coach_id = app.current_coach_id());
create policy exercises_insert_own on exercises
  for insert with check (not es_global and coach_id = app.current_coach_id());
create policy exercises_update_own on exercises
  for update using (not es_global and coach_id = app.current_coach_id());
create policy exercises_delete_own on exercises
  for delete using (not es_global and coach_id = app.current_coach_id());

create policy exercise_aliases_select on exercise_aliases
  for select using (
    exists (
      select 1 from exercises e
      where e.id = exercise_aliases.exercise_id
        and (e.es_global or e.coach_id = app.current_coach_id())
    )
  );
create policy exercise_aliases_insert_own on exercise_aliases
  for insert with check (
    exists (
      select 1 from exercises e
      where e.id = exercise_aliases.exercise_id
        and not e.es_global
        and e.coach_id = app.current_coach_id()
    )
  );

-- ============================================================
-- Todo lo demás sigue siendo por-atleta: solo se renombra la columna dueña.
-- Mismo shape, misma lógica, ver plan de la Fase 1 para el porqué.
-- ============================================================
alter table routines rename column user_id to athlete_id;
alter index routines_user_idx rename to routines_athlete_idx;
create policy routines_all_own on routines
  for all using (athlete_id = app.current_athlete_id())
  with check (athlete_id = app.current_athlete_id());

create policy routine_exercises_all_own on routine_exercises
  for all using (
    exists (select 1 from routines r where r.id = routine_exercises.routine_id and r.athlete_id = app.current_athlete_id())
  )
  with check (
    exists (select 1 from routines r where r.id = routine_exercises.routine_id and r.athlete_id = app.current_athlete_id())
  );

create policy routine_cycles_all_own on routine_cycles
  for all using (
    exists (select 1 from routines r where r.routine_group_id = routine_cycles.routine_group_id and r.athlete_id = app.current_athlete_id())
  )
  with check (
    exists (select 1 from routines r where r.routine_group_id = routine_cycles.routine_group_id and r.athlete_id = app.current_athlete_id())
  );

alter table workouts rename column user_id to athlete_id;
alter index workouts_user_en_curso_unique rename to workouts_athlete_en_curso_unique;
alter index workouts_user_fecha_idx rename to workouts_athlete_fecha_idx;
create policy workouts_all_own on workouts
  for all using (athlete_id = app.current_athlete_id())
  with check (athlete_id = app.current_athlete_id());

create policy sets_all_own on sets
  for all using (
    exists (select 1 from workouts w where w.id = sets.workout_id and w.athlete_id = app.current_athlete_id())
  )
  with check (
    exists (select 1 from workouts w where w.id = sets.workout_id and w.athlete_id = app.current_athlete_id())
  );

create policy session_progress_all_own on session_progress
  for all using (
    exists (select 1 from workouts w where w.id = session_progress.workout_id and w.athlete_id = app.current_athlete_id())
  )
  with check (
    exists (select 1 from workouts w where w.id = session_progress.workout_id and w.athlete_id = app.current_athlete_id())
  );

alter table body_metrics rename column user_id to athlete_id;
create policy body_metrics_all_own on body_metrics
  for all using (athlete_id = app.current_athlete_id())
  with check (athlete_id = app.current_athlete_id());

alter table reminder_log rename column user_id to athlete_id;
create policy reminder_log_all_own on reminder_log
  for all using (athlete_id = app.current_athlete_id())
  with check (athlete_id = app.current_athlete_id());

alter table routine_drafts rename column user_id to athlete_id;
create policy routine_drafts_all_own on routine_drafts
  for all using (athlete_id = app.current_athlete_id())
  with check (athlete_id = app.current_athlete_id());
