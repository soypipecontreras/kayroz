-- Faltaba una policy de UPDATE para que el coach pueda escribir sobre sus
-- propios atletas (hasta ahora solo había select/insert por
-- auth.uid() — ver 20260816000000_coach_auth.sql y
-- 20260816010000_panel_rls_extend.sql). La necesita "Generar acceso" para
-- setear activation_token/activation_expires_at.
create policy athletes_update_by_coach_auth on athletes
  for update using (
    exists (select 1 from coaches c where c.id = athletes.coach_id and c.auth_user_id = auth.uid())
  );
