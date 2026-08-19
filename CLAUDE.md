# CLAUDE.md — Kayroz (SaaS white-label para entrenadores)

> Este archivo es el contexto persistente del proyecto. Léelo completo antes de escribir código.
> Si algo aquí contradice una instrucción mía en el chat, pregunta antes de asumir.

---

## 0. Estado real de la implementación (léase primero)

Este documento describe el diseño completo del SaaS. Lo que **ya existe en código** hoy es
mucho más chico — no asumas que todo lo de acá abajo está construido:

- ✅ **Identidad visual: Kayroz.** Negro/blanco, filosa, sin modo claro (el logo está pensado
  para fondo negro). Assets originales en `Logo/` (raíz del proyecto); copias en uso dentro de
  `panel/public/brand/`: `kayroz-mark.png` (isotipo "K", favicon vía `panel/app/icon.png` y
  header del dashboard), `kayroz-wordmark.png` (wordmark completo, pantallas de login/signup/
  onboarding), `kayroz-cabra.png` (cabra montés, elemento visual de las pantallas de auth —
  **atención**: el PNG original tiene el dibujo en negro sobre fondo transparente, pensado
  para fondo claro; sobre el fondo negro del panel se renderiza con `filter: invert` en CSS
  para que quede blanco sobre transparente, si se vuelve a usar en otro lado no olvidar ese
  detalle). Paleta en `panel/app/globals.css` (`--background: #000000` exacto, para que no
  quede un rectángulo visible alrededor de los PNG del logo, que traen ese negro horneado).
  Kayroz es la marca de la **plataforma** (aparece en el chrome del panel: favicon, header,
  pantallas de login/signup/onboarding); el campo `coaches.marca` de cada coach sigue siendo
  su propio white-label, visible como título principal del dashboard una vez logueado — no se
  reemplaza, son dos identidades que conviven a propósito.
- ✅ **Estética "liquid glass"** en todo el panel (`panel/app/globals.css`, clases `.glass`,
  `.glass-input`, `.glass-nav`): paneles translúcidos con `backdrop-filter: blur()`, borde
  sutil e inset-highlight para simular el filo de un vidrio real. Necesita un fondo con algo
  de textura detrás para que el blur tenga qué refractar — por eso `body` tiene resplandores
  radiales fijos (`background-attachment: fixed`) en vez de negro plano. Los botones primarios
  (CTA) se dejaron sólidos (blanco, sin vidrio) a propósito — el vidrio en el elemento de
  acción principal reduce contraste/afordancia. Nav del dashboard: `sticky` + `.glass-nav`,
  flota al hacer scroll. Verificado en el navegador en las 8 pantallas del panel.
- ✅ Esquema SQL de `coaches`, `athletes`, `invite_codes` + RLS, ya **aplicado al proyecto
  Supabase real** (`bnjjmnhyuiusrqhxzwoj`), no solo en el archivo de migración
  (`supabase/migrations/20260815000000_multi_tenant.sql`). Verificado con `get_advisors`
  (sin warnings de seguridad) y con una prueba manual de aislamiento entre dos coaches
  (cada uno solo ve sus propios atletas/ejercicios). El catálogo global de 45 ejercicios
  sobrevivió intacto a la migración.
- ✅ Capa de dominio agnóstica de canal en `supabase/functions/_shared/`: `coaches.ts`,
  `athletes.ts`, `identity.ts`, `exercises.ts`, `workouts.ts`, `pr.ts`, `session.ts`,
  `routines.ts`. Todas operan sobre `coachId`/`athleteId`, no dependen de ningún canal
  de mensajería. Pasa `deno check` sin errores.
