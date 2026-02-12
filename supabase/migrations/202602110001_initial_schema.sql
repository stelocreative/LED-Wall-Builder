create extension if not exists pgcrypto;

create type rigging_mode as enum ('ground', 'flown');
create type rack_location as enum ('SL', 'SR', 'USC', 'FOH');
create type imag_role as enum ('none', 'master', 'mirror');
create type power_source as enum ('20A', 'SOCAPEX', 'L21-30');

create table if not exists panel_variants (
  id text primary key,
  name text not null,
  width_mm integer not null,
  height_mm integer not null,
  unit_width integer not null,
  unit_height integer not null,
  power_min_w numeric(10,2) not null,
  power_typ_w numeric(10,2) not null,
  power_max_w numeric(10,2) not null,
  power_peak_w numeric(10,2) not null,
  weight_kg numeric(10,2) not null,
  pixel_width integer not null,
  pixel_height integer not null,
  data_connector text not null,
  power_connector text not null,
  created_at timestamptz not null default now()
);

create table if not exists processor_models (
  id text primary key,
  name text not null,
  ethernet_ports integer not null,
  max_pixels_a8s integer not null,
  max_pixels_a10s integer not null,
  created_at timestamptz not null default now()
);

create table if not exists receiving_cards (
  id text primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists walls (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  width_meters numeric(10,3) not null,
  height_meters numeric(10,3) not null,
  width_units integer not null,
  height_units integer not null,
  voltage integer not null check (voltage in (120, 208)),
  rack_location rack_location not null default 'SL',
  rigging_mode rigging_mode not null default 'flown',
  imag_role imag_role not null default 'none',
  imag_master_wall_id uuid null references walls(id) on delete set null,
  mirrored_port_order boolean not null default false,
  mirrored_circuit_mapping boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists wall_cabinets (
  id uuid primary key default gen_random_uuid(),
  wall_id uuid not null references walls(id) on delete cascade,
  panel_variant_id text not null references panel_variants(id),
  unit_x integer not null,
  unit_y integer not null,
  unit_width integer not null,
  unit_height integer not null,
  label text not null,
  created_at timestamptz not null default now()
);

create index if not exists wall_cabinets_wall_id_idx on wall_cabinets (wall_id);
create index if not exists wall_cabinets_wall_xy_idx on wall_cabinets (wall_id, unit_x, unit_y);

create table if not exists data_plans (
  id uuid primary key default gen_random_uuid(),
  wall_id uuid not null unique references walls(id) on delete cascade,
  plan_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists power_plans (
  id uuid primary key default gen_random_uuid(),
  wall_id uuid not null unique references walls(id) on delete cascade,
  source_type power_source not null,
  voltage integer not null check (voltage in (120, 208)),
  plan_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists revision_notes (
  id uuid primary key default gen_random_uuid(),
  wall_id uuid not null references walls(id) on delete cascade,
  revision_label text not null,
  notes text not null,
  created_at timestamptz not null default now()
);

create table if not exists theme_settings (
  id integer primary key check (id = 1),
  brand_name text not null,
  primary_color text not null,
  accent_color text not null,
  background_color text not null,
  surface_color text not null,
  text_color text not null,
  muted_text_color text not null,
  font_family text not null,
  logo_data_url text null,
  updated_at timestamptz not null default now()
);

-- Demo-friendly permissions; lock down with org-level RLS for production tenants.
alter table panel_variants disable row level security;
alter table processor_models disable row level security;
alter table receiving_cards disable row level security;
alter table walls disable row level security;
alter table wall_cabinets disable row level security;
alter table data_plans disable row level security;
alter table power_plans disable row level security;
alter table revision_notes disable row level security;
alter table theme_settings disable row level security;
