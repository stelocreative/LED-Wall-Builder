import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { CrewPacketDocument } from "@/lib/pdf/crew-packet-document";
import { computeWallTotals } from "@/lib/domain/wall-layout";
import { buildDataPlan } from "@/lib/planning/data-plan";
import { buildPowerPlan } from "@/lib/planning/power-plan";
import { getBootstrapData, getTheme, getWallBundleById } from "@/lib/supabase/queries";

export const runtime = "nodejs";

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const [bundle, bootstrap, theme] = await Promise.all([getWallBundleById(id), getBootstrapData(), getTheme()]);

  if (!bundle) {
    return NextResponse.json({ message: "Wall not found" }, { status: 404 });
  }

  const variantsById = Object.fromEntries(bootstrap.variants.map((variant) => [variant.id, variant]));
  const familiesById = Object.fromEntries(bootstrap.families.map((family) => [family.id, family]));

  const processorId = request.nextUrl.searchParams.get("processorId") ?? bootstrap.processors[0]?.id;
  const processor = bootstrap.processors.find((item) => item.id === processorId) ?? bootstrap.processors[0];
  if (!processor) {
    return NextResponse.json({ message: "No processor models available" }, { status: 400 });
  }

  const receivingCard =
    (request.nextUrl.searchParams.get("receivingCard") as "A8s" | "A10s" | null) ?? bootstrap.receivingCards[0];

  const dataPlan = buildDataPlan({
    wall: bundle.wall,
    cells: bundle.cells,
    variantsById,
    processor,
    receivingCard,
    dataPathMode: "SNAKE_ROWS",
    loomBundleSize: Number(request.nextUrl.searchParams.get("loomBundleSize") ?? 4),
    portGroupSize: Number(request.nextUrl.searchParams.get("portGroupSize") ?? 2),
    rackLocation: bundle.wall.rackLocation
  });

  const powerPlan = buildPowerPlan({
    wall: bundle.wall,
    cells: bundle.cells,
    variantsById,
    strategy: bundle.wall.powerStrategy,
    voltageMode: bundle.wall.voltageMode,
    groupingMode: "BALANCED",
    planningThresholdPercent: bundle.wall.planningThresholdPercent,
    hardLimitPercent: bundle.wall.hardLimitPercent
  });

  const totals = computeWallTotals({
    wall: bundle.wall,
    cells: bundle.cells,
    variantsById,
    familiesById
  });

  const revisionNotes = request.nextUrl.searchParams.get("revisionNotes") ?? "R1: Initial deployment issue";

  const pdfBuffer = await renderToBuffer(
    CrewPacketDocument({
      show: bundle.show,
      wall: bundle.wall,
      totals,
      dataPlan,
      powerPlan,
      theme,
      revisionNotes
    })
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${bundle.wall.name.replace(/\s+/g, "-").toLowerCase()}-deployment-sheet.pdf"`
    }
  });
}
