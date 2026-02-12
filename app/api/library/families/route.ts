import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPanelFamily, listPanelFamilies } from "@/lib/supabase/queries";

const familySchema = z.object({
  id: z.string().min(2),
  manufacturer: z.string().min(2),
  familyName: z.string().min(2),
  pixelPitchMm: z.number().positive(),
  notes: z.string().optional(),
  outdoorRating: z.string().optional(),
  serviceAccess: z.string().optional()
});

export async function GET() {
  const families = await listPanelFamilies();
  return NextResponse.json({ families });
}

export async function POST(request: NextRequest) {
  try {
    const payload = familySchema.parse(await request.json());
    const family = await createPanelFamily({
      ...payload,
      notes: payload.notes ?? "",
      outdoorRating: payload.outdoorRating ?? "",
      serviceAccess: payload.serviceAccess ?? ""
    });

    return NextResponse.json({ family }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to save family" },
      { status: 400 }
    );
  }
}
