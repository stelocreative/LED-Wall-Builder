import { NextResponse } from "next/server";
import { getReferenceData, getTheme } from "@/lib/supabase/queries";

export async function GET() {
  const [reference, theme] = await Promise.all([getReferenceData(), getTheme()]);
  return NextResponse.json({ ...reference, theme });
}
