-- Salud y wearables (Fase J): entrenos que llegan desde el Apple Watch (vía
-- Salud/HealthKit) u otra fuente externa, sin que el atleta escriba nada.
--
-- Cómo entra el dato HOY (sin app nativa): un Atajo de iOS ("Cuando termine
-- un entreno") manda un POST a /api/health/ingest del panel con un token
-- secreto por atleta. El endpoint llama al RPC de acá abajo. Cuando exista la
-- app nativa (iOS + watchOS), sincronizará HealthKit contra el mismo RPC —
-- el canal cambia, el contrato no.
--
-- Decisión: los entrenos del reloj van a la MISMA tabla `workouts`, no a una
-- tabla aparte. Así cuentan solos para la adherencia del coach ("¿quién
-- entrenó esta semana?") y para `ultima_sesion_en`. Un entreno del reloj no
-- tiene sets — trae duración/calorías/pulso en su lugar.

-- ============================================================
-- 1. Columnas nuevas en workouts
-- ============================================================

alter table workouts
  add column fuente text not null default 'app'
    check (fuente in ('app', 'bot', 'apple_watch', 'apple_health', 'otro')),
  add column inicio_en timestamptz,
  add column calorias integer check (calorias between 0 and 20000),
  add column fc_promedio smallint check (fc_promedio between 20 and 260),
  add column fc_max smallint check (fc_max between 20 and 260),
  add column distancia_m integer check (distancia_m between 0 and 1000000),
  add column tipo_actividad text;

comment on column workouts.fuente is
  'De dónde salió el entreno: app = portal/panel, bot = WhatsApp, apple_watch/apple_health = ingesta de HealthKit.';
comment on column workouts.inicio_en is
  'Timestamp real de inicio del entreno según el wearable. NULL en los registrados a mano.';
comment on column workouts.tipo_actividad is
  'Tipo de actividad que reporta el wearable (correr, fuerza, HIIT…), texto tal cual llega.';

-- El mismo entreno del reloj puede llegar dos veces (el Atajo se reintentó,
-- el teléfono re-sincronizó). La identidad natural es atleta + fuente +
-- instante de inicio.
create unique index workouts_wearable_dedupe
  on workouts (athlete_id, fuente, inicio_en)
  where inicio_en is not null;

-- ============================================================
-- 2. Token de ingesta por atleta
-- ============================================================
-- Secreto de un solo propósito: SOLO sirve para empujar entrenos. No da
-- lectura de nada ni acceso a la cuenta. El atleta lo genera y lo revoca
-- desde /app/salud; viaja dentro del Atajo de iOS.

alter table athletes
  add column health_ingest_token uuid unique;

comment on column athletes.health_ingest_token is
  'Token secreto para /api/health/ingest (Apple Watch vía Atajos). NULL = ingesta deshabilitada.';

-- ============================================================
-- 3. RPC de ingesta
-- ============================================================
-- SECURITY DEFINER y ejecutable por `anon`, a propósito: el Atajo de iOS no
-- tiene sesión de Supabase. La autenticación ES el token (uuid aleatorio,
-- revocable). Mismo criterio que get_athlete_activation (RPC pública que no
-- lista nada): devuelve solo un código de resultado, nunca datos.

create or replace function public.ingest_health_workout(
  p_token uuid,
  p_inicio timestamptz,
  p_duracion_seg integer,
  p_tipo text default null,
  p_calorias integer default null,
  p_fc_promedio integer default null,
  p_fc_max integer default null,
  p_distancia_m integer default null,
  p_fuente text default 'apple_watch'
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_athlete_id uuid;
  v_org_id uuid;
  v_tz text;
  v_insertado uuid;
begin
  if p_token is null then return 'token_invalido'; end if;

  select id, org_id into v_athlete_id, v_org_id
  from athletes
  where health_ingest_token = p_token and estado = 'activo';
  if v_athlete_id is null then return 'token_invalido'; end if;

  -- Validación de forma: rechazar basura antes de que toque la tabla. Los
  -- CHECK de las columnas son la segunda línea; acá se responde con un código
  -- legible en vez de un error de constraint.
  if p_inicio is null
     or p_inicio < '2020-01-01'::timestamptz
     or p_inicio > now() + interval '1 day' then
    return 'datos_invalidos';
  end if;
  if p_duracion_seg is null or p_duracion_seg < 0 or p_duracion_seg > 86400 then
    return 'datos_invalidos';
  end if;
  if p_fuente not in ('apple_watch', 'apple_health', 'otro') then
    return 'datos_invalidos';
  end if;

  -- La fecha del entreno se ancla a la zona horaria de la org (los atletas no
  -- tienen timezone propia — ver §7 de CLAUDE.md).
  select coalesce(timezone, 'America/Bogota') into v_tz
  from organizations where id = v_org_id;

  insert into workouts
    (athlete_id, fecha, estado, cerrado_en, fuente, inicio_en, duracion_seg,
     calorias, fc_promedio, fc_max, distancia_m, tipo_actividad)
  values
    (v_athlete_id,
     (p_inicio at time zone v_tz)::date,
     'cerrada',
     p_inicio + make_interval(secs => p_duracion_seg),
     p_fuente,
     p_inicio,
     nullif(p_duracion_seg, 0),
     p_calorias,
     p_fc_promedio,
     p_fc_max,
     p_distancia_m,
     nullif(trim(coalesce(p_tipo, '')), ''))
  on conflict (athlete_id, fuente, inicio_en) where inicio_en is not null
  do nothing
  returning id into v_insertado;

  if v_insertado is null then return 'duplicado'; end if;

  update athletes
  set ultima_sesion_en = greatest(coalesce(ultima_sesion_en, p_inicio), p_inicio)
  where id = v_athlete_id;

  return 'ok';
end;
$$;

-- Ojo con los default privileges de Supabase: revocar de public no alcanza,
-- hay que dejar el grant explícito solo donde corresponde (ver §0 de CLAUDE.md).
revoke all on function public.ingest_health_workout(uuid, timestamptz, integer, text, integer, integer, integer, integer, text) from public;
grant execute on function public.ingest_health_workout(uuid, timestamptz, integer, text, integer, integer, integer, integer, text) to anon, authenticated;
