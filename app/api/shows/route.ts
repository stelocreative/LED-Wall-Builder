import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createShow, listShows } from "@/lib/supabase/queries";

const createShowSchema = z.object({
  showName: z.string().min(2),
  showDate: z.string().min(4),
  venue: z.string().min(2),
  notes: z.string().optional(),
  revision: z.string().optional()
});

export async function GET() {
  const shows = await listShows();
  return NextResponse.json({ shows });
}

export async function POST(request: NextRequest) {
  try {
    const payload = createShowSchema.parse(await request.json());

    const show = await createShow({
      showName: payload.showName,
      showDate: payload.showDate,
      venue: payload.venue,
      notes: payload.notes ?? "",
      revision: payload.revision ?? "R1"
    });

    return NextResponse.json({ show }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to create show"
      },
      { status: 400 }
    );
  }
}
