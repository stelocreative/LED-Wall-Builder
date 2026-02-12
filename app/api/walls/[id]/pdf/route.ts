import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { CrewPacketDocument } from "@/lib/pdf/crew-packet-document";
import { buildDataPlan } from "@/lib/planning/data-plan";
import { buildMirroredDataPlan, buildMirroredPowerPlan } from "@/lib/planning/mirroring";
import { buildPowerPlan } from "@/lib/planning/power-plan";
import { getReferenceData, getTheme, getWallById } from "@/lib/supabase/queries";

export const runtime = "nodejs";

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const wall = await getWallById(id);
  if (!wall) {
    return NextResponse.json({ message: "Wall not found" }, { status: 404 });
  }

  const [reference, theme] = await Promise.all([getReferenceData(), getTheme()]);
  const panelMap = Object.fromEntries(reference.panels.map((panel) => [panel.id, panel]));

  const processor =
    reference.processors.find((item) => item.id === request.nextUrl.searchParams.get("processor")) ?? reference.processors[0];
  const receivingCard = (request.nextUrl.searchParams.get("receivingCard") as "A8s" | "A10s" | null) ?? "A10s";
  const sourceType = (request.nextUrl.searchParams.get("sourceType") as "20A" | "SOCAPEX" | "L21-30" | null) ?? "L21-30";

  let dataPlan = buildDataPlan({
    wall,
    processor,
    receivingCard,
    panelMap,
    loomBundleSize: Number(request.nextUrl.searchParams.get("loomBundleSize") ?? 4),
    portGroupSize: Number(request.nextUrl.searchParams.get("portGroupSize") ?? 2)
  });

  let powerPlan = buildPowerPlan({
    wall,
    panelMap,
    sourceType,
    voltage: wall.voltage
  });

  if (wall.imagRole === "mirror" && (wall.mirroredPortOrder || wall.mirroredCircuitMapping)) {
    dataPlan = buildMirroredDataPlan(dataPlan, {
      mirroredPortOrder: wall.mirroredPortOrder,
      mirroredCircuitMapping: wall.mirroredCircuitMapping
    });
    powerPlan = buildMirroredPowerPlan(powerPlan, {
      mirroredPortOrder: wall.mirroredPortOrder,
      mirroredCircuitMapping: wall.mirroredCircuitMapping
    });
  }

  const revisionNotes = request.nextUrl.searchParams.get("revisionNotes") ?? "R1: Initial issue";

  const pdfBuffer = await renderToBuffer(
    CrewPacketDocument({
      wall,
      panelMap,
      dataPlan,
      powerPlan,
      theme,
      revisionNotes
    })
  );

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${wall.name.replace(/\s+/g, "-").toLowerCase()}-crew-packet.pdf"`
    }
  });
}
