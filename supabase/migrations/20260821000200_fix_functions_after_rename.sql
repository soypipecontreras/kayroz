-- Postgres actualiza solo las expresiones de las POLICIES cuando se renombra
-- una columna. Los CUERPOS DE FUNCIONES no: quedan con el nombre viejo y
-- explotan recién en runtime, cuando alguien los ejecuta. Ningún typecheck ni
-- el `apply_migration` lo detectan.
--
-- Estas dos quedaron rotas por el rename coaches->organizations /
-- coach_id->org_id de 20260821000000, y las dos están en caminos críticos:
-- canjear un código de invitación y activar la cuenta de un cliente.
-- Se encontraron buscando así, que conviene repetir tras cualquier rename:
--   select proname, prosrc from pg_proc
--   where pronamespace = 'public'::regnamespace and prosrc ilike '%<viejo>%';

create or replace function public.redeem_invite_code(p_codigo text)
returns uuid
language plpgsql
set search_path to ''
as $function$
declare
  v_org_id uuid;
begin
  update public.invite_codes
  set usos_actuales = usos_actuales + 1
  where codigo = p_codigo
    and activo
    and usos_actuales < usos_max
    and (expira_en is null or expira_en > now())
  returning org_id into v_org_id;

  return v_org_id; -- null si no se pudo canjear (no existe, agotado, vencido o inactivo)
end;
$function$;

-- Se mantienen los nombres de las columnas de salida (coach_marca /
-- coach_nombre) para no romper /join/[token], que ya las consume.
create or replace function public.get_athlete_activation(p_token uuid)
returns table (nombre text, coach_marca text, coach_nombre text, valid boolean)
language sql
security definer
set search_path = public
as $$
  select
    a.nombre,
    o.marca as coach_marca,
    o.nombre as coach_nombre,
    (a.activation_token = p_token and a.activation_expires_at > now() and a.auth_user_id is null) as valid
  from athletes a
  join organizations o on o.id = a.org_id
  where a.activation_token = p_token;
$$;

revoke all on function public.get_athlete_activation(uuid) from public;
grant execute on function public.get_athlete_activation(uuid) to anon, authenticated;
