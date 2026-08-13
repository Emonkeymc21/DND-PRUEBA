-- ------------------------------------------------------------------
-- Esquema del sitio. Postgres (Neon o Supabase).
-- Correr con:  npm run db:setup
-- (o pegarlo en el SQL Editor de Neon/Supabase)
--
-- Una sola tabla. Antes había dos sistemas de inscripción en paralelo
-- (Google Forms + tabla `registrations`) y ninguno terminaba de andar.
-- ------------------------------------------------------------------

create table if not exists signups (
  id             bigserial primary key,

  -- Contacto
  nombre         text        not null,
  contacto       text        not null,   -- Discord / Instagram

  -- Preferencias de juego (valores en data/ml-simulation-dataset.ts)
  experiencia    text        not null,   -- espectador | principiante | veterano
  sistema        text        not null,   -- ligero | dnd5e | indies | indistinto
  tematicas      text[]      not null default '{}',
  modalidad      text        not null,   -- presencial | online | indistinto
  frecuencia     text        not null,   -- semanal | quincenal | esporadica
  disponibilidad text[]      not null default '{}',
  lineas_rojas   text[]      not null default '{}',
  notas          text        null,

  -- Metadata inferida por el motor de ML
  ml_tags        text[]      not null default '{}',
  ml_vector      jsonb       null,       -- las 8 dimensiones, 0..1
  ml_archetype   text        null,       -- id del arquetipo
  ml_campaign    text        null,       -- id de la campaña recomendada

  -- Gestión
  contactado     boolean     not null default false,
  archivado      boolean     not null default false,
  source         text        null,

  created_at     timestamptz not null default now()
);

create index if not exists signups_created_at_idx on signups (created_at desc);
create index if not exists signups_contactado_idx on signups (contactado);
create index if not exists signups_contacto_idx   on signups (lower(contacto));
create index if not exists signups_campaign_idx   on signups (ml_campaign);

-- ------------------------------------------------------------------
-- MACHINE LEARNING
-- ------------------------------------------------------------------

-- Pesos del recomendador. Una sola fila (id = 1).
-- El Master los ajusta desde /admin/modelo y el motor aprende de sus
-- correcciones. Si no existe la fila, se usan los pesos por defecto.
create table if not exists ml_weights (
  id         int primary key default 1,
  weights    jsonb       not null,
  note       text        null,
  updated_at timestamptz not null default now(),
  constraint ml_weights_single_row check (id = 1)
);

-- Historial de correcciones del Master. Sirve para auditar cómo se movió el
-- modelo y para poder reentrenar desde cero si algo se desvía.
create table if not exists ml_feedback (
  id            bigserial primary key,
  vector        jsonb       not null,
  predicted     text        not null,
  actual        text        not null,
  weights_after jsonb       not null,
  created_at    timestamptz not null default now()
);

create index if not exists ml_feedback_created_idx on ml_feedback (created_at desc);
