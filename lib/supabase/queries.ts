import {
  defaultCabinetVariants,
  defaultPanelFamilies,
  defaultProcessors,
  defaultReceivingCards,
  defaultShows,
  defaultTheme
} from "@/lib/domain/catalog";
import {
  CabinetVariant,
  DataPlanResult,
  PanelFamily,
  PowerPlanResult,
  ProcessorModel,
  ShowEvent,
  ThemeSettings,
  Wall,
  WallBundle,
  WallCell
} from "@/lib/domain/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

function mapFamilyRow(row: Record<string, unknown>): PanelFamily {
  return {
    id: String(row.id),
    manufacturer: String(row.manufacturer ?? ""),
    familyName: String(row.family_name ?? ""),
    pixelPitchMm: toNumber(row.pixel_pitch_mm),
    notes: String(row.notes ?? ""),
    outdoorRating: String(row.outdoor_rating ?? ""),
    serviceAccess: String(row.service_access ?? ""),
    createdAt: String(row.created_at ?? "")
  };
}

function mapVariantRow(row: Record<string, unknown>): CabinetVariant {
  return {
    id: String(row.id),
    familyId: String(row.family_id),
    variantName: String(row.variant_name ?? ""),
    dimensionsMm: {
      widthMm: toNumber(row.width_mm),
      heightMm: toNumber(row.height_mm),
      depthMm: toNumber(row.depth_mm)
    },
    dimensionsIn: {
      widthIn: toNumber(row.width_in),
      heightIn: toNumber(row.height_in),
      depthIn: toNumber(row.depth_in)
    },
    pixels: {
      width: toNumber(row.pixel_width),
      height: toNumber(row.pixel_height)
    },
    weightKg: toNumber(row.weight_kg),
    weightLbs: toNumber(row.weight_lbs),
    connectors: {
      data: String(row.data_connector ?? ""),
      power: String(row.power_connector ?? "")
    },
    power: {
      min: toNumber(row.power_min_w),
      typ: toNumber(row.power_typ_w),
      max: toNumber(row.power_max_w),
      peak: toNumber(row.power_peak_w)
    },
    peakFactor: row.peak_factor ? toNumber(row.peak_factor) : null,
    recommendedPer20A120: toNumber(row.recommended_per_20a_120),
    recommendedPer20A208: toNumber(row.recommended_per_20a_208),
    recommendedPerSoca120: toNumber(row.recommended_per_soca_120),
    recommendedPerSoca208: toNumber(row.recommended_per_soca_208),
    recommendedPerL2130: toNumber(row.recommended_per_l2130),
    unitWidth: toNumber(row.unit_width),
    unitHeight: toNumber(row.unit_height),
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at ?? "")
  };
}

function mapProcessorRow(row: Record<string, unknown>): ProcessorModel {
  return {
    id: String(row.id),
    manufacturer: String(row.manufacturer ?? ""),
    modelName: String(row.model_name ?? ""),
    ethernetPorts: toNumber(row.ethernet_ports),
    maxPixelsPerPortA8s: toNumber(row.max_pixels_per_port_a8s),
    maxPixelsPerPortA10s: toNumber(row.max_pixels_per_port_a10s),
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at ?? "")
  };
}

function mapShowRow(row: Record<string, unknown>): ShowEvent {
  return {
    id: String(row.id),
    showName: String(row.show_name ?? ""),
    showDate: String(row.show_date ?? ""),
    venue: String(row.venue ?? ""),
    notes: String(row.notes ?? ""),
    revision: String(row.revision ?? "R1"),
    createdAt: String(row.created_at ?? "")
  };
}

function mapWallRow(row: Record<string, unknown>): Wall {
  return {
    id: String(row.id),
    showId: String(row.show_id),
    name: String(row.name ?? ""),
    deploymentType: String(row.deployment_type) as Wall["deploymentType"],
    voltageMode: toNumber(row.voltage_mode) as Wall["voltageMode"],
    powerStrategy: String(row.power_strategy) as Wall["powerStrategy"],
    rackLocation: String(row.rack_location) as Wall["rackLocation"],
    baseUnitWidthMm: toNumber(row.base_unit_width_mm),
    baseUnitHeightMm: toNumber(row.base_unit_height_mm),
    widthUnits: toNumber(row.width_units),
    heightUnits: toNumber(row.height_units),
    planningThresholdPercent: toNumber(row.planning_threshold_percent),
    hardLimitPercent: toNumber(row.hard_limit_percent),
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? "")
  };
}

function mapCellRow(row: Record<string, unknown>): WallCell {
  return {
    id: String(row.id),
    wallId: String(row.wall_id),
    variantId: row.variant_id ? String(row.variant_id) : null,
    label: String(row.label ?? ""),
    unitX: toNumber(row.unit_x),
    unitY: toNumber(row.unit_y),
    unitWidth: toNumber(row.unit_width),
    unitHeight: toNumber(row.unit_height),
    status: String(row.status ?? "active") as WallCell["status"],
    notes: String(row.notes ?? "")
  };
}

