-- Reestructura de multi-tenancy: de "un coach = un tenant" a
-- "una organización = un tenant, con gente adentro y roles".
--
-- Motivo: el producto apunta a tres realidades distintas que antes no cabían en
-- el modelo — un gimnasio con varios entrenadores y recepcionistas, un
-- entrenador independiente con sus clientes, y una persona sola que entrena por
-- su cuenta. Las tres son la misma tabla `organizations` con distinto `tipo`;
-- lo que cambia es quién tiene acceso y con qué rol.
--
-- Se hace AHORA y no más adelante porque hoy hay 1 organización real y 0
-- rutinas/entrenos cargados: renombrar columnas y reescribir RLS con la base
-- vacía es barato, con clientes reales adentro sería una migración de datos.

-- ============================================================
-- 1. coaches -> organizations
-- ============================================================

alter table coaches rename to organizations;

alter table organizations
  add column tipo text not null default 'entrenador'
    check (tipo in ('gimnasio', 'entrenador', 'individual'));

comment on column organizations.tipo is
  'gimnasio = varias sedes y staff; entrenador = independiente con clientes; individual = persona que entrena sola (es dueña de su propia org).';

comment on column organizations.plan is
  'Suscripción a Kayroz (lo que esta org NOS paga). No confundir con membership_plans, que es lo que un gimnasio le cobra a sus socios.';

-- Postgres actualiza solo las expresiones de las policies al renombrar
-- columnas, así que los renames de abajo no rompen las policies existentes
-- (igual se reescriben todas más abajo).
alter table athletes rename column coach_id to org_id;
alter table exercises rename column coach_id to org_id;
alter table invite_codes rename column coach_id to org_id;
alter table routine_templates rename column coach_id to org_id;

-- ============================================================
-- 2. memberships: quién entra a una org y con qué rol
-- ============================================================
-- Solo para STAFF (dueño, entrenador, recepción). Los clientes siguen viviendo
-- en `athletes` con su propio flujo de activación, que ya funciona y está
-- probado — no tiene sentido migrarlo acá.

create table memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  -- null hasta que la persona activa su acceso, igual que athletes.
  auth_user_id uuid unique references auth.users(id) on delete set null,
  rol text not null check (rol in ('dueno', 'entrenador', 'recepcion')),
  nombre text,
  email text,
  estado text not null default 'activo' check (estado in ('activo', 'pausado')),
  activation_token uuid unique,
  activation_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index memberships_org_id_idx on memberships(org_id);

-- Un usuario pertenece a una sola org por ahora. Si más adelante hace falta que
-- un entrenador trabaje en dos gimnasios, esto se relaja y auth_org_id() pasa a
-- necesitar un selector de org activa — hoy sería complejidad sin caso de uso.
alter table memberships enable row level security;

-- Migra al dueño actual de cada org (antes coaches.auth_user_id).
insert into memberships (org_id, auth_user_id, rol, nombre)
select id, auth_user_id, 'dueno', nombre
from organizations
where auth_user_id is not null;

-- OJO con el orden: `drop column auth_user_id` va DESPUÉS de borrar todas las
-- policies que la referencian (sección 5). Postgres se niega si no, y como la
-- migración es transaccional, el intento entero se revierte.

-- ============================================================
-- 3. Helpers de identidad (security definer, no re-disparan RLS)
-- ============================================================
-- Mismo patrón que auth_athlete_coach_id() en 20260819000400: sin esto, una
-- policy que subconsulta memberships y otra que subconsulta organizations se
-- muerden la cola y Postgres tira "infinite recursion detected in policy".

create or replace function public.auth_org_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select org_id from memberships
  where auth_user_id = auth.uid() and estado = 'activo'
  limit 1;
$$;

create or replace function public.auth_org_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select rol from memberships
  where auth_user_id = auth.uid() and estado = 'activo'
  limit 1;
$$;

-- Reemplaza a auth_athlete_coach_id() (mismo cuerpo, nombre nuevo por el
-- rename de la columna). La vieja se borra al final.
create or replace function public.auth_athlete_org_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select org_id from athletes where auth_user_id = auth.uid() limit 1;
$$;

