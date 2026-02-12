import { NextResponse } from "next/server";
import { getBootstrapData } from "@/lib/supabase/queries";

export async function GET() {
  const payload = await getBootstrapData();
  return NextResponse.json(payload);
}