async function withClient<T>(fn: (client: ReturnType<typeof createSupabaseServerClient>) => Promise<T>): Promise<T> {
  const client = createSupabaseServerClient();
  return fn(client);
}

export async function listPanelFamilies(): Promise<PanelFamily[]> {
  try {
    return await withClient(async (supabase) => {
      const { data, error } = await supabase.from("panel_families").select("*").order("manufacturer");
      if (error || !data?.length) {
        return defaultPanelFamilies;
      }
      return data.map((row) => mapFamilyRow(row));
    });
  } catch {
    return defaultPanelFamilies;
  }
}

export async function createPanelFamily(family: Omit<PanelFamily, "createdAt">): Promise<PanelFamily> {
  return withClient(async (supabase) => {
    const { data, error } = await supabase
      .from("panel_families")
      .upsert(
        {
          id: family.id,
          manufacturer: family.manufacturer,
          family_name: family.familyName,
          pixel_pitch_mm: family.pixelPitchMm,
          notes: family.notes,
          outdoor_rating: family.outdoorRating,
          service_access: family.serviceAccess
        },
        { onConflict: "id" }
      )
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Unable to save panel family");
    }

    return mapFamilyRow(data);
  });
}

export async function listCabinetVariants(): Promise<CabinetVariant[]> {
  try {
    return await withClient(async (supabase) => {
      const { data, error } = await supabase.from("cabinet_variants").select("*").order("variant_name");
      if (error || !data?.length) {
        return defaultCabinetVariants;
      }
      return data.map((row) => mapVariantRow(row));
    });
  } catch {
    return defaultCabinetVariants;
  }
}

export async function createCabinetVariant(variant: Omit<CabinetVariant, "createdAt">): Promise<CabinetVariant> {
  return withClient(async (supabase) => {
    const { data, error } = await supabase
      .from("cabinet_variants")
      .upsert(
        {
          id: variant.id,
          family_id: variant.familyId,
          variant_name: variant.variantName,
          width_mm: variant.dimensionsMm.widthMm,
          height_mm: variant.dimensionsMm.heightMm,
          depth_mm: variant.dimensionsMm.depthMm,
          width_in: variant.dimensionsIn.widthIn,
          height_in: variant.dimensionsIn.heightIn,
          depth_in: variant.dimensionsIn.depthIn,
          pixel_width: variant.pixels.width,
          pixel_height: variant.pixels.height,
          weight_kg: variant.weightKg,
          weight_lbs: variant.weightLbs,
          data_connector: variant.connectors.data,
          power_connector: variant.connectors.power,
          power_min_w: variant.power.min,
          power_typ_w: variant.power.typ,
          power_max_w: variant.power.max,
          power_peak_w: variant.power.peak,
          peak_factor: variant.peakFactor,
          recommended_per_20a_120: variant.recommendedPer20A120,
          recommended_per_20a_208: variant.recommendedPer20A208,
          recommended_per_soca_120: variant.recommendedPerSoca120,
          recommended_per_soca_208: variant.recommendedPerSoca208,
          recommended_per_l2130: variant.recommendedPerL2130,
          unit_width: variant.unitWidth,
          unit_height: variant.unitHeight,
          notes: variant.notes
        },
        { onConflict: "id" }
      )
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Unable to save cabinet variant");
    }

    return mapVariantRow(data);
  });
}

export async function listProcessors(): Promise<ProcessorModel[]> {
  try {
    return await withClient(async (supabase) => {
      const { data, error } = await supabase.from("processors").select("*").order("model_name");
      if (error || !data?.length) {
        return defaultProcessors;
      }
      return data.map((row) => mapProcessorRow(row));
    });
  } catch {
    return defaultProcessors;
  }
}

export async function createProcessor(processor: Omit<ProcessorModel, "createdAt">): Promise<ProcessorModel> {
  return withClient(async (supabase) => {
    const { data, error } = await supabase
      .from("processors")
      .upsert(
        {
          id: processor.id,
          manufacturer: processor.manufacturer,
          model_name: processor.modelName,
          ethernet_ports: processor.ethernetPorts,
          max_pixels_per_port_a8s: processor.maxPixelsPerPortA8s,
          max_pixels_per_port_a10s: processor.maxPixelsPerPortA10s,
          notes: processor.notes
        },
        { onConflict: "id" }
      )
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Unable to save processor");
    }

    return mapProcessorRow(data);
  });
}

