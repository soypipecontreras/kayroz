-- Reconstruida desde la base real (20 ago 2026): se había aplicado por MCP y
-- nunca se escribió como archivo. Ver §0 de CLAUDE.md.
--
-- Un visitante anonimo de /g/<slug> recibia
-- "permission denied for function auth_org_id" en vez de la pagina.
--
-- Motivo: las policies internas (las del staff) no declaran rol, asi que valen
-- para `public`, o sea tambien para anon. Postgres las evalua igual, invoca
-- auth_org_id() y ahi corta: anon no tiene EXECUTE sobre esa funcion. El error
-- gana antes de que la policy publica pueda devolver la fila.
--
-- Se acotan a `authenticated`, que es para quien fueron escritas. La otra
-- salida era darle EXECUTE a anon sobre las funciones (devuelven null sin
-- sesion, no filtran nada), pero ampliar la superficie de anon para arreglar
-- esto seria al reves de lo que conviene.
--
-- Solo hace falta en las tres tablas que anon consulta al abrir la pagina:
-- org_sites, organizations y membership_plans.
alter policy org_sites_by_owner on org_sites to authenticated;
alter policy org_sites_select_by_org on org_sites to authenticated;

alter policy organizations_select_by_member on organizations to authenticated;
alter policy organizations_update_by_owner on organizations to authenticated;

alter policy membership_plans_select_by_org on membership_plans to authenticated;
alter policy membership_plans_write_by_staff on membership_plans to authenticated;
