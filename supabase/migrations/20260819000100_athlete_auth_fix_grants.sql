-- El revoke "from public" del migration anterior no alcanza a los grants
-- directos que Supabase hace por default privileges a anon/authenticated/
-- service_role al crear una función — hay que revocar explícitamente de
-- anon acá. activate_athlete debe ser solo para authenticated (usa
-- auth.uid() del caller, no tiene sentido invocarlo sin sesión).
revoke execute on function public.activate_athlete(uuid) from anon;
