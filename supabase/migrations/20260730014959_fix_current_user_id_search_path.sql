-- Reconstruida desde la base real (20 ago 2026): se había aplicado por MCP y
-- nunca se escribió como archivo. Ver §0 de CLAUDE.md.
--
-- `set search_path = ''` en una función que se usa desde policies: sin esto,
-- un search_path manipulado podría cambiar a qué resuelve el nombre.

create or replace function app.current_user_id() returns uuid
language sql stable
set search_path = ''
as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$;
