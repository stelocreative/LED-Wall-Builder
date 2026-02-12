import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTheme, saveTheme } from "@/lib/supabase/queries";

const themeSchema = z.object({
  brandName: z.string().min(2),
  primaryColor: z.string().min(4),
  accentColor: z.string().min(4),
  backgroundColor: z.string().min(4),
  surfaceColor: z.string().min(4),
  textColor: z.string().min(4),
  mutedTextColor: z.string().min(4),
  fontFamily: z.string().min(2),
  logoDataUrl: z.string().nullable().optional()
});

export async function GET() {
  const theme = await getTheme();
  return NextResponse.json(theme);
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = themeSchema.parse(body);

    const savedTheme = await saveTheme({
      ...parsed,
      logoDataUrl: parsed.logoDataUrl ?? null
    });

    return NextResponse.json(savedTheme);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Invalid payload"
      },
      { status: 400 }
    );
  }
}
