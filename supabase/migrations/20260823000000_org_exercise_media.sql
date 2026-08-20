-- Media propia de cada organización sobre CUALQUIER ejercicio, incluidos los
-- del catálogo global.
--
-- El problema que resuelve: los 45 ejercicios sembrados (Press banca,
-- Sentadilla…) son una sola fila compartida por todas las organizaciones. Si un
-- gimnasio le escribiera su video encima, se lo verían todos los demás — por
-- eso `exercises.imagen_path`/`video_path` estaban bloqueados para es_global.
-- El resultado era que un entrenador no podía subir su video de técnica al
-- ejercicio más común de todos, que es justo donde más lo quiere.
--
-- La salida es una tabla de override por (org, ejercicio): cada organización
-- guarda su propia media sin tocar la fila compartida.

create table org_exercise_media (
  org_id uuid not null references organizations(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  imagen_path text,
  video_path text,
  updated_at timestamptz not null default now(),
  primary key (org_id, exercise_id)
);

create index org_exercise_media_org_id_idx on org_exercise_media(org_id);

alter table org_exercise_media enable row level security;

-- El staff de la org gestiona la suya. Se permite a cualquier rol y no solo al
-- dueño: subir un video de técnica es parte del trabajo del entrenador.
create policy org_exercise_media_by_org on org_exercise_media
  for all to authenticated
  using (org_id = public.auth_org_id())
  with check (org_id = public.auth_org_id());

-- El atleta necesita verla: es la que aparece en su rutina.
create policy org_exercise_media_select_by_athlete on org_exercise_media
  for select to authenticated
  using (org_id = public.auth_athlete_org_id());