-- Puede escribir cosas de plata (planes, pagos, productos): dueño y recepción.
-- Un entrenador ve a sus atletas, no la caja del gimnasio.
create or replace function public.auth_can_manage_money()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(public.auth_org_role() in ('dueno', 'recepcion'), false);
$$;

revoke all on function public.auth_org_id() from public;
revoke all on function public.auth_org_role() from public;
revoke all on function public.auth_athlete_org_id() from public;
revoke all on function public.auth_can_manage_money() from public;
revoke execute on function public.auth_org_id() from anon;
revoke execute on function public.auth_org_role() from anon;
revoke execute on function public.auth_athlete_org_id() from anon;
revoke execute on function public.auth_can_manage_money() from anon;
grant execute on function public.auth_org_id() to authenticated;
grant execute on function public.auth_org_role() to authenticated;
grant execute on function public.auth_athlete_org_id() to authenticated;
grant execute on function public.auth_can_manage_money() to authenticated;

-- ============================================================
-- 4. Fuera las policies muertas de app.current_*()
-- ============================================================
-- Estas exigían un set_config() que NINGÚN código llama (el bot corre con
-- service_role, que saltea RLS entero). Eran "defensa en profundidad" solo en
-- el papel, y en la práctica hicieron daño: al ver `exercises_update_own` en la
-- lista di por hecho que el update estaba permitido, y en realidad el panel
-- nunca la satisface — el UPDATE devolvía 200 sin escribir nada (ver §0).
-- Mejor ninguna policy que una que miente.

drop policy if exists athletes_select_by_coach on athletes;
drop policy if exists athletes_select_own on athletes;
drop policy if exists athletes_update_own on athletes;
drop policy if exists coaches_select_own on organizations;
drop policy if exists coaches_update_own on organizations;
drop policy if exists exercises_select on exercises;
drop policy if exists exercises_insert_own on exercises;
drop policy if exists exercises_update_own on exercises;
drop policy if exists exercises_delete_own on exercises;
drop policy if exists exercise_aliases_select on exercise_aliases;
drop policy if exists exercise_aliases_insert_own on exercise_aliases;
drop policy if exists invite_codes_all_own on invite_codes;
drop policy if exists routines_all_own on routines;
drop policy if exists routine_exercises_all_own on routine_exercises;
drop policy if exists routine_cycles_all_own on routine_cycles;
drop policy if exists routine_drafts_all_own on routine_drafts;
drop policy if exists workouts_all_own on workouts;
drop policy if exists sets_all_own on sets;
drop policy if exists session_progress_all_own on session_progress;
drop policy if exists body_metrics_all_own on body_metrics;
drop policy if exists reminder_log_all_own on reminder_log;

-- ============================================================
-- 5. Policies viejas basadas en coaches.auth_user_id
-- ============================================================
-- La columna ya no existe, así que hay que reescribirlas todas contra
-- auth_org_id().

drop policy if exists coaches_select_by_auth on organizations;
drop policy if exists coaches_update_by_auth on organizations;
drop policy if exists coaches_insert_by_auth on organizations;
drop policy if exists coaches_select_by_athlete_auth on organizations;
drop policy if exists athletes_select_by_coach_auth on athletes;
drop policy if exists athletes_insert_by_coach_auth on athletes;
drop policy if exists athletes_update_by_coach_auth on athletes;
drop policy if exists exercises_select_by_coach_auth on exercises;
drop policy if exists exercises_insert_by_coach_auth on exercises;
drop policy if exists exercises_update_by_coach_auth on exercises;
drop policy if exists exercises_select_by_athlete_auth on exercises;
drop policy if exists invite_codes_by_coach_auth on invite_codes;
drop policy if exists routines_select_by_coach_auth on routines;
drop policy if exists routines_insert_by_coach_auth on routines;
drop policy if exists routines_update_by_coach_auth on routines;
drop policy if exists routines_delete_by_coach_auth on routines;
drop policy if exists routine_exercises_by_coach_auth on routine_exercises;
drop policy if exists routine_templates_by_coach_auth on routine_templates;
drop policy if exists routine_template_exercises_by_coach_auth on routine_template_exercises;
drop policy if exists workouts_select_by_coach_auth on workouts;
drop policy if exists sets_select_by_coach_auth on sets;

