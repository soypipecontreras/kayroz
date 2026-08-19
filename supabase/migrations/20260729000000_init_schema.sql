-- Gym Tracker Bot — esquema inicial
--
-- Supuesto de auth/RLS: el bot no usa Supabase Auth (no hay login, la identidad
-- es telegram_user_id). El webhook handler resuelve users.id a partir del
-- telegram_id y hace `select set_config('app.current_user_id', '<uuid>', true)`
-- al inicio de cada request antes de correr queries con un rol no-service.
-- Las operaciones normales del bot corren con `service_role` (bypassa RLS);
-- estas políticas son defensa en profundidad para cualquier acceso con
-- anon/authenticated. Si el patrón del bot de finanzas usa auth.uid() en vez
-- de esto, avisar para alinear.

create extension if not exists pgcrypto;

create schema if not exists app;

create or replace function app.current_user_id() returns uuid
language sql stable
set search_path = ''
as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

grant usage on schema app to anon, authenticated;
grant execute on function app.current_user_id() to anon, authenticated;

-- ============================================================
-- users
-- ============================================================
create table users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null unique,
  nombre text,
  unidad_peso text not null default 'kg' check (unidad_peso in ('kg', 'lb')),
  timezone text not null default 'America/Bogota',
  created_at timestamptz not null default now()
);

alter table users enable row level security;

create policy users_select_own on users
  for select using (id = app.current_user_id());
create policy users_update_own on users
  for update using (id = app.current_user_id());

-- ============================================================
-- exercises + aliases
-- ============================================================
create table exercises (
  id uuid primary key default gen_random_uuid(),
  nombre_canonico text not null,
  grupo_muscular text not null check (grupo_muscular in (
    'pecho', 'espalda', 'hombro', 'biceps', 'triceps', 'pierna', 'gluteo', 'core', 'cardio', 'otro'
  )),
  tipo text not null check (tipo in (
    'barra', 'mancuerna', 'maquina', 'cable', 'peso_corporal', 'banda', 'otro'
  )),
  es_global boolean not null default false,
  user_id uuid references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint exercises_global_scope check (
    (es_global and user_id is null) or (not es_global and user_id is not null)
  )
);

-- un solo ejercicio global con el mismo nombre canónico
create unique index exercises_global_nombre_unique
  on exercises (nombre_canonico)
  where es_global;

-- un usuario no puede duplicar el nombre de su propio ejercicio custom
create unique index exercises_user_nombre_unique
  on exercises (user_id, nombre_canonico)
  where not es_global;

alter table exercises enable row level security;

create policy exercises_select on exercises
  for select using (es_global or user_id = app.current_user_id());
create policy exercises_insert_own on exercises
  for insert with check (not es_global and user_id = app.current_user_id());
create policy exercises_update_own on exercises
  for update using (not es_global and user_id = app.current_user_id());
create policy exercises_delete_own on exercises
  for delete using (not es_global and user_id = app.current_user_id());

