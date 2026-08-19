-- El portal del atleta muestra la marca de su coach en el header (refuerza
-- el white-label) — necesita poder leer esa fila de coaches, algo que hasta
-- ahora nadie pedía porque solo el propio coach leía coaches.
create policy coaches_select_by_athlete_auth on coaches
  for select using (
    exists (select 1 from athletes a where a.coach_id = coaches.id and a.auth_user_id = auth.uid())
  );
