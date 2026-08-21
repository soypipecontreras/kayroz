-- Reconstruida desde la base real (20 ago 2026): se había aplicado por MCP y
-- nunca se escribió como archivo. Ver §0 de CLAUDE.md.
--
-- La vigencia de una membresía se calcula por fecha, no por un `estado` que
-- habría que mantener con un cron (ver §0). Esta es esa función.

create or replace function public.subscription_vigente(p_termina_en date, p_estado text)
returns boolean language sql immutable set search_path = public as $$
  select p_estado <> 'cancelada' and p_termina_en >= current_date;
$$;
