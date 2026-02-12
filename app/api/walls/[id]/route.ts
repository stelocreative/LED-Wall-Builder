import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWallBundleById, updateWallBundle } from "@/lib/supabase/queries";

const wallSchema = z.object({
  id: z.string().uuid(),
  showId: z.string().uuid(),
  name: z.string().min(2),
  deploymentType: z.union([z.literal("GROUND_STACK"), z.literal("FLOWN")]),
  voltageMode: z.union([z.literal(120), z.literal(208)]),
  powerStrategy: z.union([
    z.literal("EDISON_20A"),
    z.literal("L21_30"),
    z.literal("SOCAPEX"),
    z.literal("CAMLOCK_DISTRO")
  ]),
  rackLocation: z.union([z.literal("SL"), z.literal("SR"), z.literal("USC"), z.literal("FOH")]),
  baseUnitWidthMm: z.number().int().positive(),
  baseUnitHeightMm: z.number().int().positive(),
  widthUnits: z.number().int().positive(),
  heightUnits: z.number().int().positive(),
  planningThresholdPercent: z.number().min(40).max(95),
  hardLimitPercent: z.number().min(80).max(120),
  notes: z.string()
});

const wallCellSchema = z.object({
  id: z.string(),
  wallId: z.string(),
  variantId: z.string().nullable(),
  label: z.string().min(1),
  unitX: z.number().int().nonnegative(),
  unitY: z.number().int().nonnegative(),
  unitWidth: z.number().int().positive(),
  unitHeight: z.number().int().positive(),
  status: z.union([z.literal("active"), z.literal("spare"), z.literal("void"), z.literal("cutout")]),
  notes: z.string()
});

const runSchema = z.object({
  runNumber: z.number().int().positive(),
  processorPort: z.string(),
  portIndex: z.number().int().nonnegative(),
  cabinetIds: z.array(z.string()),
  cabinetCount: z.number().int().nonnegative(),
  jumperCount: z.number().int().nonnegative(),
  estimatedHomeRunMeters: z.number().nonnegative(),
  estimatedHomeRunFeet: z.number().nonnegative(),
  loomBundle: z.number().int().positive(),
  portGroup: z.number().int().positive(),
  cableOrigin: z.union([z.literal("ground"), z.literal("air")]),
  pixelLoad: z.number().int().nonnegative(),
  overLimit: z.boolean()
});

const dataPlanSchema = z.object({
  processorId: z.string(),
  receivingCard: z.union([z.literal("A8s"), z.literal("A10s")]),
  dataPathMode: z.union([z.literal("SNAKE_ROWS"), z.literal("SNAKE_COLUMNS"), z.literal("CUSTOM")]),
  rackLocation: z.union([z.literal("SL"), z.literal("SR"), z.literal("USC"), z.literal("FOH")]),
  runs: z.array(runSchema),
  totalPixels: z.number().int().nonnegative(),
  warnings: z.array(z.string())
});

const powerProfileSchema = z.object({
  min: z.number(),
  typ: z.number(),
  max: z.number(),
  peak: z.number()
});

const circuitSchema = z.object({
  circuitNumber: z.number().int().positive(),
  label: z.string(),
  phase: z.string(),
  breakerAmps: z.number().positive(),
  planningAmps: z.number().positive(),
  hardLimitAmps: z.number().positive(),
  cabinetIds: z.array(z.string()),
  watts: powerProfileSchema,
  amps: powerProfileSchema,
  overPlanning: z.boolean(),
  overHardLimit: z.boolean()
});

const powerPlanSchema = z.object({
  strategy: z.union([
    z.literal("EDISON_20A"),
    z.literal("L21_30"),
    z.literal("SOCAPEX"),
    z.literal("CAMLOCK_DISTRO")
  ]),
  voltageMode: z.union([z.literal(120), z.literal(208)]),
  groupingMode: z.union([z.literal("BALANCED"), z.literal("MIN_HOME_RUNS"), z.literal("BY_SECTION")]),
  thresholdPlanningPercent: z.number(),
  thresholdHardLimitPercent: z.number(),
  circuits: z.array(circuitSchema),
  totalsWatts: powerProfileSchema,
  totalsAmps: powerProfileSchema,
  estimatedCircuitCount: z.number().int().positive(),
  socapexRunsRequired: z.number().int().nonnegative(),
  socapexCircuitsUsed: z.number().int().nonnegative(),
  warnings: z.array(z.string())
});

const updateSchema = z.object({
  wall: wallSchema,
  cells: z.array(wallCellSchema),
  dataPlan: dataPlanSchema.optional(),
  powerPlan: powerPlanSchema.optional()
});

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  const bundle = await getWallBundleById(id);

  if (!bundle) {
    return NextResponse.json({ message: "Wall not found" }, { status: 404 });
  }

  return NextResponse.json(bundle);
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const payload = updateSchema.parse(await request.json());

    if (payload.wall.id !== id) {
      return NextResponse.json({ message: "Wall ID mismatch" }, { status: 400 });
    }

    const saved = await updateWallBundle(payload);
    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to update wall"
      },
      { status: 400 }
    );
  }
}
