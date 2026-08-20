-- Crear una org desde el panel fallaba con "new row violates row-level
-- security policy": el insert lleva RETURNING (Supabase hace .select() para
-- devolver el id), y RETURNING exige poder LEER la fila recién creada. En ese
-- instante el usuario todavía no tiene membership, así que auth_org_id() da
-- null y la policy de select no la matchea. Trampa a recordar: **toda policy
-- de insert necesita una de select que cubra la fila nueva, o el insert tiene
-- que ir sin returning**.
--
-- Aflojar el select sería un agujero. La salida correcta es hacerlo atómico:
-- esta función crea la org, el membership de dueño y (si entrena solo) su fila
-- de athlete, todo en una transacción. De paso elimina la compensación "si
-- falla el membership, borro la org", que podía dejar orgs huérfanas e
-- inaccesibles si el propio delete fallaba.

create or replace function public.create_organization(
  p_tipo text,
  p_nombre text,
  p_marca text,
  p_telefono text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_tipo not in ('gimnasio', 'entrenador', 'individual') then
    raise exception 'tipo invalido';
  end if;

  -- Una persona pertenece a una sola org por ahora (ver memberships).
  if exists (select 1 from memberships where auth_user_id = auth.uid()) then
    raise exception 'ya pertenece a una organizacion';
  end if;

  insert into organizations (tipo, nombre, marca, telefono, trial_termina_en)
  values (p_tipo, p_nombre, p_marca, nullif(p_telefono, ''), current_date + 14)
  returning id into v_org_id;

  insert into memberships (org_id, auth_user_id, rol, nombre, email)
  values (
    v_org_id,
    auth.uid(),
    'dueno',
    p_nombre,
    (select email from auth.users where id = auth.uid())
  );

  if p_tipo = 'individual' then
    insert into athletes (org_id, auth_user_id, nombre, telefono)
    values (v_org_id, auth.uid(), p_nombre, nullif(p_telefono, ''));
  end if;

  return v_org_id;
end;
$$;

revoke all on function public.create_organization(text, text, text, text) from public;
revoke execute on function public.create_organization(text, text, text, text) from anon;
grant execute on function public.create_organization(text, text, text, text) to authenticated;

-- Ya no hace falta: la creación pasa por la función de arriba, que corre como
-- security definer. Dejarla habilitaría inserts sueltos sin membership.
drop policy if exists organizations_insert_by_authenticated on organizations;
