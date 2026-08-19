-- Extiende el RLS por auth.uid() (ver 20260816000000_coach_auth.sql) al resto
-- de tablas que el panel necesita para el catálogo de ejercicios, alta manual
-- de atletas, asignación de rutinas y el historial de entrenos en la ficha
-- de atleta. Mismo criterio: policies adicionales, no reemplazan las de
-- app.current_coach_id()/app.current_athlete_id() que sigue usando el bot.

create policy exercises_select_by_coach_auth on exercises
  for select using (
    es_global or exists (
      select 1 from coaches c where c.id = exercises.coach_id and c.auth_user_id = auth.uid()
    )
  );
create policy exercises_insert_by_coach_auth on exercises
  for insert with check (
    not es_global and exists (
      select 1 from coaches c where c.id = exercises.coach_id and c.auth_user_id = auth.uid()
    )
  );

create policy athletes_insert_by_coach_auth on athletes
  for insert with check (
    exists (select 1 from coaches c where c.id = athletes.coach_id and c.auth_user_id = auth.uid())
  );

create policy routines_select_by_coach_auth on routines
  for select using (
    exists (
      select 1 from athletes a
      join coaches c on c.id = a.coach_id
      where a.id = routines.athlete_id and c.auth_user_id = auth.uid()
    )
  );
create policy routines_insert_by_coach_auth on routines
  for insert with check (
    exists (
      select 1 from athletes a
      join coaches c on c.id = a.coach_id
      where a.id = routines.athlete_id and c.auth_user_id = auth.uid()
    )
  );

create policy routine_exercises_by_coach_auth on routine_exercises
  for all using (
    exists (
      select 1 from routines r
      join athletes a on a.id = r.athlete_id
      join coaches c on c.id = a.coach_id
      where r.id = routine_exercises.routine_id and c.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from routines r
      join athletes a on a.id = r.athlete_id
      join coaches c on c.id = a.coach_id
      where r.id = routine_exercises.routine_id and c.auth_user_id = auth.uid()
    )
  );

create policy workouts_select_by_coach_auth on workouts
  for select using (
    exists (
      select 1 from athletes a
      join coaches c on c.id = a.coach_id
      where a.id = workouts.athlete_id and c.auth_user_id = auth.uid()
    )
  );

create policy sets_select_by_coach_auth on sets
  for select using (
    exists (
      select 1 from workouts w
      join athletes a on a.id = w.athlete_id
      join coaches c on c.id = a.coach_id
      where w.id = sets.workout_id and c.auth_user_id = auth.uid()
    )
  );
