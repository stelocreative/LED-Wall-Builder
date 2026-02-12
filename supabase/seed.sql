insert into panel_variants (
  id,
  name,
  width_mm,
  height_mm,
  unit_width,
  unit_height,
  power_min_w,
  power_typ_w,
  power_max_w,
  power_peak_w,
  weight_kg,
  pixel_width,
  pixel_height,
  data_connector,
  power_connector
)
values
  ('P500x500', '500x500 Cabinet', 500, 500, 1, 1, 55, 95, 130, 160, 8.2, 192, 192, 'Ethercon In/Out', 'PowerCON True1'),
  ('P500x1000', '500x1000 Cabinet', 500, 1000, 1, 2, 95, 180, 250, 320, 13.9, 192, 384, 'Ethercon In/Out', 'PowerCON True1')
on conflict (id) do update
set
  name = excluded.name,
  width_mm = excluded.width_mm,
  height_mm = excluded.height_mm,
  unit_width = excluded.unit_width,
  unit_height = excluded.unit_height,
  power_min_w = excluded.power_min_w,
  power_typ_w = excluded.power_typ_w,
  power_max_w = excluded.power_max_w,
  power_peak_w = excluded.power_peak_w,
  weight_kg = excluded.weight_kg,
  pixel_width = excluded.pixel_width,
  pixel_height = excluded.pixel_height,
  data_connector = excluded.data_connector,
  power_connector = excluded.power_connector;

insert into processor_models (id, name, ethernet_ports, max_pixels_a8s, max_pixels_a10s)
values
  ('MX20', 'Novastar MX20', 10, 650000, 850000),
  ('MX30', 'Novastar MX30', 16, 700000, 900000),
  ('MX40', 'Novastar MX40', 20, 750000, 950000)
on conflict (id) do update
set
  name = excluded.name,
  ethernet_ports = excluded.ethernet_ports,
  max_pixels_a8s = excluded.max_pixels_a8s,
  max_pixels_a10s = excluded.max_pixels_a10s;

insert into receiving_cards (id, name)
values
  ('A8s', 'A8s'),
  ('A10s', 'A10s')
on conflict (id) do update
set name = excluded.name;

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

-- Optional demo wall
insert into walls (
  id,
  name,
  width_meters,
  height_meters,
  width_units,
  height_units,
  voltage,
  rack_location,
  rigging_mode,
  imag_role,
  mirrored_port_order,
  mirrored_circuit_mapping
)
values (
  '00000000-0000-0000-0000-000000000001',
  'Demo Main Wall',
  12.0,
  6.5,
  24,
  13,
  208,
  'SL',
  'flown',
  'master',
  false,
  false
)
on conflict (id) do nothing;

insert into wall_cabinets (
  wall_id,
  panel_variant_id,
  unit_x,
  unit_y,
  unit_width,
  unit_height,
  label
)
values
  ('00000000-0000-0000-0000-000000000001', 'P500x500', 0, 0, 1, 1, 'C001'),
  ('00000000-0000-0000-0000-000000000001', 'P500x500', 1, 0, 1, 1, 'C002'),
  ('00000000-0000-0000-0000-000000000001', 'P500x1000', 2, 0, 1, 2, 'C003')
on conflict do nothing;
