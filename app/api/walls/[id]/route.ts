import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWallById, getStoredPlans, saveDataPlan, savePowerPlan, updateWall } from "@/lib/supabase/queries";

const updateWallSchema = z.object({
  wall: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    widthMeters: z.number().positive(),
    heightMeters: z.number().positive(),
    widthUnits: z.number().int().positive(),
    heightUnits: z.number().int().positive(),
    voltage: z.union([z.literal(120), z.literal(208)]),
    rackLocation: z.union([z.literal("SL"), z.literal("SR"), z.literal("USC"), z.literal("FOH")]),
    riggingMode: z.union([z.literal("ground"), z.literal("flown")]),
    imagRole: z.union([z.literal("none"), z.literal("master"), z.literal("mirror")]),
    imagMasterWallId: z.string().uuid().nullable().optional(),
    mirroredPortOrder: z.boolean(),
    mirroredCircuitMapping: z.boolean(),
    cabinets: z.array(
      z.object({
        id: z.string(),
        panelVariantId: z.string(),
        x: z.number().int().nonnegative(),
        y: z.number().int().nonnegative(),
        unitWidth: z.number().int().positive(),
        unitHeight: z.number().int().positive(),
        label: z.string().min(1)
      })
    )
  }),
  dataPlan: z.unknown().optional(),
  powerPlan: z
    .object({
      sourceType: z.string(),
      voltage: z.number(),
      plan: z.unknown()
    })
    .optional()
});

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  const wall = await getWallById(id);

  if (!wall) {
    return NextResponse.json({ message: "Wall not found" }, { status: 404 });
  }

  const plans = await getStoredPlans(id);
  return NextResponse.json({ wall, plans });
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const payload = updateWallSchema.parse(body);

    if (payload.wall.id !== id) {
      return NextResponse.json({ message: "Wall ID mismatch in request" }, { status: 400 });
    }

    await updateWall(payload.wall);

    if (payload.dataPlan) {
      await saveDataPlan(payload.wall.id, payload.dataPlan);
    }

    if (payload.powerPlan) {
      await savePowerPlan(
        payload.wall.id,
        payload.powerPlan.plan,
        payload.powerPlan.sourceType,
        payload.powerPlan.voltage
      );
    }

    return NextResponse.json({ wall: payload.wall });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Failed to update wall"
      },
      { status: 400 }
    );
  }
}
