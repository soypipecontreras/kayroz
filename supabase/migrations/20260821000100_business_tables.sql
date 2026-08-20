-- Módulos de negocio del gimnasio: sedes, membresías que le vende a sus socios,
-- pagos/ingresos y productos.
--
-- Ojo con la ambigüedad de "plan": `organizations.plan` es la suscripción que
-- esta org le paga a Kayroz (trial/starter/pro/elite). `membership_plans` es lo
-- que un gimnasio le cobra a SUS socios. Son dos cosas distintas y no se cruzan.
--
-- Todo cuelga de org_id y usa el mismo criterio de RLS: la plata la ven y tocan
-- dueño y recepción (auth_can_manage_money()); un entrenador entra a la app
-- para entrenar gente, no para ver la caja.

-- ============================================================
-- Sedes
-- ============================================================
-- Solo tienen sentido para tipo='gimnasio', pero la tabla no lo fuerza: un
-- entrenador podría querer separar "casa" y "parque" y no molesta.

create table sedes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  nombre text not null,
  direccion text,
  telefono text,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);
create index sedes_org_id_idx on sedes(org_id);
alter table sedes enable row level security;

create policy sedes_select_by_org on sedes
  for select using (org_id = public.auth_org_id() or org_id = public.auth_athlete_org_id());
create policy sedes_write_by_staff on sedes
  for all using (org_id = public.auth_org_id() and public.auth_can_manage_money())
  with check (org_id = public.auth_org_id() and public.auth_can_manage_money());

-- A qué sede va cada socio (nullable: un entrenador independiente no usa sedes).
alter table athletes add column sede_id uuid references sedes(id) on delete set null;

-- Qué entrenador lo lleva. Nullable: en un gimnasio chico o con un entrenador
-- independiente no hace falta asignar.
alter table athletes add column entrenador_id uuid references memberships(id) on delete set null;

-- ============================================================
-- Planes de membresía (lo que el gimnasio le vende al socio)
-- ============================================================

create table membership_plans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  nombre text not null,
  descripcion text,
  precio numeric(12, 2) not null check (precio >= 0),
  duracion_dias int not null check (duracion_dias > 0),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
create index membership_plans_org_id_idx on membership_plans(org_id);
alter table membership_plans enable row level security;

-- El socio necesita poder ver el plan que tiene contratado.
create policy membership_plans_select_by_org on membership_plans
  for select using (org_id = public.auth_org_id() or org_id = public.auth_athlete_org_id());
create policy membership_plans_write_by_staff on membership_plans
  for all using (org_id = public.auth_org_id() and public.auth_can_manage_money())
  with check (org_id = public.auth_org_id() and public.auth_can_manage_money());

-- ============================================================
-- Suscripción de un socio a un plan
-- ============================================================

create table member_subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  -- Si borran el plan, la suscripción sobrevive (queda el histórico de que pagó).
  plan_id uuid references membership_plans(id) on delete set null,
  inicia_en date not null default current_date,
  termina_en date not null,
  estado text not null default 'activa' check (estado in ('activa', 'vencida', 'cancelada')),
  created_at timestamptz not null default now()
);
create index member_subscriptions_org_id_idx on member_subscriptions(org_id);
create index member_subscriptions_athlete_id_idx on member_subscriptions(athlete_id);
alter table member_subscriptions enable row level security;

create policy member_subscriptions_select_by_org on member_subscriptions
  for select using (org_id = public.auth_org_id());
create policy member_subscriptions_select_own on member_subscriptions
  for select using (
    exists (select 1 from athletes a where a.id = member_subscriptions.athlete_id and a.auth_user_id = auth.uid())
  );
create policy member_subscriptions_write_by_staff on member_subscriptions
  for all using (org_id = public.auth_org_id() and public.auth_can_manage_money())
  with check (org_id = public.auth_org_id() and public.auth_can_manage_money());

-- ============================================================
-- Pagos / ingresos
-- ============================================================
-- Una fila por plata que entra, venga de una membresía o de un producto. Es la
-- fuente única de "ingresos" — así el total no depende de sumar dos tablas
-- distintas con criterios distintos.

create table payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  athlete_id uuid references athletes(id) on delete set null,
  subscription_id uuid references member_subscriptions(id) on delete set null,
  monto numeric(12, 2) not null check (monto >= 0),
  metodo text not null default 'efectivo'
    check (metodo in ('efectivo', 'tarjeta', 'transferencia', 'otro')),
  concepto text not null default 'membresia'
    check (concepto in ('membresia', 'producto', 'otro')),
  detalle text,
  fecha date not null default current_date,
  created_at timestamptz not null default now()
);
create index payments_org_id_fecha_idx on payments(org_id, fecha desc);
alter table payments enable row level security;

create policy payments_by_staff on payments
  for all using (org_id = public.auth_org_id() and public.auth_can_manage_money())
  with check (org_id = public.auth_org_id() and public.auth_can_manage_money());
-- El socio ve lo que él pagó, nada más.
create policy payments_select_own on payments
  for select using (
    exists (select 1 from athletes a where a.id = payments.athlete_id and a.auth_user_id = auth.uid())
  );

-- ============================================================
-- Productos
-- ============================================================

create table products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  nombre text not null,
  descripcion text,
  precio numeric(12, 2) not null check (precio >= 0),
  stock int not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
create index products_org_id_idx on products(org_id);
alter table products enable row level security;

create policy products_select_by_org on products
  for select using (org_id = public.auth_org_id());
create policy products_write_by_staff on products
  for all using (org_id = public.auth_org_id() and public.auth_can_manage_money())
  with check (org_id = public.auth_org_id() and public.auth_can_manage_money());

-- Venta de producto. El ingreso en sí va a `payments` (concepto='producto');
-- esta tabla existe aparte para poder descontar stock y saber qué se vendió.
create table product_sales (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  athlete_id uuid references athletes(id) on delete set null,
  payment_id uuid references payments(id) on delete set null,
  cantidad int not null check (cantidad > 0),
  monto_total numeric(12, 2) not null check (monto_total >= 0),
  fecha date not null default current_date,
  created_at timestamptz not null default now()
);
create index product_sales_org_id_fecha_idx on product_sales(org_id, fecha desc);
alter table product_sales enable row level security;

create policy product_sales_by_staff on product_sales
  for all using (org_id = public.auth_org_id() and public.auth_can_manage_money())
  with check (org_id = public.auth_org_id() and public.auth_can_manage_money());

-- ============================================================
-- Vencimiento de membresías
-- ============================================================
-- No hay cron todavía (Fase 6), así que en vez de un job que marque vencidas,
-- el estado real se calcula por fecha en el momento de consultar. `estado` se
-- reserva para lo que una fecha no puede saber: 'cancelada'.

create or replace function public.subscription_vigente(p_termina_en date, p_estado text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p_estado <> 'cancelada' and p_termina_en >= current_date;
$$;

-- Nota: al borrar las policies muertas de app.current_*() en la migración
-- anterior, cinco tablas quedaron con RLS activo y CERO policies:
-- body_metrics, reminder_log, routine_cycles, routine_drafts y
-- session_progress. Eso las deja cerradas a cal y canto para el panel, que es
-- el comportamiento correcto — ninguna se usa desde ahí todavía, y el bot entra
-- con service_role, que saltea RLS. Cuando alguna se use desde el panel hay que
-- escribirle su policy `_by_org`; el advisor de Supabase las marca en INFO
-- justamente para que no se olviden.
