import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { autoFillWall, deriveGrid } from "@/lib/domain/wall-layout";
import { createWall, listCabinetVariants, listWalls } from "@/lib/supabase/queries";

const createWallSchema = z.object({
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
  buildMode: z.union([z.literal("BY_SIZE"), z.literal("BY_UNITS")]),
  widthMeters: z.number().positive().optional(),
  heightMeters: z.number().positive().optional(),
  widthFeet: z.number().positive().optional(),
  heightFeet: z.number().positive().optional(),
  widthUnits: z.number().int().positive().optional(),
  heightUnits: z.number().int().positive().optional(),
  primaryVariantId: z.string().min(2),
  secondaryVariantId: z.string().min(2).nullable().optional(),
  includeMixed: z.boolean().optional(),
  planningThresholdPercent: z.number().min(40).max(95).optional(),
  hardLimitPercent: z.number().min(80).max(120).optional(),
  notes: z.string().optional()
});

export async function GET(request: NextRequest) {
  const showId = request.nextUrl.searchParams.get("showId") ?? undefined;
  const walls = await listWalls(showId);
  return NextResponse.json({ walls });
}

export async function POST(request: NextRequest) {
  try {
    const payload = createWallSchema.parse(await request.json());
    const variants = await listCabinetVariants();
    const variantMap = Object.fromEntries(variants.map((variant) => [variant.id, variant]));

    const primaryVariant = variantMap[payload.primaryVariantId];
    const secondaryVariant = payload.secondaryVariantId ? variantMap[payload.secondaryVariantId] : null;

    if (!primaryVariant) {
      return NextResponse.json({ message: "Primary cabinet variant not found" }, { status: 400 });
    }

    const grid =
      payload.buildMode === "BY_UNITS"
        ? deriveGrid({
            widthUnits: payload.widthUnits,
            heightUnits: payload.heightUnits,
            baseUnitWidthMm: payload.baseUnitWidthMm,
            baseUnitHeightMm: payload.baseUnitHeightMm
          })
        : deriveGrid({
            widthMeters: payload.widthMeters,
            heightMeters: payload.heightMeters,
            widthFeet: payload.widthFeet,
            heightFeet: payload.heightFeet,
            baseUnitWidthMm: payload.baseUnitWidthMm,
            baseUnitHeightMm: payload.baseUnitHeightMm
          });

    const tempWallId = crypto.randomUUID();

    const cells = autoFillWall({
      wallId: tempWallId,
      widthUnits: grid.widthUnits,
      heightUnits: grid.heightUnits,
      baseUnitWidthMm: payload.baseUnitWidthMm,
      baseUnitHeightMm: payload.baseUnitHeightMm,
      primaryVariant,
      secondaryVariant: payload.includeMixed ? secondaryVariant : null,
      secondaryEveryNColumns: 4
    });

    const bundle = await createWall({
      wall: {
        showId: payload.showId,
        name: payload.name,
        deploymentType: payload.deploymentType,
        voltageMode: payload.voltageMode,
        powerStrategy: payload.powerStrategy,
        rackLocation: payload.rackLocation,
        baseUnitWidthMm: payload.baseUnitWidthMm,
        baseUnitHeightMm: payload.baseUnitHeightMm,
        widthUnits: grid.widthUnits,
        heightUnits: grid.heightUnits,
        planningThresholdPercent: payload.planningThresholdPercent ?? 80,
        hardLimitPercent: payload.hardLimitPercent ?? 100,
        notes: payload.notes ?? ""
      },
      cells
    });

    return NextResponse.json({ wall: bundle.wall }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to create wall"
      },
      { status: 400 }
    );
  }
}
