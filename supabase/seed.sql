insert into panel_families (
  id,
  manufacturer,
  family_name,
  pixel_pitch_mm,
  notes,
  outdoor_rating,
  service_access
)
values
  (
    'absen-pl39-v2',
    'Absen',
    'PL3.9 Pro V2',
    3.9,
    'Touring family with stacked and flown support.',
    'IP65 front / IP54 rear',
    'Front + Rear'
  )
on conflict (id) do update
set
  manufacturer = excluded.manufacturer,
  family_name = excluded.family_name,
  pixel_pitch_mm = excluded.pixel_pitch_mm,
  notes = excluded.notes,
  outdoor_rating = excluded.outdoor_rating,
  service_access = excluded.service_access;

insert into cabinet_variants (
  id,
  family_id,
  variant_name,
  width_mm,
  height_mm,
  depth_mm,
  width_in,
  height_in,
  depth_in,
  pixel_width,
  pixel_height,
  weight_kg,
  weight_lbs,
  data_connector,
  power_connector,
  power_min_w,
  power_typ_w,
  power_max_w,
  power_peak_w,
  peak_factor,
  recommended_per_20a_120,
  recommended_per_20a_208,
  recommended_per_soca_120,
  recommended_per_soca_208,
  recommended_per_l2130,
  unit_width,
  unit_height,
  notes
)
values
  (
    'absen-pl39-v2-500x500',
    'absen-pl39-v2',
    '500x500',
    500,
    500,
    86,
    19.685,
    19.685,
    3.386,
    128,
    128,
    8.8,
    19.401,
    'EtherCON In/Out',
    'PowerCON True1 In/Out',
    55,
    110,
    180,
    210,
    null,
    8,
    13,
    8,
    13,
    16,
    1,
    1,
    'Standard half-meter touring cabinet'
  ),
  (
    'absen-pl39-v2-500x1000',
    'absen-pl39-v2',
    '500x1000',
    500,
    1000,
    86,
    19.685,
    39.370,
    3.386,
    128,
    256,
    14.6,
    32.187,
    'EtherCON In/Out',
    'PowerCON True1 In/Out',
    100,
    205,
    340,
    390,
    null,
    4,
    7,
    4,
    7,
    9,
    1,
    2,
    'Tall touring cabinet for mixed walls'
  )
on conflict (id) do update
set
  family_id = excluded.family_id,
  variant_name = excluded.variant_name,
  width_mm = excluded.width_mm,
  height_mm = excluded.height_mm,
  depth_mm = excluded.depth_mm,
  width_in = excluded.width_in,
  height_in = excluded.height_in,
  depth_in = excluded.depth_in,
  pixel_width = excluded.pixel_width,
  pixel_height = excluded.pixel_height,
  weight_kg = excluded.weight_kg,
  weight_lbs = excluded.weight_lbs,
  data_connector = excluded.data_connector,
  power_connector = excluded.power_connector,
  power_min_w = excluded.power_min_w,
  power_typ_w = excluded.power_typ_w,
  power_max_w = excluded.power_max_w,
  power_peak_w = excluded.power_peak_w,
  peak_factor = excluded.peak_factor,
  recommended_per_20a_120 = excluded.recommended_per_20a_120,
  recommended_per_20a_208 = excluded.recommended_per_20a_208,
  recommended_per_soca_120 = excluded.recommended_per_soca_120,
  recommended_per_soca_208 = excluded.recommended_per_soca_208,
  recommended_per_l2130 = excluded.recommended_per_l2130,
  unit_width = excluded.unit_width,
  unit_height = excluded.unit_height,
  notes = excluded.notes;

insert into processors (
  id,
  manufacturer,
  model_name,
  ethernet_ports,
  max_pixels_per_port_a8s,
  max_pixels_per_port_a10s,
  notes
)
values
  ('novastar-mx20', 'Novastar', 'MX20', 10, 650000, 850000, 'Standard touring processor'),
  ('novastar-mx30', 'Novastar', 'MX30', 16, 700000, 900000, 'High capacity processor'),
  ('novastar-mx40', 'Novastar', 'MX40', 20, 750000, 950000, 'Large format processor')
