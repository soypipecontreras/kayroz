-- Puente entre la identidad del bot (teléfono) y Supabase Auth (panel web).
-- Un coach puede llegar por cualquiera de los dos canales primero, así que
-- ninguno de los dos identificadores es obligatorio por sí solo — ver §0/§9
-- de CLAUDE.md ("Panel web del coach").
alter table coaches
  add column auth_user_id uuid unique references auth.users(id) on delete set null;

alter table coaches alter column telefono drop not null;

-- Policies nuevas, adicionales a las que ya existen con app.current_coach_id()
-- (esas siguen ahí para el bot, que corre con service_role y nunca las usa
-- realmente — son defensa en profundidad, no el mecanismo real). Postgres
-- combina policies del mismo comando con OR, así que agregar estas no rompe
-- nada existente. El panel corre bajo el rol `authenticated` con RLS real
-- (a diferencia del bot, que bypassa RLS con service_role).
create policy coaches_select_by_auth on coaches
  for select using (auth_user_id = auth.uid());
create policy coaches_update_by_auth on coaches
  for update using (auth_user_id = auth.uid());
create policy coaches_insert_by_auth on coaches
  for insert with check (auth_user_id = auth.uid());

create policy athletes_select_by_coach_auth on athletes
  for select using (
    exists (select 1 from coaches c where c.id = athletes.coach_id and c.auth_user_id = auth.uid())
  );

create policy invite_codes_by_coach_auth on invite_codes
  for all using (
    exists (select 1 from coaches c where c.id = invite_codes.coach_id and c.auth_user_id = auth.uid())
  )
  with check (
    exists (select 1 from coaches c where c.id = invite_codes.coach_id and c.auth_user_id = auth.uid())
  );