export async function listShows(): Promise<ShowEvent[]> {
  try {
    return await withClient(async (supabase) => {
      const { data, error } = await supabase.from("shows").select("*").order("show_date", { ascending: false });
      if (error || !data?.length) {
        return defaultShows;
      }
      return data.map((row) => mapShowRow(row));
    });
  } catch {
    return defaultShows;
  }
}

export async function createShow(show: Omit<ShowEvent, "id" | "createdAt">): Promise<ShowEvent> {
  return withClient(async (supabase) => {
    const { data, error } = await supabase
      .from("shows")
      .insert({
        show_name: show.showName,
        show_date: show.showDate,
        venue: show.venue,
        notes: show.notes,
        revision: show.revision
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Unable to create show");
    }

    return mapShowRow(data);
  });
}

export async function listWalls(showId?: string): Promise<Wall[]> {
  try {
    return await withClient(async (supabase) => {
      let query = supabase.from("wall_designs").select("*").order("created_at", { ascending: false });
      if (showId) {
        query = query.eq("show_id", showId);
      }
      const { data, error } = await query;
      if (error || !data?.length) {
        return [];
      }
      return data.map((row) => mapWallRow(row));
    });
  } catch {
    return [];
  }
}

export async function createWall(input: { wall: Omit<Wall, "id" | "createdAt" | "updatedAt">; cells: WallCell[] }): Promise<WallBundle> {
  return withClient(async (supabase) => {
    const { data: wallRow, error: wallError } = await supabase
      .from("wall_designs")
      .insert({
        show_id: input.wall.showId,
        name: input.wall.name,
        deployment_type: input.wall.deploymentType,
        voltage_mode: input.wall.voltageMode,
        power_strategy: input.wall.powerStrategy,
        rack_location: input.wall.rackLocation,
        base_unit_width_mm: input.wall.baseUnitWidthMm,
        base_unit_height_mm: input.wall.baseUnitHeightMm,
        width_units: input.wall.widthUnits,
        height_units: input.wall.heightUnits,
        planning_threshold_percent: input.wall.planningThresholdPercent,
        hard_limit_percent: input.wall.hardLimitPercent,
        notes: input.wall.notes
      })
      .select("*")
      .single();

    if (wallError || !wallRow) {
      throw new Error(wallError?.message ?? "Unable to create wall");
    }

    const normalizedCells = input.cells.map((cell) => ({
      id: cell.id,
      wall_id: wallRow.id,
      variant_id: cell.variantId,
      label: cell.label,
      unit_x: cell.unitX,
      unit_y: cell.unitY,
      unit_width: cell.unitWidth,
      unit_height: cell.unitHeight,
      status: cell.status,
      notes: cell.notes
    }));

    if (normalizedCells.length > 0) {
      const { error: cellError } = await supabase.from("wall_cells").insert(normalizedCells);
      if (cellError) {
        throw new Error(cellError.message);
      }
    }

    const { data: showRow } = await supabase.from("shows").select("*").eq("id", wallRow.show_id).single();

    return {
      wall: mapWallRow(wallRow),
      show: showRow ? mapShowRow(showRow) : defaultShows[0],
      cells: input.cells.map((cell) => ({
        ...cell,
        wallId: String(wallRow.id)
      }))
    };
  });
}

export async function getWallBundleById(id: string): Promise<WallBundle | null> {
  try {
    return await withClient(async (supabase) => {
      const [{ data: wallRow, error: wallError }, { data: cellRows }] = await Promise.all([
        supabase.from("wall_designs").select("*").eq("id", id).single(),
        supabase.from("wall_cells").select("*").eq("wall_id", id).order("label")
      ]);

      if (wallError || !wallRow) {
        return null;
      }

      const { data: showRow } = await supabase.from("shows").select("*").eq("id", wallRow.show_id).single();

      return {
        wall: mapWallRow(wallRow),
        show: showRow ? mapShowRow(showRow) : defaultShows[0],
        cells: (cellRows ?? []).map((row) => mapCellRow(row))
      };
    });
  } catch {
    return null;
  }
}

export async function updateWallBundle(input: {
  wall: Wall;
  cells: WallCell[];
  dataPlan?: DataPlanResult;
  powerPlan?: PowerPlanResult;
}): Promise<WallBundle> {
  return withClient(async (supabase) => {
    const { wall } = input;

    const { error: updateError } = await supabase
      .from("wall_designs")
      .update({
        show_id: wall.showId,
        name: wall.name,
        deployment_type: wall.deploymentType,
        voltage_mode: wall.voltageMode,
        power_strategy: wall.powerStrategy,
        rack_location: wall.rackLocation,
        base_unit_width_mm: wall.baseUnitWidthMm,
        base_unit_height_mm: wall.baseUnitHeightMm,
        width_units: wall.widthUnits,
        height_units: wall.heightUnits,
        planning_threshold_percent: wall.planningThresholdPercent,
        hard_limit_percent: wall.hardLimitPercent,
        notes: wall.notes,
        updated_at: new Date().toISOString()
      })
      .eq("id", wall.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    await supabase.from("wall_cells").delete().eq("wall_id", wall.id);
    await supabase.from("data_runs").delete().eq("wall_id", wall.id);
    await supabase.from("power_circuits").delete().eq("wall_id", wall.id);

    if (input.cells.length > 0) {
      const { error: insertCellError } = await supabase.from("wall_cells").insert(
        input.cells.map((cell) => ({
          id: cell.id,
          wall_id: wall.id,
          variant_id: cell.variantId,
          label: cell.label,
          unit_x: cell.unitX,
          unit_y: cell.unitY,
          unit_width: cell.unitWidth,
          unit_height: cell.unitHeight,
          status: cell.status,
          notes: cell.notes
        }))
      );

      if (insertCellError) {
        throw new Error(insertCellError.message);
      }
    }

    if (input.dataPlan?.runs.length) {
      const { error: dataRunError } = await supabase.from("data_runs").insert(
        input.dataPlan.runs.map((run) => ({
          wall_id: wall.id,
          run_number: run.runNumber,
          processor_id: input.dataPlan?.processorId,
          processor_port: run.processorPort,
          port_index: run.portIndex,
          cabinet_ids: run.cabinetIds,
          cabinet_count: run.cabinetCount,
          jumper_count: run.jumperCount,
          estimated_home_run_m: run.estimatedHomeRunMeters,
          estimated_home_run_ft: run.estimatedHomeRunFeet,
          loom_bundle: run.loomBundle,
          port_group: run.portGroup,
          cable_origin: run.cableOrigin,
          pixel_load: run.pixelLoad,
          over_limit: run.overLimit
        }))
      );

      if (dataRunError) {
        throw new Error(dataRunError.message);
      }
    }

    if (input.powerPlan?.circuits.length) {
      const { error: powerCircuitError } = await supabase.from("power_circuits").insert(
        input.powerPlan.circuits.map((circuit) => ({
          wall_id: wall.id,
          strategy: input.powerPlan?.strategy,
          circuit_number: circuit.circuitNumber,
          label: circuit.label,
          phase: circuit.phase,
          breaker_amps: circuit.breakerAmps,
          planning_amps: circuit.planningAmps,
          hard_limit_amps: circuit.hardLimitAmps,
          cabinet_ids: circuit.cabinetIds,
          watts_min: circuit.watts.min,
          watts_typ: circuit.watts.typ,
          watts_max: circuit.watts.max,
          watts_peak: circuit.watts.peak,
          amps_min: circuit.amps.min,
          amps_typ: circuit.amps.typ,
          amps_max: circuit.amps.max,
          amps_peak: circuit.amps.peak,
          over_planning: circuit.overPlanning,
          over_hard_limit: circuit.overHardLimit
        }))
      );

      if (powerCircuitError) {
        throw new Error(powerCircuitError.message);
      }
    }

    const { data: showRow } = await supabase.from("shows").select("*").eq("id", wall.showId).single();

    return {
      wall,
      show: showRow ? mapShowRow(showRow) : defaultShows[0],
      cells: input.cells
    };
  });
}

export async function getTheme(): Promise<ThemeSettings> {
  try {
    return await withClient(async (supabase) => {
      const { data } = await supabase.from("theme_settings").select("*").eq("id", 1).maybeSingle();
      if (!data) {
        return defaultTheme;
      }

      return {
        brandName: String(data.brand_name),
        primaryColor: String(data.primary_color),
        accentColor: String(data.accent_color),
        backgroundColor: String(data.background_color),
        surfaceColor: String(data.surface_color),
        textColor: String(data.text_color),
        mutedTextColor: String(data.muted_text_color),
        fontFamily: String(data.font_family),
        logoDataUrl: data.logo_data_url ? String(data.logo_data_url) : null
      };
    });
  } catch {
    return defaultTheme;
  }
}

export async function saveTheme(theme: ThemeSettings): Promise<ThemeSettings> {
  return withClient(async (supabase) => {
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
  });
}

export async function getBootstrapData() {
  const [families, variants, processors, shows, walls, theme] = await Promise.all([
    listPanelFamilies(),
    listCabinetVariants(),
    listProcessors(),
    listShows(),
    listWalls(),
    getTheme()
  ]);

  return {
    families,
    variants,
    processors,
    receivingCards: defaultReceivingCards,
    shows,
    walls,
    theme
  };
}

// Legacy helper to keep older callers compatible while pages are migrated.
export async function getReferenceData() {
  const [families, variants, processors] = await Promise.all([
    listPanelFamilies(),
    listCabinetVariants(),
    listProcessors()
  ]);

  return {
    families,
    panels: variants,
    variants,
    processors,
    receivingCards: defaultReceivingCards
  };
}
