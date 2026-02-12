import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createProcessor, listProcessors } from "@/lib/supabase/queries";

const processorSchema = z.object({
  id: z.string().min(2),
  manufacturer: z.string().min(2),
  modelName: z.string().min(2),
  ethernetPorts: z.number().int().positive(),
  maxPixelsPerPortA8s: z.number().int().positive(),
  maxPixelsPerPortA10s: z.number().int().positive(),
  notes: z.string().optional()
});

export async function GET() {
  const processors = await listProcessors();
  return NextResponse.json({ processors });
}

export async function POST(request: NextRequest) {
  try {
    const payload = processorSchema.parse(await request.json());
    const processor = await createProcessor({
      ...payload,
      notes: payload.notes ?? ""
    });

    return NextResponse.json({ processor }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to save processor" },
      { status: 400 }
    );
  }
}
