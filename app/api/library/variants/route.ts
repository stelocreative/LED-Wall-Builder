import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createCabinetVariant, listCabinetVariants } from "@/lib/supabase/queries";

const variantSchema = z.object({
  id: z.string().min(2),
  familyId: z.string().min(2),
  variantName: z.string().min(2),
  dimensionsMm: z.object({
    widthMm: z.number().positive(),
    heightMm: z.number().positive(),
    depthMm: z.number().nonnegative()
  }),
  dimensionsIn: z.object({
    widthIn: z.number().positive(),
    heightIn: z.number().positive(),
    depthIn: z.number().nonnegative()
  }),
  pixels: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive()
  }),
  weightKg: z.number().positive(),
  weightLbs: z.number().positive(),
  connectors: z.object({
    data: z.string().min(1),
    power: z.string().min(1)
  }),
  power: z.object({
    min: z.number().nonnegative(),
    typ: z.number().nonnegative(),
    max: z.number().nonnegative(),
    peak: z.number().nonnegative()
  }),
  peakFactor: z.number().positive().nullable().optional(),
  recommendedPer20A120: z.number().int().positive(),
  recommendedPer20A208: z.number().int().positive(),
  recommendedPerSoca120: z.number().int().positive(),
  recommendedPerSoca208: z.number().int().positive(),
  recommendedPerL2130: z.number().int().positive(),
  notes: z.string().optional(),
  unitWidth: z.number().int().positive(),
  unitHeight: z.number().int().positive()
});

export async function GET() {
  const variants = await listCabinetVariants();
  return NextResponse.json({ variants });
}

export async function POST(request: NextRequest) {
  try {
    const payload = variantSchema.parse(await request.json());
    const variant = await createCabinetVariant({
      ...payload,
      peakFactor: payload.peakFactor ?? null,
      notes: payload.notes ?? ""
    });

    return NextResponse.json({ variant }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to save cabinet variant" },
      { status: 400 }
    );
  }
}