- ✅ Cerebro del bot en `_shared/bot.ts`: recibe `(telefono, texto)` y devuelve una
  `BotReply`, sin nada de un canal específico adentro. Cubre alta de coach (`/start`),
  canje de código de invitación → alta de atleta, `/invitar`, todo el flujo de atleta
  que ya existía en el prototipo (registrar series, rutinas, plantillas, `/hoy`, "cómo se
  hace X"), y ahora también `/prs`, `/historial`, `/progreso [ejercicio]`, `/deshacer` y
  `/ayuda` (Fase 4 — PRs y consultas, `_shared/queries.ts`). Falta el resto de comandos de
  coach (§6/§9) y la sesión guiada (`/entrenar`, Fase 5).
- ❌ **Sin canal conectado todavía, a propósito** (decisión explícita: se deja para el
  final). El código de Telegram del prototipo anterior (`telegram-webhook/`,
  `_shared/telegram.ts`) se borró — estaba roto contra el esquema nuevo y no aportaba
  nada reusable para WhatsApp. Cuando se conecte el canal, solo hace falta un adaptador
  delgado que traduzca el payload de WhatsApp a `(telefono, texto)` y llame a
  `handleIncomingMessage`/`handleIncomingOption` de `_shared/bot.ts`.
- ❌ Sin webhook de WhatsApp Cloud API todavía (ver §2, canal decidido pero no
  implementado — falta que armes la cuenta de Meta Business y consigas las credenciales).
- ✅ **Panel web del coach** (`panel/`, Next.js 14 App Router): login/signup con Supabase Auth
  (email + contraseña), onboarding que crea el `coach` en trial de 14 días. Corre bajo el rol
  `authenticated` con RLS real (`auth.uid()`), no `service_role` — es el primer lugar del
  proyecto donde RLS es el mecanismo de aislamiento real y no solo defensa en profundidad.
  `coaches.auth_user_id` (nullable, puente hacia `auth.users`) y `coaches.telefono`/
  `athletes.telefono` (ambos nullable) conviven — un coach o atleta puede llegar primero por
  el bot o primero por el panel. Ya tiene: dashboard con atletas + códigos de invitación,
  catálogo de ejercicios (global + propios), alta manual de atleta (sin pasar por WhatsApp),
  ficha de atleta con rutinas asignadas e historial de entrenos, y configuración del coach.
  Todo probado de punta a punta en el navegador contra la base real. Ver §9 para el detalle
  slice por slice.
- ✅ **Cuentas de atleta + portal propio** (`panel/app/app/*`, `panel/app/join/[token]/*`):
  mismo puente `auth_user_id` que los coaches, ahora también en `athletes`. El coach genera un
  link de activación desde la ficha del atleta ("Generar acceso" → `activation_token` +
  `activation_expires_at`, 7 días de validez); el atleta abre `/join/<token>`, pone su
  contraseña, y queda vinculado (`activate_athlete`, función `security definer` — el atleta no
  tiene forma de activar la cuenta de otro porque usa `auth.uid()` del caller, nunca un id por
  parámetro). Portal en `/app/*`: rutina asignada (`/app`), carga manual de series
  (`/app/log`), historial (`/app/historial`) y PRs (`/app/prs`) — reimplementa en TS la misma
  lógica de `_shared/{workouts,pr}.ts` (crear/reusar workout `en_curso`, marcar `es_pr` en
  cadena). `login` ahora resuelve a `/dashboard` o `/app` según si el `auth.uid()` tiene fila
  en `coaches` o en `athletes`. PWA básica (`panel/public/manifest.json` + íconos compuestos
  sobre fondo negro) para "agregar a inicio" en el celular — no hay app nativa todavía, ver
  §11. Probado de punta a punta en el navegador (alta → generar acceso → activar → cargar
  serie → el coach ve el entreno real) y por SQL con `set role authenticated` +
  `request.jwt.claims` simulando un uid ajeno (ve cero filas) y el uid real del coach (ve el
  entreno del atleta) — después borrado.
  **Cuidado si tocás RLS de `coaches`/`athletes`:** una policy en `coaches` que subconsulta
  `athletes`, combinada con la policy ya existente en `athletes` que subconsulta `coaches`
  (`athletes_select_by_coach_auth`), produce "infinite recursion detected in policy" — pasó al
  agregar `coaches_select_by_athlete_auth` (así el atleta puede leer la `marca` de su coach en
  el header). Se resolvió con una función `security definer` (`auth_athlete_coach_id()`) que
  hace el lookup sin volver a disparar RLS — mismo patrón a seguir si aparece otro ciclo
  parecido. Ojo también: `revoke ... from public` en una función nueva **no** alcanza a los
  grants directos que Supabase hace por default privileges a `anon`/`authenticated` al crear
  la función — hay que revocar explícito de `anon` cuando la función no debería ser pública
  (`select grantee from information_schema.routine_privileges where routine_name = '...'`
  para verificar).
- ✅ **Dashboard de seguimiento del coach (Fase B, primer tramo)**: `/dashboard` ahora muestra
  un resumen de adherencia ("X/Y entrenaron en los últimos 7 días", cuántos llevan más de 5
  días sin entrenar — el umbral que menciona la propuesta de valor del coach en §1) y la
  columna "Última sesión" pasó de fecha cruda a relativa ("hace 3 días"), en rojo si superó el
  umbral. La ficha de atleta (`/dashboard/athletes/[id]`) suma una sección de "Récords
  personales" (mismo cálculo que `/app/prs` del portal del atleta) y un dato de adherencia
  ("entrenó ayer · 3 entrenos en los últimos 30 días"). Todo con números/texto, sin librería de
  gráficos todavía. Probado en el navegador con tres atletas de prueba (reciente/perdido/
  nunca entrenó) contra la base real, después borrado.
- ❌ Todo lo de rutinas normalizadas (`routine_versions`/`routine_days`), `assignments`,
  progresión automática, sesión guiada, cron/reportes, cobros, gráficos de progreso en el
  panel: **solo diseño**, cero código. Ver §9 para el orden de construcción.

---

## 1. Qué estamos construyendo

**Kayroz** es un **SaaS white-label** donde cada **entrenador personal (coach)** contrata una suscripción mensual y sus **atletas (clientes)** registran entrenamientos conversando con un bot en lenguaje natural en español.

No es una app de gym. Es infraestructura para que el coach deje de mandar rutinas por PDF y de perseguir a sus clientes por WhatsApp.

**Propuesta de valor para el coach:**
- Sus atletas registran sin fricción (escriben como hablan, no llenan formularios).
- Él ve adherencia real: quién entrenó, quién lleva 5 días perdido, quién progresó.
- Detección automática de PRs → el atleta recibe dopamina → se queda con el coach.
- Reporte semanal automático por atleta, sin que el coach mueva un dedo.

**Propuesta de valor para el atleta:**
- Registrar una serie toma 3 segundos y cero apps nuevas instaladas.
- El bot le dice qué toca hoy según su rutina asignada.
- Le avisa cuando rompe un récord.

---

## 2. Decisiones de arquitectura (ya tomadas, no re-litigar)

| Decisión | Elección | Por qué |
|---|---|---|
| Canal | **WhatsApp Cloud API** | Es donde vive el usuario final del coach; nadie quiere instalar Telegram para su gym. Requiere cuenta de Meta Business y un número verificado — pendiente de tu lado antes de poder conectar el webhook. |
| Runtime | **Deno + Supabase Edge Functions** | Ya está construido y funcionando así (no Node/grammY/Railway — esa opción se evaluó y se descartó para no reescribir infraestructura que ya corre). |
| DB | **Supabase (Postgres) + RLS** | Multi-tenant desde el esquema, no desde el código. |
| Modo | **Webhook**, no polling | Serverless-friendly y barato. |
| Panel del coach | Next.js 14 (App Router) + Supabase Auth | ✅ Slice 1 construido (`panel/`) — adelantado a pedido tuyo para "ver algo materializado" antes de terminar el bot. No bloquea ni depende de WhatsApp. |
| LLM | Claude Haiku para fallback de parsing | Solo cuando regex falla. El costo por mensaje debe tender a cero. |
| Tests | **`Deno.test` nativo** | No Vitest — no tiene sentido meter el runner de Node en un proyecto que corre en Deno. |

**Regla de oro de costos:** cada mensaje que resuelva regex es un mensaje que no le pagamos a nadie. Mide y loguea el % de mensajes que caen en LLM. Si supera 25%, el regex está mal.

---

## 3. Modelo de datos

Todo vive bajo un tenant: `coach_id`. Ninguna tabla de negocio existe sin él (directo o vía
`athlete_id`, que siempre cuelga de un coach).

La identidad de quien escribe es un **teléfono** (`telefono text`, formato E.164), no un ID de
un canal particular — así el esquema no hay que volver a migrarlo si cambia el canal de
mensajería más adelante.

```
coaches                 -- ✅ implementado
  id uuid pk
  telefono text null unique -- null hasta que el coach conecte el canal del bot
  auth_user_id uuid null unique fk -> auth.users(id)  -- null hasta que entre al panel web
  nombre text
  marca text                -- nombre white-label que ven sus atletas
  logo_url text null        -- no implementado aún
  timezone text default 'America/Bogota'
  plan text                 -- 'trial' | 'starter' | 'pro' | 'elite'
  estado text                -- 'activo' | 'moroso' | 'cancelado'
  trial_termina_en date
  created_at timestamptz
  -- un coach puede tener uno de los dos identificadores, o los dos, nunca
  -- ninguno — se llega por el bot (telefono) o por el panel (auth_user_id)
  -- y se pueden vincular después. Ver "Panel web del coach" en §9.

invite_codes             -- ✅ implementado
  id uuid pk
  coach_id uuid fk
  codigo text unique        -- 8 chars, legible, sin 0/O/1/l/I
  usos_max int default 1
  usos_actuales int default 0
  expira_en timestamptz null
  activo bool default true

athletes                 -- ✅ implementado (antes "users", single-tenant)
  id uuid pk
  coach_id uuid fk
  telefono text
  nombre text
  unidad_peso text default 'kg'   -- 'kg' | 'lb'
  estado text default 'activo'    -- 'activo' | 'pausado' | 'archivado'
  ultima_sesion_en timestamptz null  -- ✅ ahora sí se escribe: se actualiza al
                                      -- cargar una serie desde el portal (/app/log)
  auth_user_id uuid null unique fk -> auth.users(id)  -- null hasta que activa su cuenta
  activation_token uuid null unique      -- generado por el coach, un solo uso
  activation_expires_at timestamptz null -- 7 días desde que se generó
  created_at timestamptz
  unique (coach_id, telefono)
  -- índice único parcial: un solo atleta con estado='activo' por teléfono,
  -- para que la identidad resuelva sin ambigüedad aunque haya historial
  -- bajo un coach anterior.

exercises                -- ✅ implementado
  id uuid pk
  coach_id uuid null        -- null = catálogo global compartido (~90 ejercicios sembrados)
  nombre_canonico text
  grupo_muscular text
  tipo text
  instrucciones text null
  imagen_url text null      -- bucket exercise-media, aún sin imágenes cargadas
  -- alias en tabla separada `exercise_aliases`, no como array — ya funciona así,
  -- no hay razón para cambiarlo.

routines / routine_exercises / routine_cycles / routine_drafts   -- ✅ implementado,
  -- todavía con el shape single-tenant (por-atleta, versionado simple vía
  -- routine_group_id). NO se migró al modelo routine_versions/routine_days/
  -- assignments de una fase anterior de este documento — se decidió mantener
  -- lo que ya funcionaba en vez de rediseñarlo en la misma migración que
  -- multi-tenancy. Repensar cuando un coach necesite reusar una rutina entre
  -- varios atletas sin duplicarla.

workouts / sets / session_progress   -- ✅ implementado, shape sin cambios,
  -- solo user_id -> athlete_id.
  -- sets.raw_input: SIEMPRE el texto crudo tal cual lo escribió el atleta.

body_metrics / reminder_log   -- ✅ tablas existen, sin uso en código todavía.

assignments               -- ❌ no implementado (ver nota de routines arriba)
personal_records          -- ❌ no implementado (los PRs se marcan inline en `sets.es_pr`,
                           --    no hay tabla de historial de récords todavía)
message_log                -- ❌ no implementado (fallback LLM tampoco existe todavía)
```

### RLS — no negociable
- Habilitar RLS en **todas** las tablas de negocio.
- El bot corre con `service_role` pero **jamás** consulta sin filtrar por `coach_id`/`athlete_id`
  explícito en cada query — confirmado que ningún código llama `set_config`, así que las
  policies (`app.current_coach_id()` / `app.current_athlete_id()`) son defensa en profundidad,
  no el mecanismo real de aislamiento hoy. El aislamiento real vive en los helpers de
  `_shared/*.ts`, que exigen `coachId`/`athleteId` como parámetro obligatorio.
- El panel web (`panel/`) usa el JWT del coach — ✅ implementado, con una salvedad respecto al
  diseño original: las policies no son `coach_id = auth.uid()` directo (`coaches.id` sigue
  siendo independiente de Supabase Auth, porque el bot crea coaches sin auth_user_id), sino
  `auth_user_id = auth.uid()` en `coaches`, y `exists (... coaches.auth_user_id = auth.uid())`
  en `athletes`/`invite_codes`. Son policies **adicionales** a las de `app.current_coach_id()`
  (que se dejan como están, defensa en profundidad para el bot); Postgres las combina con OR.
- Verificado en el navegador con dos coaches reales: cada uno ve solo sus propios atletas y
  códigos de invitación (ver §9, panel web del coach).

---

## 4. Parsing en español — el corazón del producto

**Estrategia: regex primero, LLM como red de seguridad.** El regex ya está implementado
(`_shared/parser.ts`) y cubre bastante terreno. El fallback a LLM **no existe todavía**.

### Formatos que ya resuelve el regex actual

```
press banca 80x8, 80x7, 75x8
sentadilla 100x5x3        (peso × reps × series)
dominadas 3x10 lastre 10
curl 20x12 @8              (RPE)
```

Normaliza kg/lb, comas vs puntos decimales, tildes, mayúsculas.

### Cuándo debería caer al LLM (no implementado)
- No se identificó ejercicio.
- Hay ambigüedad numérica irresoluble.
- El mensaje tiene estructura conversacional.

**Confirmación obligatoria** al cargar una rutina nueva: mostrar el resumen parseado y pedir ✅
antes de guardar — esto ya funciona (`routine_drafts` + botones).

---

## 5. Detección de PRs

Ya implementado en `_shared/pr.ts`: peso máximo histórico por ejercicio + e1RM (Epley,
`peso × (1 + reps/30)`). Reps máximas a un peso dado y volumen máximo de sesión: no
implementados. No hay tabla `personal_records` — el PR se marca inline en `sets.es_pr` en el
momento de insertar, y esa marca **no se actualiza después** (queda fija en el set que en su
momento fue récord). Por eso `/prs` (`_shared/queries.ts`) no filtra por `es_pr` — recalcula el
máximo histórico real por ejercicio en el momento de la consulta. Verificado con datos de
prueba donde el registro más reciente de un ejercicio no era el máximo histórico y `/prs`
igual mostró el correcto.

---

## 6. Flujos conversacionales

### Onboarding — diseño, pendiente de reconstruir para WhatsApp
La versión anterior (Telegram) usaba `/start CODIGO` como deep-link y `/start` sin payload para
distinguir coach de atleta nuevo. WhatsApp no tiene el mismo mecanismo de deep-link con
comandos — hay que rediseñar esta parte cuando se conecte el canal (por ejemplo, un link
`wa.me/<numero>?text=<código>` que precargue el mensaje con el código de invitación).

1. Coach nuevo: pide nombre, marca, timezone. Crea trial de 14 días. Genera su primer código de
   invitación.
2. Atleta nuevo: manda el código que le compartió su coach. Se valida, se crea el atleta bajo
   ese `coach_id`. Pregunta nombre y unidad preferida.

### Sesión guiada, registro libre, progresión automática, comandos de coach/atleta
Todo esto sigue siendo diseño (ver el documento anterior de este proyecto en el historial de
git si hace falta el detalle línea por línea) — no se reconstruye la lista completa acá para no
tener dos fuentes de verdad. Se implementa fase por fase según §9, y cada vez que una pieza se
construye, este archivo se actualiza para moverla de "diseño" a "✅ implementado".

---

## 7. Automatizaciones (cron)

Diseño sin implementar: recordatorio diario, empujón nocturno, reporte semanal, avisos de trial.
Todos respetarían `coaches.timezone` (los atletas no tienen timezone propia). Nada de esto
tiene código todavía — no hay ninguna función cron desplegada.

---

## 8. Capa de negocio

**Planes (COP/mes):**
| Plan | Atletas activos | Precio |
|---|---|---|
| Trial | 3 | 14 días gratis |
| Starter | hasta 15 | 79.000 |
| Pro | hasta 40 | 149.000 |
| Elite | ilimitado + marca propia | 249.000 |

Enforcement, estado moroso, pagos (Wompi/Bold): todo diseño, sin implementar. `coaches.plan` y
`coaches.estado` ya existen en el esquema con sus defaults, pero nada en código los usa todavía
para bloquear o degradar funcionalidad.

---

## 9. Orden de construcción

Trabaja **una fase a la vez**. Al terminar cada una: corre los tests, muéstrame qué hiciste, y
espera mi visto bueno antes de seguir.

**Fase 1 — Multi-tenancy y vinculación (cerrada salvo el canal)**
- ✅ Tablas `coaches`, `athletes`, `invite_codes` + RLS + policies, aplicadas en Supabase real.
- ✅ Capa de dominio (`_shared/coaches.ts`, `athletes.ts`, `identity.ts`) agnóstica de canal.
- ✅ Onboarding coach y atleta implementado en `_shared/bot.ts` (mandar `/start` da de alta
  a un coach nuevo con su primer código; mandar un código de invitación da de alta a un
  atleta). Pendiente solo la UX específica de WhatsApp del deep-link (ver §6) cuando se
  conecte el canal.
- ✅ Prueba manual de aislamiento entre dos coaches: cada uno ve solo sus propios atletas
  y ejercicios custom; código de invitación agotado/inexistente devuelve null sin canjear.
- ❌ Webhook de WhatsApp Cloud API — pendiente de que consigas las credenciales de Meta
  (se deja para el final, decisión explícita).

**Panel web del coach — slice 1 (adelantado, fuera de orden, a pedido tuyo)**
- ✅ `panel/`: Next.js 14 App Router + Tailwind + `@supabase/ssr`. Login, signup (email +
  contraseña), onboarding (crea el coach en trial si `auth.uid()` no tiene fila en `coaches`
  todavía), dashboard (marca, plan, días de trial, lista de atletas, generar código de
  invitación). Corre local con `npm run dev` en `panel/` (usa `panel/.env.local`, no
  comiteado, con la URL y la clave `anon`/`publishable` del proyecto — nunca `service_role`).
- ✅ Migración `supabase/migrations/20260816000000_coach_auth.sql`: puente
  `coaches.auth_user_id` ↔ `auth.users`, `coaches.telefono` pasa a nullable, policies RLS
  nuevas basadas en `auth.uid()`.
- ✅ Probado en el navegador de punta a punta (Claude in Chrome): signup, onboarding,
  generación de código, y aislamiento real entre dos coaches — confirmado también por SQL
  contra la base real, después borrado (coaches y sus `auth.users` de prueba).
- Nota: el proyecto Supabase tenía "Confirm email" activado por defecto; el dueño del
  proyecto lo desactivó manualmente desde el dashboard para poder probar el flujo sin
  depender del límite de envíos del mailer por defecto — no es algo que el código controle.
  Revisar si conviene reactivarlo antes de tener coaches reales usando el panel.

**Panel web del coach — slice 2 (mismo criterio: adelantado, a pedido tuyo)**
- ✅ Catálogo de ejercicios (`/dashboard/exercises`): lista el catálogo global (45) y los
  propios del coach, con alta de ejercicio custom (nombre, grupo muscular, tipo,
  instrucciones opcional).
- ✅ Alta manual de atleta (`/dashboard/athletes/new`): el coach agrega un atleta directo
  desde el panel, sin código de invitación ni WhatsApp — el teléfono queda opcional para
  vincularlo después. Esto obligó a corregir un bug real: `athletes.telefono` se había
  quedado `NOT NULL` en la migración de multi-tenancy (`20260816020000_athletes_telefono_nullable.sql`
  lo corrige), mismo criterio que ya se había aplicado a `coaches.telefono`.
- ✅ Ficha de atleta (`/dashboard/athletes/[id]`): perfil, rutinas activas con sus ejercicios,
  historial de entrenamientos (sets con PR marcado), y un form para asignar una rutina nueva
  usando el mismo formato que `/nuevarutina` del bot ("Ejercicio SERIESxREPS" por línea,
  incluye AMRAP) — reimplementado en TS del lado del panel, mismo criterio de no compartir
  código entre Deno y Node que el resto del panel.
- ✅ Configuración del coach (`/dashboard/settings`): editar nombre, marca y teléfono.
- ✅ Migración `supabase/migrations/20260816010000_panel_rls_extend.sql`: extiende las
  policies por `auth.uid()` a `exercises`, `athletes` (insert), `routines`,
  `routine_exercises`, `workouts` y `sets` (select) — necesarias para todo lo de arriba.
- ✅ Probado de punta a punta en el navegador: agregar ejercicio propio, agregar atleta,
  asignarle una rutina de 3 ejercicios (matcheo por nombre sin tildes incluido), editar
  configuración del coach — todo confirmado por SQL contra la base real y después borrado.
- ❌ Fuera de este slice: adherencia/analytics, edición o borrado de rutinas ya asignadas,
  cobros/enforcement de plan, logo, invitar coaches adicionales a la misma marca.

**Panel web — cuentas de atleta + portal propio (Fase A del "trabajo grande")**
- ✅ Migración `supabase/migrations/20260819000000_athlete_auth.sql` (+ 4 migraciones chicas
  de corrección el mismo día, ver §0 para el detalle de la recursión de RLS y los grants a
  `anon`): puente `athletes.auth_user_id`, `activation_token`/`activation_expires_at`,
  policies de select/insert/update para que el atleta lea y escriba sus propios `workouts`/
  `sets` y lea sus `routines`/`routine_exercises`/`exercises`/`coaches` (marca de su coach).
- ✅ "Generar acceso" en la ficha de atleta (`app/dashboard/athletes/actions.ts`,
  `generateAthleteAccess`) — mismo patrón que `generateInviteCode`.
- ✅ Activación pública `/join/[token]` (`app/join/[token]/`): valida el token vía
  `get_athlete_activation` (RPC pública, solo devuelve nombre/marca/vigencia, no permite
  listar atletas pendientes), el atleta pone contraseña y activa vía `activate_athlete` (RPC
  `security definer`, solo para `authenticated`, usa `auth.uid()` del caller).
- ✅ Portal del atleta `/app/*` (`app/app/`): rutina asignada, cargar serie, historial, PRs.
  Login (`app/login/page.tsx`) resuelve coach vs. atleta después de autenticar.
- ✅ PWA básica: `panel/public/manifest.json`, íconos en `panel/public/icons/` (isotipo
  compuesto sobre negro sólido — el original es blanco sobre transparente, no sirve solo
  como ícono de app), metadata de `apple-mobile-web-app` en `app/layout.tsx`.
- ✅ Probado de punta a punta en el navegador contra la base real (ver §0), después borrado.
- ❌ Fuera de esta fase: dashboard de adherencia del coach con métricas agregadas, ficha de
  atleta más rica (gráficos de progreso), app nativa — quedan para las fases siguientes del
  "trabajo grande" (dashboard de seguimiento real, luego app nativa aparte).

**Panel web — dashboard de seguimiento del coach (Fase B, primer tramo)**
- ✅ `/dashboard`: resumen de adherencia (entrenaron en los últimos 7 días / total activos,
  cuántos llevan +5 días perdidos) y "Última sesión" relativa con aviso en rojo. Helpers
  `diasDesde`/`formatUltimaSesion`/`ultimaSesionClass` en `app/dashboard/page.tsx`.
- ✅ `/dashboard/athletes/[id]`: sección "Récords personales" (mismo query que
  `app/app/prs/page.tsx`, reimplementado) y dato de adherencia (última sesión relativa +
  entrenos en los últimos 30 días vía `count` de `workouts`).
- ✅ Probado en el navegador con tres atletas de prueba (reciente, perdido hace 8 días, nunca
  entrenó) — confirmado que el resumen, los colores y el PR se ven correctos — después borrado.
- ❌ Fuera de este tramo: gráficos de progreso, ficha de atleta con series por semana,
  filtros/orden en la tabla de atletas — quedan para si hace falta, no se construyen sin pedido.

**Fase 2 — Catálogo + parser:** ✅ ya estaba (seed de 45 ejercicios, `_shared/parser.ts` con
27 tests). No se reconstruye acá, ver §4.

**Fase 3 — Fallback LLM:** ❌ sin arrancar. Necesita credencial de Anthropic configurada como
secret de Supabase y una tabla `message_log` que no existe todavía.

**Fase 4 — PRs y consultas:** ✅ implementada (adelantada, mismo criterio que el panel: se
puede construir y probar sin WhatsApp conectado porque `_shared/bot.ts` ya recibe
`(telefono, texto)` sin importar el canal). `/prs`, `/historial`, `/progreso [ejercicio]`,
`/deshacer` y `/ayuda`, lógica en `_shared/queries.ts`. Verificado con datos de prueba
insertados por SQL directo contra la base real (sin service_role key disponible en este
entorno para correr `bot.ts` como Deno test contra la DB, así que se validó el mismo camino
de datos — joins y agrupaciones — con las queries SQL equivalentes), después borrado.

**Fase 5 — Rutinas y sesión guiada:** ❌ sin arrancar. `/entrenar`, `/terminar`, progresión
automática de peso sugerido. La tabla `session_progress` ya existe en el esquema pero
ningún código la usa todavía.

**Fase 6 — Cron y reportes:** ❌ sin arrancar. Recordatorio diario, empujón nocturno, reporte
semanal, avisos de trial — nada desplegado, ver §7.

---

## 10. Estándares de código

- TypeScript estricto (`strict: true`), sin `any` salvo justificación en comentario.
- Nada de lógica de negocio dentro de handlers del webhook. Handlers delgados → servicios en
  `supabase/functions/_shared/`.
- Todos los textos de usuario en `_shared/copy.ts`. Nunca strings hardcodeados en la lógica —
  vamos a traducir y a hacer white-label.
- `Deno.test` para tests. El parser y la lógica de canje de invitación deben tener cobertura
  real, no simbólica. ✅ `_shared/parser.test.ts` cubre 27 casos (todos los formatos de §4 +
  edge cases). Corré `deno test --config supabase/functions/deno.json
  supabase/functions/_shared/*.test.ts` desde la raíz del proyecto. Falta cobertura de
  `coaches.ts` (canje de invitación) — necesita una base Postgres local (`supabase start`,
  requiere Docker) o credenciales de test, ninguna disponible en este entorno todavía; se
  verificó manualmente contra la base real en cambio (ver resultado de la Fase 1 en §9).
- Errores: nunca mostrar stack traces al usuario. Log estructurado + mensaje humano.

---

## 11. Fuera de alcance en v1

No construyas nada de esto aunque parezca buena idea:
- Nutrición, macros, calorías.
- Videos, imágenes o análisis de técnica.
- Chat directo atleta ↔ coach dentro del bot.
- Wearables o integraciones con Strava/Apple Health.
- Gamificación social entre atletas.

**App móvil nativa (iOS/Android):** decidida (no es una opción abierta) pero diferida a una
fase aparte — se eligió explícitamente por sobre PWA/responsive-only. Mientras tanto el panel
web (`panel/`, ver §9) cubre el uso desde el celular vía navegador, con PWA básica
("agregar a inicio", ver §0/§9) como paso intermedio razonable. Cuando le llegue el turno a la
app nativa es una decisión de arquitectura nueva (stack distinto — probablemente React Native
o Expo dado que el resto es TS, cuentas de developer, publicación en tiendas) — no asumas el
stack ni arranques código sin confirmar el plan primero.

---

## 12. Cómo quiero trabajar contigo

- Antes de codificar una fase, **muéstrame el plan en 5 líneas** y espera confirmación.
- Si una decisión tiene más de un camino razonable, pregúntame en vez de elegir por mí.
- No generes archivos gigantes de golpe. Módulo por módulo.
- Cuando termines algo, dime exactamente **cómo probarlo manualmente**.
- Si detectas que algo de este documento está mal pensado, dímelo. Prefiero discutir que
  reescribir.
- Mantené la §0 de este archivo al día — es lo primero que se lee y es lo que evita que el
  contexto se desalinee con el código real (ya pasó una vez en este proyecto).
