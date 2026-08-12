-- ------------------------------------------------------------------
-- Esquema del sitio. Postgres (Neon o Supabase).
-- Correr con:  npm run db:setup
-- (o pegarlo en el SQL Editor de Neon/Supabase)
--
-- Una sola tabla. Antes había dos sistemas de inscripción en paralelo
-- (Google Forms + tabla `registrations`) y ninguno terminaba de andar.
-- ------------------------------------------------------------------

create table if not exists signups (
  id           bigserial primary key,

  -- Lo mínimo indispensable para poder contactar a la persona
  name         text        not null,
  contact      text        not null,   -- Instagram / Discord / mail / WhatsApp

  -- Perfil de juego
  experience   text        not null,   -- nuevo | poco | bastante | dm
  mode         text        not null,   -- online | presencial | indistinto
  availability text[]      not null default '{}',  -- ej: {"Vie noche","Sab tarde"}
  themes       text[]      not null default '{}',  -- ej: {"Fantasía","Terror"}
  notes        text        null,

  -- Perfil que devuelven el test de la home y el simulador (si los hizo)
  quiz_tags    text[]      not null default '{}',
  -- Ejes numéricos del perfil medidos en el simulador con IA:
  -- {"creatividad":72,"equipo":55,"ley":-30,"combate":12}
  traits       jsonb       null,

  -- Gestión
  contacted    boolean     not null default false,
  archived     boolean     not null default false,
  source       text        null,       -- de dónde vino: instagram, discord, reddit...

  created_at   timestamptz not null default now()
);

create index if not exists signups_created_at_idx on signups (created_at desc);
create index if not exists signups_contacted_idx  on signups (contacted);

-- Búsqueda rápida por contacto (se usa para detectar envíos duplicados
-- desde la app; no se hace con un índice único porque date_trunc() sobre
-- timestamptz no es IMMUTABLE y Postgres rechaza el índice).
create index if not exists signups_contact_idx on signups (lower(contact));
