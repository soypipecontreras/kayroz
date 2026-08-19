-- Mismo gap de grants por default privileges que ya se vio en
-- 20260819000100_athlete_auth_fix_grants.sql: el revoke "from public" no
-- alcanza el grant directo que Supabase hace a anon al crear la función.
revoke execute on function public.auth_athlete_coach_id() from anon;