on conflict (id) do update
set
  manufacturer = excluded.manufacturer,
  model_name = excluded.model_name,
  ethernet_ports = excluded.ethernet_ports,
  max_pixels_per_port_a8s = excluded.max_pixels_per_port_a8s,
  max_pixels_per_port_a10s = excluded.max_pixels_per_port_a10s,
  notes = excluded.notes;

insert into shows (
  id,
  show_name,
  show_date,
  venue,
  notes,
  revision
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Demo Arena Show',
    '2026-02-12',
    'Example Arena',
    'Initial seeded show for testing',
    'R1'
  )
on conflict (id) do update
set
  show_name = excluded.show_name,
  show_date = excluded.show_date,
  venue = excluded.venue,
  notes = excluded.notes,
  revision = excluded.revision,
  updated_at = now();

insert into wall_designs (
  id,
  show_id,
  name,
  deployment_type,
  voltage_mode,
  power_strategy,
  rack_location,
  base_unit_width_mm,
  base_unit_height_mm,
  width_units,
  height_units,
  planning_threshold_percent,
  hard_limit_percent,
  notes
)
values
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Upstage Main Wall',
    'FLOWN',
    208,
    'L21_30',
    'SL',
    500,
    500,
    24,
    12,
    80,
    100,
    'Seeded mixed wall layout'
  )
on conflict (id) do update
set
  show_id = excluded.show_id,
  name = excluded.name,
  deployment_type = excluded.deployment_type,
  voltage_mode = excluded.voltage_mode,
  power_strategy = excluded.power_strategy,
  rack_location = excluded.rack_location,
  base_unit_width_mm = excluded.base_unit_width_mm,
  base_unit_height_mm = excluded.base_unit_height_mm,
  width_units = excluded.width_units,
  height_units = excluded.height_units,
  planning_threshold_percent = excluded.planning_threshold_percent,
  hard_limit_percent = excluded.hard_limit_percent,
  notes = excluded.notes,
  updated_at = now();

insert into wall_cells (
  id,
  wall_id,
  variant_id,
  label,
  unit_x,
  unit_y,
  unit_width,
  unit_height,
  status,
  notes
)
values
  ('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222222', 'absen-pl39-v2-500x500', 'C001', 0, 0, 1, 1, 'active', ''),
  ('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222222', 'absen-pl39-v2-500x500', 'C002', 1, 0, 1, 1, 'active', ''),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'absen-pl39-v2-500x1000', 'C003', 2, 0, 1, 2, 'active', '')
on conflict (id) do update
set
  wall_id = excluded.wall_id,
  variant_id = excluded.variant_id,
  label = excluded.label,
  unit_x = excluded.unit_x,
  unit_y = excluded.unit_y,
  unit_width = excluded.unit_width,
  unit_height = excluded.unit_height,
  status = excluded.status,
  notes = excluded.notes;

insert into theme_settings (
  id,
  brand_name,
  primary_color,
  accent_color,
  background_color,
  surface_color,
  text_color,
  muted_text_color,
  font_family,
  logo_data_url
)
values (
  1,
  'LED Wall Deployment Designer',
  '#20A4F3',
  '#F05D23',
  '#0A1018',
  '#111C2B',
  '#F7FAFC',
  '#9FB1C6',
  '''Space Grotesk'', ''Segoe UI'', sans-serif',
  null
)
on conflict (id) do update
set
  brand_name = excluded.brand_name,
  primary_color = excluded.primary_color,
  accent_color = excluded.accent_color,
  background_color = excluded.background_color,
  surface_color = excluded.surface_color,
  text_color = excluded.text_color,
  muted_text_color = excluded.muted_text_color,
  font_family = excluded.font_family,
  logo_data_url = excluded.logo_data_url,
  updated_at = now();