-- Recién ahora que nada la referencia: memberships pasa a ser la única fuente
-- de verdad del acceso a una org.
alter table organizations drop column auth_user_id;

-- ============================================================
-- 6. Policies nuevas
-- ============================================================

-- memberships: el staff de la org se ve entre sí; solo el dueño da de alta o baja.
create policy memberships_select_by_org on memberships
  for select using (org_id = public.auth_org_id());
create policy memberships_write_by_owner on memberships
  for all using (org_id = public.auth_org_id() and public.auth_org_role() = 'dueno')
  with check (org_id = public.auth_org_id() and public.auth_org_role() = 'dueno');

-- organizations
create policy organizations_select_by_member on organizations
  for select using (id = public.auth_org_id() or id = public.auth_athlete_org_id());
create policy organizations_update_by_owner on organizations
  for update using (id = public.auth_org_id() and public.auth_org_role() = 'dueno')
  with check (id = public.auth_org_id() and public.auth_org_role() = 'dueno');
-- El insert lo hace el onboarding: cualquier usuario autenticado puede crear su
-- org (después se le crea el membership de dueño en la misma transacción).
create policy organizations_insert_by_authenticated on organizations
  for insert to authenticated with check (true);

-- athletes: el staff ve/edita los de su org; el atleta, lo suyo.
create policy athletes_select_by_org on athletes
  for select using (org_id = public.auth_org_id());
create policy athletes_insert_by_org on athletes
  for insert with check (org_id = public.auth_org_id());
create policy athletes_update_by_org on athletes
  for update using (org_id = public.auth_org_id())
  with check (org_id = public.auth_org_id());
create policy athletes_select_own on athletes
  for select using (auth_user_id = auth.uid());
create policy athletes_update_own on athletes
  for update using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- exercises: catálogo global + los de la org. Nadie edita los globales.
create policy exercises_select_by_org on exercises
  for select using (
    es_global or org_id = public.auth_org_id() or org_id = public.auth_athlete_org_id()
  );
create policy exercises_insert_by_org on exercises
  for insert with check (not es_global and org_id = public.auth_org_id());
create policy exercises_update_by_org on exercises
  for update using (not es_global and org_id = public.auth_org_id())
  with check (not es_global and org_id = public.auth_org_id());
create policy exercises_delete_by_org on exercises
  for delete using (not es_global and org_id = public.auth_org_id());

create policy exercise_aliases_select on exercise_aliases
  for select using (
    exists (
      select 1 from exercises e
      where e.id = exercise_aliases.exercise_id
        and (e.es_global or e.org_id = public.auth_org_id() or e.org_id = public.auth_athlete_org_id())
    )
  );

create policy invite_codes_by_org on invite_codes
  for all using (org_id = public.auth_org_id())
  with check (org_id = public.auth_org_id());

-- routines / routine_exercises
create policy routines_by_org on routines
  for all using (
    exists (select 1 from athletes a where a.id = routines.athlete_id and a.org_id = public.auth_org_id())
  )
  with check (
    exists (select 1 from athletes a where a.id = routines.athlete_id and a.org_id = public.auth_org_id())
  );
create policy routines_select_own_by_athlete on routines
  for select using (
    exists (select 1 from athletes a where a.id = routines.athlete_id and a.auth_user_id = auth.uid())
  );
-- La persona que entrena sola se arma sus propias rutinas.
create policy routines_write_own_by_athlete on routines
  for all using (
    exists (select 1 from athletes a where a.id = routines.athlete_id and a.auth_user_id = auth.uid())
  )
  with check (
    exists (select 1 from athletes a where a.id = routines.athlete_id and a.auth_user_id = auth.uid())
  );

