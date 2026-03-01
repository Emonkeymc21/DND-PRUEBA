-- DB: Postgres (Neon o Supabase)
-- Ejecutar este SQL en tu consola de DB. (Neon: SQL Editor / Supabase: SQL Editor)

create table if not exists campaigns (
  id bigserial primary key,
  slug text unique not null,
  title text not null,
  description text not null,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists registrations (
  id bigserial primary key,
  campaign_id bigint references campaigns(id) on delete set null,
  full_name text not null,
  age int null,
  contact text not null,
  country text not null,
  availability text not null,
  experience text not null,
  desired_role text not null,
  preferences text not null,
  lines_veils text null,
  character_json_url text null,
  contacted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists registrations_created_at_idx on registrations(created_at desc);
create index if not exists registrations_contacted_idx on registrations(contacted);
