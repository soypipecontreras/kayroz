-- coaches_select_by_athlete_auth (20260819000300) subconsulta athletes, y la
-- policy de select de athletes para el coach (athletes_select_by_coach_auth,
-- 20260816000000_coach_auth.sql) subconsulta coaches de vuelta — Postgres
-- reporta "infinite recursion detected in policy for relation coaches" al
-- evaluar cualquier select sobre coaches. Se rompe el ciclo con una función
-- security definer que resuelve el coach_id del atleta sin re-disparar RLS
-- sobre athletes (mismo criterio que get_athlete_activation/activate_athlete
-- en 20260819000000_athlete_auth.sql).

create or replace function public.auth_athlete_coach_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select coach_id from athletes where auth_user_id = auth.uid() limit 1;
$$;

revoke all on function public.auth_athlete_coach_id() from public;
grant execute on function public.auth_athlete_coach_id() to authenticated;

drop policy coaches_select_by_athlete_auth on coaches;
create policy coaches_select_by_athlete_auth on coaches
  for select using (id = public.auth_athlete_coach_id());