-- exercise_aliases evita que la data se fragmente (banca/bench/press plano -> mismo exercise_id).
-- normalización (minúsculas, sin tildes) se hace en la app antes de insertar/consultar.
create table exercise_aliases (
  id uuid primary key default gen_random_uuid(),
  alias text not null,
  exercise_id uuid not null references exercises(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index exercise_aliases_alias_idx on exercise_aliases (alias);

alter table exercise_aliases enable row level security;

create policy exercise_aliases_select on exercise_aliases
  for select using (
    exists (
      select 1 from exercises e
      where e.id = exercise_aliases.exercise_id
        and (e.es_global or e.user_id = app.current_user_id())
    )
  );
create policy exercise_aliases_insert_own on exercise_aliases
  for insert with check (
    exists (
      select 1 from exercises e
      where e.id = exercise_aliases.exercise_id
        and not e.es_global
        and e.user_id = app.current_user_id()
    )
  );

-- ============================================================
-- routines (versionadas — nunca se editan destructivamente)
-- ============================================================
create table routines (
  id uuid primary key default gen_random_uuid(),
  routine_group_id uuid not null default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  nombre text not null,
  dia_semana smallint check (dia_semana between 0 and 6),
  orden smallint,
  activa boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now()
);

-- routine_group_id agrupa versiones de "la misma" rutina a través del tiempo;
-- al editar, se inserta una fila nueva con el mismo routine_group_id y version+1,
-- y se marca la anterior activa=false. Así las sesiones viejas (workouts.routine_id)
-- siguen apuntando a la versión con la que se corrieron.
create unique index routines_group_activa_unique
  on routines (routine_group_id)
  where activa;

create index routines_user_idx on routines (user_id);

alter table routines enable row level security;

create policy routines_all_own on routines
  for all using (user_id = app.current_user_id())
  with check (user_id = app.current_user_id());

create table routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references routines(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  orden smallint not null,
  series_obj smallint not null,
  reps_min smallint not null,
  reps_max smallint,
  rpe_obj numeric(3,1) check (rpe_obj between 1 and 10),
  descanso_seg smallint,
  notas text,
  -- reps_max null = AMRAP / sin tope (ej. "Fondos 3xAMRAP")
  constraint routine_exercises_reps_range check (reps_max is null or reps_min <= reps_max)
);

create index routine_exercises_routine_idx on routine_exercises (routine_id, orden);

alter table routine_exercises enable row level security;

create policy routine_exercises_all_own on routine_exercises
  for all using (
    exists (select 1 from routines r where r.id = routine_exercises.routine_id and r.user_id = app.current_user_id())
  )
  with check (
    exists (select 1 from routines r where r.id = routine_exercises.routine_id and r.user_id = app.current_user_id())
  );

-- semana_actual sobrevive a las ediciones de la rutina, por eso se ancla a
-- routine_group_id (grupo lógico) y no a un routines.id de una versión puntual.
create table routine_cycles (
  routine_group_id uuid primary key,
  semana_actual smallint not null default 1,
  updated_at timestamptz not null default now()
);

alter table routine_cycles enable row level security;

create policy routine_cycles_all_own on routine_cycles
  for all using (
    exists (select 1 from routines r where r.routine_group_id = routine_cycles.routine_group_id and r.user_id = app.current_user_id())
  )
  with check (
    exists (select 1 from routines r where r.routine_group_id = routine_cycles.routine_group_id and r.user_id = app.current_user_id())
  );

-- ============================================================
-- workouts + sets + session_progress
-- ============================================================
create table workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  routine_id uuid references routines(id),
  fecha date not null default current_date,
  estado text not null default 'en_curso' check (estado in ('en_curso', 'cerrada')),
  duracion_seg integer,
  notas text,
  created_at timestamptz not null default now(),
  cerrado_en timestamptz
);

-- un usuario no puede tener dos sesiones abiertas a la vez: session_progress
-- solo tiene sentido si hay una única sesión 'en_curso' a la que volver.
create unique index workouts_user_en_curso_unique
  on workouts (user_id)
  where estado = 'en_curso';

create index workouts_user_fecha_idx on workouts (user_id, fecha desc);

alter table workouts enable row level security;

create policy workouts_all_own on workouts
  for all using (user_id = app.current_user_id())
  with check (user_id = app.current_user_id());

create table sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  orden smallint not null,
  peso numeric(6,2),
  reps smallint,
  rpe numeric(3,1) check (rpe between 1 and 10),
  es_pr boolean not null default false,
  fuera_de_rutina boolean not null default false,
  -- SIEMPRE el texto crudo tal cual lo escribió el usuario, para poder
  -- reprocesar el histórico cuando el parser mejore.
  raw_input text not null,
  created_at timestamptz not null default now()
);

create index sets_workout_idx on sets (workout_id, orden);
create index sets_exercise_idx on sets (exercise_id);

alter table sets enable row level security;

create policy sets_all_own on sets
  for all using (
    exists (select 1 from workouts w where w.id = sets.workout_id and w.user_id = app.current_user_id())
  )
  with check (
    exists (select 1 from workouts w where w.id = sets.workout_id and w.user_id = app.current_user_id())
  );

create table session_progress (
  workout_id uuid primary key references workouts(id) on delete cascade,
  exercise_index smallint not null default 0,
  updated_at timestamptz not null default now()
);

alter table session_progress enable row level security;

create policy session_progress_all_own on session_progress
  for all using (
    exists (select 1 from workouts w where w.id = session_progress.workout_id and w.user_id = app.current_user_id())
  )
  with check (
    exists (select 1 from workouts w where w.id = session_progress.workout_id and w.user_id = app.current_user_id())
  );

-- ============================================================
-- body_metrics (fase 2, pero la tabla no cuesta nada tenerla ya)
-- ============================================================
create table body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  fecha date not null default current_date,
  peso numeric(5,2),
  medidas jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, fecha)
);

alter table body_metrics enable row level security;

create policy body_metrics_all_own on body_metrics
  for all using (user_id = app.current_user_id())
  with check (user_id = app.current_user_id());

-- ============================================================
-- reminder_log: dedup de recordatorios cron (diario / empujón / semanal)
-- para que un cron corriendo cada N minutos (por timezone) no reenvíe el
-- mismo aviso dos veces el mismo día.
-- ============================================================
create table reminder_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  tipo text not null check (tipo in ('rutina_diaria', 'empujon_noche', 'reporte_semanal')),
  fecha date not null default current_date,
  sent_at timestamptz not null default now(),
  unique (user_id, tipo, fecha)
);

alter table reminder_log enable row level security;

create policy reminder_log_all_own on reminder_log
  for all using (user_id = app.current_user_id())
  with check (user_id = app.current_user_id());
