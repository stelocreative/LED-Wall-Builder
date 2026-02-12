create extension if not exists pgcrypto;

DO $$ BEGIN
  CREATE TYPE deployment_type AS ENUM ('GROUND_STACK', 'FLOWN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE rack_location AS ENUM ('SL', 'SR', 'USC', 'FOH');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE power_strategy_v2 AS ENUM ('EDISON_20A', 'L21_30', 'SOCAPEX', 'CAMLOCK_DISTRO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cell_status AS ENUM ('active', 'spare', 'void', 'cutout');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

create table if not exists panel_families (
  id text primary key,
  manufacturer text not null,
  family_name text not null,
  pixel_pitch_mm numeric(10,4) not null,
  notes text not null default '',
  outdoor_rating text not null default '',
  service_access text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists cabinet_variants (
  id text primary key,
  family_id text not null references panel_families(id) on delete cascade,
  variant_name text not null,
  width_mm integer not null,
  height_mm integer not null,
  depth_mm integer not null,
  width_in numeric(10,3) not null,
  height_in numeric(10,3) not null,
  depth_in numeric(10,3) not null,
  pixel_width integer not null,
  pixel_height integer not null,
  weight_kg numeric(10,3) not null,
  weight_lbs numeric(10,3) not null,
  data_connector text not null,
  power_connector text not null,
  power_min_w numeric(10,3) not null,
  power_typ_w numeric(10,3) not null,
  power_max_w numeric(10,3) not null,
  power_peak_w numeric(10,3) not null,
  peak_factor numeric(10,3) null,
  recommended_per_20a_120 integer not null,
  recommended_per_20a_208 integer not null,
  recommended_per_soca_120 integer not null,
  recommended_per_soca_208 integer not null,
  recommended_per_l2130 integer not null,
  unit_width integer not null,
  unit_height integer not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists processors (
  id text primary key,
  manufacturer text not null,
  model_name text not null,
  ethernet_ports integer not null,
  max_pixels_per_port_a8s integer not null,
  max_pixels_per_port_a10s integer not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists shows (
  id uuid primary key default gen_random_uuid(),
  show_name text not null,
  show_date date not null,
  venue text not null,
  notes text not null default '',
  revision text not null default 'R1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists wall_designs (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references shows(id) on delete cascade,
  name text not null,
  deployment_type deployment_type not null default 'FLOWN',
  voltage_mode integer not null check (voltage_mode in (120, 208)),
  power_strategy power_strategy_v2 not null default 'L21_30',
  rack_location rack_location not null default 'SL',
  base_unit_width_mm integer not null default 500,
  base_unit_height_mm integer not null default 500,
  width_units integer not null,
  height_units integer not null,
  planning_threshold_percent numeric(6,2) not null default 80,
  hard_limit_percent numeric(6,2) not null default 100,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wall_designs_show_id_idx on wall_designs(show_id);

create table if not exists wall_cells (
  id uuid primary key default gen_random_uuid(),
  wall_id uuid not null references wall_designs(id) on delete cascade,
  variant_id text null references cabinet_variants(id),
  label text not null,
  unit_x integer not null,
  unit_y integer not null,
  unit_width integer not null,
  unit_height integer not null,
  status cell_status not null default 'active',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists wall_cells_wall_id_idx on wall_cells(wall_id);
create index if not exists wall_cells_wall_xy_idx on wall_cells(wall_id, unit_x, unit_y);

create table if not exists data_runs (
  id uuid primary key default gen_random_uuid(),
  wall_id uuid not null references wall_designs(id) on delete cascade,
  run_number integer not null,
  processor_id text not null references processors(id),
  processor_port text not null,
  port_index integer not null,
  cabinet_ids uuid[] not null,
  cabinet_count integer not null,
  jumper_count integer not null,
  estimated_home_run_m numeric(10,3) not null,
  estimated_home_run_ft numeric(10,3) not null,
  loom_bundle integer not null,
  port_group integer not null,
  cable_origin text not null,
  pixel_load integer not null,
  over_limit boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wall_id, run_number)
);

create table if not exists power_circuits (
  id uuid primary key default gen_random_uuid(),
  wall_id uuid not null references wall_designs(id) on delete cascade,
  strategy power_strategy_v2 not null,
  circuit_number integer not null,
  label text not null,
  phase text not null,
  breaker_amps numeric(10,3) not null,
  planning_amps numeric(10,3) not null,
  hard_limit_amps numeric(10,3) not null,
  cabinet_ids uuid[] not null,
  watts_min numeric(12,3) not null,
  watts_typ numeric(12,3) not null,
  watts_max numeric(12,3) not null,
  watts_peak numeric(12,3) not null,
  amps_min numeric(12,3) not null,
  amps_typ numeric(12,3) not null,
  amps_max numeric(12,3) not null,
  amps_peak numeric(12,3) not null,
  over_planning boolean not null default false,
  over_hard_limit boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wall_id, circuit_number)
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

-- Demo-friendly default permissions; enable RLS when multi-tenant auth is ready.
alter table panel_families disable row level security;
alter table cabinet_variants disable row level security;
alter table processors disable row level security;
alter table shows disable row level security;
alter table wall_designs disable row level security;
alter table wall_cells disable row level security;
alter table data_runs disable row level security;
alter table power_circuits disable row level security;
alter table theme_settings disable row level security;
