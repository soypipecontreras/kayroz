-- La página web pública de cada organización, armada con bloques.
--
-- Los bloques van como jsonb en una sola fila y no en una tabla aparte: se
-- editan todos juntos y se guardan de una, el orden es la posición en el array
-- (reordenar es mover un elemento, no reescribir N columnas `orden`), y nunca
-- hace falta consultar un bloque suelto. Una tabla `site_blocks` daría un
-- modelo más "correcto" en abstracto y bastante más código para nada.
--
-- Lo que NO se guarda acá: los planes. El bloque `planes` los lee en vivo de
-- membership_plans, así que cambiar un precio actualiza la web sola en vez de
-- dejar dos precios distintos conviviendo.

create table org_sites (
  org_id uuid primary key references organizations(id) on delete cascade,
  -- Parte visible de la URL: /g/<slug>. Único en toda la plataforma.
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 40),
  publicado boolean not null default false,
  bloques jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table org_sites enable row level security;

-- El dueño gestiona la suya.
create policy org_sites_by_owner on org_sites
  for all using (org_id = public.auth_org_id() and public.auth_org_role() = 'dueno')
  with check (org_id = public.auth_org_id() and public.auth_org_role() = 'dueno');

-- El resto del staff la ve pero no la toca (para que no sorprenda que exista).
create policy org_sites_select_by_org on org_sites
  for select using (org_id = public.auth_org_id());

-- Lectura pública SOLO de lo publicado. Es la primera vez en el proyecto que
-- `anon` puede leer algo de una org: hasta ahora todo exigía sesión. El filtro
-- `publicado` es la única frontera, así que un borrador nunca se filtra.
create policy org_sites_select_publicado on org_sites
  for select to anon, authenticated
  using (publicado);

-- La página muestra la marca y los planes de la org, así que anon necesita
-- poder leer esas dos cosas — pero solo de organizaciones con sitio publicado,
-- y de organizations solo llega lo que la página realmente usa.
create policy organizations_select_publicas on organizations
  for select to anon, authenticated
  using (exists (select 1 from org_sites s where s.org_id = organizations.id and s.publicado));

create policy membership_plans_select_publicos on membership_plans
  for select to anon, authenticated
  using (
    activo and exists (
      select 1 from org_sites s where s.org_id = membership_plans.org_id and s.publicado
    )
  );

-- Sugiere un slug a partir de la marca: minúsculas, sin tildes, sin símbolos.
-- Si ya está tomado le agrega un sufijo numérico.
create or replace function public.slug_disponible(p_base text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_slug text;
  v_i int := 1;
begin
  v_base := lower(unaccent_simple(coalesce(p_base, '')));
  v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  if length(v_base) < 3 then
    v_base := 'gimnasio';
  end if;
  v_base := left(v_base, 36);

  v_slug := v_base;
  while exists (select 1 from org_sites where slug = v_slug) loop
    v_i := v_i + 1;
    v_slug := v_base || '-' || v_i;
  end loop;
  return v_slug;
end;
$$;

-- Sin la extensión `unaccent` instalada, un reemplazo mínimo para español.
create or replace function public.unaccent_simple(p_text text)
returns text
language sql
immutable
set search_path = public
as $$
  select translate(
    p_text,
    'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
    'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
  );
$$;

revoke all on function public.slug_disponible(text) from public;
revoke execute on function public.slug_disponible(text) from anon;
grant execute on function public.slug_disponible(text) to authenticated;
