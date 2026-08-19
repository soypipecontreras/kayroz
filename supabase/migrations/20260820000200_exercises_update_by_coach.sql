-- Faltaba la policy de UPDATE por auth.uid() en `exercises`: la única que había
-- (`exercises_update_own`) usa app.current_coach_id(), que el panel nunca setea
-- (eso es del bot con service_role). Sin esto, guardar la media de un ejercicio
-- propio no fallaba con error: el UPDATE simplemente no matcheaba ninguna fila
-- y PostgREST devolvía 200, así que el archivo quedaba subido al bucket y la
-- fila sin imagen_path. Mismo agujero que ya había aparecido en `athletes`
-- (20260819000200_athletes_update_by_coach.sql).
--
-- El `with check` impide además que un coach se apropie de un ejercicio del
-- catálogo global o se lo pase a otro coach editando coach_id/es_global.
create policy exercises_update_by_coach_auth on exercises
  for update using (
    not es_global
    and exists (select 1 from coaches c where c.id = exercises.coach_id and c.auth_user_id = auth.uid())
  )
  with check (
    not es_global
    and exists (select 1 from coaches c where c.id = exercises.coach_id and c.auth_user_id = auth.uid())
  );
