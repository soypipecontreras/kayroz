-- Un visitante anónimo de /g/<slug> recibía
-- "permission denied for function auth_org_id" en vez de la página.
--
-- Motivo: las policies internas (las del staff) no declaraban rol, así que
-- valían para `public`, o sea también para anon. Postgres las evalúa igual,
-- invoca auth_org_id() y ahí corta: anon no tiene EXECUTE sobre esa función.
-- El error gana antes de que la policy pública pueda devolver la fila.
--
-- No había filtración (fallaba cerrado), pero dejaba una trampa: cualquier
-- consulta sin sesión moría con un error incomprensible en vez de devolver
-- cero filas. Se acotan a `authenticated`, que es para quien fueron escritas.
--
-- Regla para el futuro: **si una tabla tiene alguna policy para anon, todas
-- sus otras policies tienen que declarar `TO authenticated`**, si no la
-- evaluación de las internas rompe la pública.
--
-- La alternativa era darle EXECUTE a anon sobre las funciones (devuelven null
-- sin sesión, no filtran nada), pero ampliar la superficie de anon para
-- arreglar esto sería al revés de lo que conviene.

alter policy org_sites_by_owner on org_sites to authenticated;
alter policy org_sites_select_by_org on org_sites to authenticated;
alter policy organizations_select_by_member on organizations to authenticated;
alter policy organizations_update_by_owner on organizations to authenticated;
alter policy membership_plans_select_by_org on membership_plans to authenticated;
alter policy membership_plans_write_by_staff on membership_plans to authenticated;

alter policy athletes_insert_by_org on athletes to authenticated;
alter policy athletes_select_by_org on athletes to authenticated;
alter policy athletes_update_by_org on athletes to authenticated;
alter policy exercise_aliases_select on exercise_aliases to authenticated;
alter policy exercises_delete_by_org on exercises to authenticated;
alter policy exercises_insert_by_org on exercises to authenticated;
alter policy exercises_select_by_org on exercises to authenticated;
alter policy exercises_update_by_org on exercises to authenticated;
alter policy invite_codes_by_org on invite_codes to authenticated;
alter policy member_subscriptions_select_by_org on member_subscriptions to authenticated;
alter policy member_subscriptions_write_by_staff on member_subscriptions to authenticated;
alter policy memberships_select_by_org on memberships to authenticated;
alter policy memberships_write_by_owner on memberships to authenticated;
alter policy payments_by_staff on payments to authenticated;
alter policy product_sales_by_staff on product_sales to authenticated;
alter policy products_select_by_org on products to authenticated;
alter policy products_write_by_staff on products to authenticated;
alter policy routine_exercises_by_org on routine_exercises to authenticated;
alter policy routine_template_exercises_by_org on routine_template_exercises to authenticated;
alter policy routine_templates_by_org on routine_templates to authenticated;
alter policy routines_by_org on routines to authenticated;
alter policy sedes_select_by_org on sedes to authenticated;
alter policy sedes_write_by_staff on sedes to authenticated;
alter policy sets_select_by_org on sets to authenticated;
alter policy workouts_select_by_org on workouts to authenticated;
