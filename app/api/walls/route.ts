import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deriveWallGridFromMeters, autoPopulateWall } from "@/lib/domain/wall-layout";
import { createWall, getReferenceData, listWalls } from "@/lib/supabase/queries";

const createWallSchema = z.object({
  name: z.string().min(1),
  widthMeters: z.number().positive(),
  heightMeters: z.number().positive(),
  includeTallMix: z.boolean().optional(),
  primaryVariantId: z.string().optional()
});

export async function GET() {
  const walls = await listWalls();
  return NextResponse.json({ walls });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = createWallSchema.parse(body);
    const { panels } = await getReferenceData();
    const panelMap = Object.fromEntries(panels.map((panel) => [panel.id, panel]));

    const { widthUnits, heightUnits, snappedWidthMeters, snappedHeightMeters } = deriveWallGridFromMeters(
      payload.widthMeters,
      payload.heightMeters
    );

    const cabinets = autoPopulateWall(widthUnits, heightUnits, panelMap, {
      primaryVariantId: payload.primaryVariantId,
      includeTallMix: payload.includeTallMix,
      tallEveryNColumns: 3
    });

    const wall = await createWall({
      name: payload.name,
      widthMeters: snappedWidthMeters,
      heightMeters: snappedHeightMeters,
      widthUnits,
      heightUnits,
      voltage: 208,
      rackLocation: "SL",
      riggingMode: "flown",
      imagRole: "none",
      imagMasterWallId: null,
      mirroredPortOrder: false,
      mirroredCircuitMapping: false,
      cabinets
    });

    return NextResponse.json({ wall }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Failed to create wall"
      },
      { status: 400 }
    );
  }
}
