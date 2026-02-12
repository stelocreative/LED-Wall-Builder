import { defaultPanelVariants, defaultProcessors, defaultReceivingCards, defaultTheme } from "@/lib/domain/catalog";
import { ThemeSettings, Wall } from "@/lib/domain/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface DbWallRow {
  id: string;
  name: string;
  width_meters: number;
  height_meters: number;
  width_units: number;
  height_units: number;
  voltage: number;
  rack_location: "SL" | "SR" | "USC" | "FOH";
  rigging_mode: "ground" | "flown";
  imag_role: "none" | "master" | "mirror";
  imag_master_wall_id: string | null;
  mirrored_port_order: boolean;
  mirrored_circuit_mapping: boolean;
}

interface DbCabinetRow {
  id: string;
  wall_id: string;
  panel_variant_id: string;
  unit_x: number;
  unit_y: number;
  unit_width: number;
  unit_height: number;
  label: string;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

export async function getReferenceData() {
  try {
    const supabase = createSupabaseServerClient();
    const [panelResponse, processorResponse, receivingResponse] = await Promise.all([
      supabase.from("panel_variants").select("*").order("name", { ascending: true }),
      supabase.from("processor_models").select("*").order("name", { ascending: true }),
      supabase.from("receiving_cards").select("*").order("name", { ascending: true })
    ]);

    const panels = panelResponse.data?.length
      ? panelResponse.data.map((row) => ({
          id: row.id,
          name: row.name,
          widthMm: toNumber(row.width_mm),
          heightMm: toNumber(row.height_mm),
          unitWidth: toNumber(row.unit_width),
          unitHeight: toNumber(row.unit_height),
          power: {
            min: toNumber(row.power_min_w),
            typ: toNumber(row.power_typ_w),
            max: toNumber(row.power_max_w),
            peak: toNumber(row.power_peak_w)
          },
          weightKg: toNumber(row.weight_kg),
          pixels: {
            width: toNumber(row.pixel_width),
            height: toNumber(row.pixel_height)
          },
          connectors: {
            data: row.data_connector,
            power: row.power_connector
          }
        }))
      : defaultPanelVariants;

    const processors = processorResponse.data?.length
      ? processorResponse.data.map((row) => ({
          id: row.id,
          name: row.name,
          ethernetPorts: toNumber(row.ethernet_ports),
          maxPixelsPerPort: {
            A8s: toNumber(row.max_pixels_a8s),
            A10s: toNumber(row.max_pixels_a10s)
          }
        }))
      : defaultProcessors;

    const receivingCards = receivingResponse.data?.length
      ? receivingResponse.data.map((row) => row.name)
      : defaultReceivingCards;

    return { panels, processors, receivingCards };
  } catch {
    return {
      panels: defaultPanelVariants,
      processors: defaultProcessors,
      receivingCards: defaultReceivingCards
    };
  }
}

export async function listWalls(): Promise<Wall[]> {
  try {
    const supabase = createSupabaseServerClient();

    const { data: walls, error } = await supabase.from("walls").select("*").order("created_at", { ascending: false });
    if (error || !walls?.length) {
      return [];
    }

    const wallIds = walls.map((wall) => wall.id);
    const { data: cabinets } = await supabase
      .from("wall_cabinets")
      .select("*")
      .in("wall_id", wallIds)
      .order("label", { ascending: true });

    return walls.map((wallRow) => mapWallRow(wallRow, cabinets ?? []));
  } catch {
    return [];
  }
}

export async function getWallById(id: string): Promise<Wall | null> {
  try {
    const supabase = createSupabaseServerClient();

    const [{ data: wall, error: wallError }, { data: cabinets, error: cabinetError }] = await Promise.all([
      supabase.from("walls").select("*").eq("id", id).single(),
      supabase.from("wall_cabinets").select("*").eq("wall_id", id).order("label", { ascending: true })
    ]);

    if (wallError || !wall || cabinetError) {
      return null;
    }

    return mapWallRow(wall, cabinets ?? []);
  } catch {
    return null;
  }
}

export async function createWall(wall: Omit<Wall, "id">): Promise<Wall> {
  const supabase = createSupabaseServerClient();

  const { data: wallRow, error: wallError } = await supabase
    .from("walls")
    .insert({
      name: wall.name,
      width_meters: wall.widthMeters,
      height_meters: wall.heightMeters,
      width_units: wall.widthUnits,
      height_units: wall.heightUnits,
      voltage: wall.voltage,
      rack_location: wall.rackLocation,
      rigging_mode: wall.riggingMode,
      imag_role: wall.imagRole,
      imag_master_wall_id: wall.imagMasterWallId ?? null,
      mirrored_port_order: wall.mirroredPortOrder,
      mirrored_circuit_mapping: wall.mirroredCircuitMapping
    })
    .select("*")
    .single();

  if (wallError || !wallRow) {
    throw new Error(wallError?.message ?? "Unable to create wall");
  }

  if (wall.cabinets.length > 0) {
    const { error: cabinetError } = await supabase.from("wall_cabinets").insert(
      wall.cabinets.map((cabinet) => ({
        wall_id: wallRow.id,
        panel_variant_id: cabinet.panelVariantId,
        unit_x: cabinet.x,
        unit_y: cabinet.y,
        unit_width: cabinet.unitWidth,
        unit_height: cabinet.unitHeight,
        label: cabinet.label
      }))
    );

    if (cabinetError) {
      throw new Error(cabinetError.message);
    }
  }

  return {
    id: wallRow.id,
    ...wall
  };
}

export async function updateWall(wall: Wall): Promise<Wall> {
  const supabase = createSupabaseServerClient();

  const { error: wallError } = await supabase
    .from("walls")
    .update({
      name: wall.name,
      width_meters: wall.widthMeters,
      height_meters: wall.heightMeters,
      width_units: wall.widthUnits,
      height_units: wall.heightUnits,
      voltage: wall.voltage,
      rack_location: wall.rackLocation,
      rigging_mode: wall.riggingMode,
      imag_role: wall.imagRole,
      imag_master_wall_id: wall.imagMasterWallId ?? null,
      mirrored_port_order: wall.mirroredPortOrder,
      mirrored_circuit_mapping: wall.mirroredCircuitMapping,
      updated_at: new Date().toISOString()
    })
    .eq("id", wall.id);

  if (wallError) {
    throw new Error(wallError.message);
  }

  const { error: deleteError } = await supabase.from("wall_cabinets").delete().eq("wall_id", wall.id);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (wall.cabinets.length > 0) {
    const { error: insertError } = await supabase.from("wall_cabinets").insert(
      wall.cabinets.map((cabinet) => ({
        wall_id: wall.id,
        panel_variant_id: cabinet.panelVariantId,
        unit_x: cabinet.x,
        unit_y: cabinet.y,
        unit_width: cabinet.unitWidth,
        unit_height: cabinet.unitHeight,
        label: cabinet.label
      }))
    );

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  return wall;
}

export async function saveDataPlan(wallId: string, payload: unknown): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { data: existing } = await supabase.from("data_plans").select("id").eq("wall_id", wallId).maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("data_plans")
      .update({ plan_json: payload, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const { error } = await supabase.from("data_plans").insert({ wall_id: wallId, plan_json: payload });
  if (error) {
    throw new Error(error.message);
  }
}

export async function savePowerPlan(wallId: string, payload: unknown, sourceType: string, voltage: number): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { data: existing } = await supabase.from("power_plans").select("id").eq("wall_id", wallId).maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("power_plans")
      .update({
        source_type: sourceType,
        voltage,
        plan_json: payload,
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id);
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const { error } = await supabase.from("power_plans").insert({
    wall_id: wallId,
    source_type: sourceType,
    voltage,
    plan_json: payload
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getStoredPlans(wallId: string): Promise<{ dataPlan: unknown; powerPlan: unknown } | null> {
  try {
    const supabase = createSupabaseServerClient();
    const [{ data: dataPlan }, { data: powerPlan }] = await Promise.all([
      supabase.from("data_plans").select("plan_json").eq("wall_id", wallId).maybeSingle(),
      supabase.from("power_plans").select("plan_json").eq("wall_id", wallId).maybeSingle()
    ]);

    return {
      dataPlan: dataPlan?.plan_json ?? null,
      powerPlan: powerPlan?.plan_json ?? null
    };
  } catch {
    return null;
  }
}

export async function getTheme(): Promise<ThemeSettings> {
  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase.from("theme_settings").select("*").eq("id", 1).maybeSingle();

    if (!data) {
      return defaultTheme;
    }

    return {
      brandName: data.brand_name,
      primaryColor: data.primary_color,
      accentColor: data.accent_color,
      backgroundColor: data.background_color,
      surfaceColor: data.surface_color,
      textColor: data.text_color,
      mutedTextColor: data.muted_text_color,
      fontFamily: data.font_family,
      logoDataUrl: data.logo_data_url
    };
  } catch {
    return defaultTheme;
  }
}

export async function saveTheme(theme: ThemeSettings): Promise<ThemeSettings> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("theme_settings").upsert(
    {
      id: 1,
      brand_name: theme.brandName,
      primary_color: theme.primaryColor,
      accent_color: theme.accentColor,
      background_color: theme.backgroundColor,
      surface_color: theme.surfaceColor,
      text_color: theme.textColor,
      muted_text_color: theme.mutedTextColor,
      font_family: theme.fontFamily,
      logo_data_url: theme.logoDataUrl ?? null,
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );

  if (error) {
    throw new Error(error.message);
  }

  return theme;
}

function mapWallRow(wallRow: DbWallRow, cabinetRows: DbCabinetRow[]): Wall {
  return {
    id: wallRow.id,
    name: wallRow.name,
    widthMeters: toNumber(wallRow.width_meters),
    heightMeters: toNumber(wallRow.height_meters),
    widthUnits: toNumber(wallRow.width_units),
    heightUnits: toNumber(wallRow.height_units),
    voltage: toNumber(wallRow.voltage) as 120 | 208,
    rackLocation: wallRow.rack_location,
    riggingMode: wallRow.rigging_mode,
    imagRole: wallRow.imag_role,
    imagMasterWallId: wallRow.imag_master_wall_id,
    mirroredPortOrder: wallRow.mirrored_port_order,
    mirroredCircuitMapping: wallRow.mirrored_circuit_mapping,
    cabinets: cabinetRows
      .filter((cabinet) => cabinet.wall_id === wallRow.id)
      .map((cabinet) => ({
        id: cabinet.id,
        panelVariantId: cabinet.panel_variant_id,
        x: toNumber(cabinet.unit_x),
        y: toNumber(cabinet.unit_y),
        unitWidth: toNumber(cabinet.unit_width),
        unitHeight: toNumber(cabinet.unit_height),
        label: cabinet.label
      }))
  };
}
