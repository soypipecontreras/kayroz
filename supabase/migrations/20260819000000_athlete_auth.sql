-- Puente entre atletas y Supabase Auth, mismo patrón que coaches
-- (20260816000000_coach_auth.sql). El atleta llega por invitación del coach:
-- éste genera un link con token de activación, el atleta lo abre, crea su
-- password, y queda vinculado. A partir de acá el atleta entra bajo RLS real
-- (antes solo lo tocaba el bot con service_role) — primera vez que necesita
-- policies de escritura, no solo lectura.

alter table athletes
  add column auth_user_id uuid unique references auth.users(id) on delete set null,
  add column activation_token uuid unique,
  add column activation_expires_at timestamptz;

-- El atleta autenticado puede ver y actualizar su propia fila.
create policy athletes_select_own_by_athlete_auth on athletes
  for select using (auth_user_id = auth.uid());
create policy athletes_update_own_by_athlete_auth on athletes
  for update using (auth_user_id = auth.uid());

-- Catálogo de ejercicios: global o del coach del atleta.
create policy exercises_select_by_athlete_auth on exercises
  for select using (
    es_global or exists (
      select 1 from athletes a
      where a.coach_id = exercises.coach_id and a.auth_user_id = auth.uid()
    )
  );

-- Rutinas asignadas: solo lectura, el atleta no crea rutinas.
create policy routines_select_by_athlete_auth on routines
  for select using (
    exists (select 1 from athletes a where a.id = routines.athlete_id and a.auth_user_id = auth.uid())
  );
create policy routine_exercises_select_by_athlete_auth on routine_exercises
  for select using (
    exists (
      select 1 from routines r
      join athletes a on a.id = r.athlete_id
      where r.id = routine_exercises.routine_id and a.auth_user_id = auth.uid()
    )
  );

-- Entrenamientos y series: acá sí necesita escribir (a diferencia de las
-- policies _by_coach_auth, que hoy son todas de lectura).
create policy workouts_select_own_by_athlete_auth on workouts
  for select using (
    exists (select 1 from athletes a where a.id = workouts.athlete_id and a.auth_user_id = auth.uid())
  );
create policy workouts_insert_own_by_athlete_auth on workouts
  for insert with check (
    exists (select 1 from athletes a where a.id = workouts.athlete_id and a.auth_user_id = auth.uid())
  );
create policy workouts_update_own_by_athlete_auth on workouts
  for update using (
    exists (select 1 from athletes a where a.id = workouts.athlete_id and a.auth_user_id = auth.uid())
  );

create policy sets_select_own_by_athlete_auth on sets
  for select using (
    exists (
      select 1 from workouts w
      join athletes a on a.id = w.athlete_id
      where w.id = sets.workout_id and a.auth_user_id = auth.uid()
    )
  );
create policy sets_insert_own_by_athlete_auth on sets
  for insert with check (
    exists (
      select 1 from workouts w
      join athletes a on a.id = w.athlete_id
      where w.id = sets.workout_id and a.auth_user_id = auth.uid()
    )
  );
create policy sets_delete_own_by_athlete_auth on sets
  for delete using (
    exists (
      select 1 from workouts w
      join athletes a on a.id = w.athlete_id
      where w.id = sets.workout_id and a.auth_user_id = auth.uid()
    )
  );

-- Activación de cuenta: dos funciones security definer en vez de una policy
-- de select pública (una policy "activation_token is not null" dejaría
-- enumerar a cualquiera todos los atletas pendientes de activar). Ninguna
-- confía en un id pasado por parámetro — activate_athlete usa auth.uid() del
-- caller, así nunca se puede activar la cuenta de otro con un token ajeno.

create or replace function public.get_athlete_activation(p_token uuid)
returns table (nombre text, coach_marca text, coach_nombre text, valid boolean)
language sql
security definer
set search_path = public
as $$
  select
    a.nombre,
    c.marca as coach_marca,
    c.nombre as coach_nombre,
    (a.activation_token = p_token and a.activation_expires_at > now() and a.auth_user_id is null) as valid
  from athletes a
  join coaches c on c.id = a.coach_id
  where a.activation_token = p_token;
$$;

revoke all on function public.get_athlete_activation(uuid) from public;
grant execute on function public.get_athlete_activation(uuid) to anon, authenticated;

create or replace function public.activate_athlete(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_athlete_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update athletes
    set auth_user_id = auth.uid(),
        activation_token = null,
        activation_expires_at = null
    where activation_token = p_token
      and activation_expires_at > now()
      and auth_user_id is null
    returning id into v_athlete_id;

  if v_athlete_id is null then
    raise exception 'invalid or expired activation token';
  end if;

  return v_athlete_id;
end;
$$;

revoke all on function public.activate_athlete(uuid) from public;
grant execute on function public.activate_athlete(uuid) to authenticated;
