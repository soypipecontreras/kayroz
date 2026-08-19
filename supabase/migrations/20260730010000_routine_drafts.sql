-- Rutina parseada de /nuevarutina en espera de confirmación (✅/❌ por botón).
-- Un solo draft pendiente por usuario: un /nuevarutina nuevo pisa el anterior.
create table routine_drafts (
  user_id uuid primary key references users(id) on delete cascade,
  nombre text not null,
  ejercicios jsonb not null,
  created_at timestamptz not null default now()
);

alter table routine_drafts enable row level security;

create policy routine_drafts_all_own on routine_drafts
  for all using (user_id = app.current_user_id())
  with check (user_id = app.current_user_id());