create policy routine_exercises_by_org on routine_exercises
  for all using (
    exists (
      select 1 from routines r join athletes a on a.id = r.athlete_id
      where r.id = routine_exercises.routine_id and a.org_id = public.auth_org_id()
    )
  )
  with check (
    exists (
      select 1 from routines r join athletes a on a.id = r.athlete_id
      where r.id = routine_exercises.routine_id and a.org_id = public.auth_org_id()
    )
  );
create policy routine_exercises_by_athlete on routine_exercises
  for all using (
    exists (
      select 1 from routines r join athletes a on a.id = r.athlete_id
      where r.id = routine_exercises.routine_id and a.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from routines r join athletes a on a.id = r.athlete_id
      where r.id = routine_exercises.routine_id and a.auth_user_id = auth.uid()
    )
  );

-- routine_templates
create policy routine_templates_by_org on routine_templates
  for all using (org_id = public.auth_org_id())
  with check (org_id = public.auth_org_id());
create policy routine_template_exercises_by_org on routine_template_exercises
  for all using (
    exists (
      select 1 from routine_templates t
      where t.id = routine_template_exercises.template_id and t.org_id = public.auth_org_id()
    )
  )
  with check (
    exists (
      select 1 from routine_templates t
      where t.id = routine_template_exercises.template_id and t.org_id = public.auth_org_id()
    )
  );

-- workouts / sets: el staff de la org los lee; el atleta lee y escribe los suyos
-- (las policies del atleta de 20260819000000 siguen vivas, solo se rehace la del staff).
create policy workouts_select_by_org on workouts
  for select using (
    exists (select 1 from athletes a where a.id = workouts.athlete_id and a.org_id = public.auth_org_id())
  );
create policy sets_select_by_org on sets
  for select using (
    exists (
      select 1 from workouts w join athletes a on a.id = w.athlete_id
      where w.id = sets.workout_id and a.org_id = public.auth_org_id()
    )
  );

-- ============================================================
-- 7. Storage: el bucket privado pasa a ser por org
-- ============================================================

drop policy if exists coach_media_insert_by_coach on storage.objects;
drop policy if exists coach_media_update_by_coach on storage.objects;
drop policy if exists coach_media_delete_by_coach on storage.objects;
drop policy if exists coach_media_select_by_owner_or_athlete on storage.objects;

create policy org_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'coach-media'
    and (storage.foldername(name))[1] = public.auth_org_id()::text
  );
create policy org_media_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'coach-media'
    and (storage.foldername(name))[1] = public.auth_org_id()::text
  );
create policy org_media_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'coach-media'
    and (storage.foldername(name))[1] = public.auth_org_id()::text
  );
create policy org_media_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'coach-media'
    and (storage.foldername(name))[1] in (
      public.auth_org_id()::text,
      public.auth_athlete_org_id()::text
    )
  );

-- ============================================================
-- 8. Activación de staff + limpieza
-- ============================================================

create or replace function public.get_membership_activation(p_token uuid)
returns table (nombre text, rol text, org_marca text, valid boolean)
language sql
security definer
set search_path = public
as $$
  select
    m.nombre,
    m.rol,
    o.marca as org_marca,
    (m.activation_token = p_token and m.activation_expires_at > now() and m.auth_user_id is null) as valid
  from memberships m
  join organizations o on o.id = m.org_id
  where m.activation_token = p_token;
$$;

revoke all on function public.get_membership_activation(uuid) from public;
grant execute on function public.get_membership_activation(uuid) to anon, authenticated;

create or replace function public.activate_membership(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update memberships
    set auth_user_id = auth.uid(),
        activation_token = null,
        activation_expires_at = null
    where activation_token = p_token
      and activation_expires_at > now()
      and auth_user_id is null
    returning id into v_id;

  if v_id is null then
    raise exception 'invalid or expired activation token';
  end if;

  return v_id;
end;
$$;

revoke all on function public.activate_membership(uuid) from public;
revoke execute on function public.activate_membership(uuid) from anon;
grant execute on function public.activate_membership(uuid) to authenticated;

-- La vieja quedó sin uso (la columna que leía se llama org_id ahora y hay
-- función nueva con el nombre correcto).
drop function if exists public.auth_athlete_coach_id();
drop function if exists public.auth_coach_id();
