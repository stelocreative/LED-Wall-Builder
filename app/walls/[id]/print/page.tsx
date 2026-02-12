import Link from "next/link";
import Image from "next/image";
import { PrintActions } from "@/components/print/print-actions";
import { getReferenceData, getTheme, getWallById } from "@/lib/supabase/queries";
import { buildDataPlan } from "@/lib/planning/data-plan";
import { buildMirroredDataPlan, buildMirroredPowerPlan } from "@/lib/planning/mirroring";
import { buildPowerPlan } from "@/lib/planning/power-plan";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PrintPage({ params }: Props) {
  const { id } = await params;
  const [wall, reference, theme] = await Promise.all([getWallById(id), getReferenceData(), getTheme()]);

  if (!wall) {
    return (
      <main className="page-shell">
        <h1>Wall not found</h1>
      </main>
    );
  }

  const panelMap = Object.fromEntries(reference.panels.map((panel) => [panel.id, panel]));
  const dataPlanBase = buildDataPlan({
    wall,
    processor: reference.processors[0],
    receivingCard: "A10s",
    panelMap,
    loomBundleSize: 4,
    portGroupSize: 2
  });

  const powerPlanBase = buildPowerPlan({
    wall,
    panelMap,
    sourceType: "L21-30",
    voltage: wall.voltage
  });

  const dataPlan =
    wall.imagRole === "mirror"
      ? buildMirroredDataPlan(dataPlanBase, {
          mirroredPortOrder: wall.mirroredPortOrder,
          mirroredCircuitMapping: wall.mirroredCircuitMapping
        })
      : dataPlanBase;

  const powerPlan =
    wall.imagRole === "mirror"
      ? buildMirroredPowerPlan(powerPlanBase, {
          mirroredPortOrder: wall.mirroredPortOrder,
          mirroredCircuitMapping: wall.mirroredCircuitMapping
        })
      : powerPlanBase;

  return (
    <main className="page-shell print-shell">
      <header className="page-header no-print">
        <div>
          <h1>Print Packet: {wall.name}</h1>
          <p>Use browser print for paper output or open PDF export route.</p>
        </div>
        <div className="header-actions">
          <Link className="btn btn-secondary" href={`/walls/${wall.id}`}>
            Back to Designer
          </Link>
          <PrintActions />
          <Link className="btn" href={`/api/walls/${wall.id}/pdf`} target="_blank">
            Download PDF
          </Link>
        </div>
      </header>

      <section className="print-card">
        <div className="print-title-block">
          <div>
            <h2 style={{ color: theme.primaryColor }}>{theme.brandName}</h2>
            <p>Wall Deployment Packet</p>
            <p>{wall.name}</p>
          </div>
          {theme.logoDataUrl ? (
            <Image src={theme.logoDataUrl} alt="Brand logo" className="print-logo" width={140} height={64} />
          ) : null}
        </div>

        <div className="print-section">
          <h3>Summary</h3>
          <p>
            Wall: {wall.widthMeters.toFixed(2)}m x {wall.heightMeters.toFixed(2)}m ({wall.widthUnits} x {wall.heightUnits} units)
          </p>
          <p>Cabinets: {wall.cabinets.length}</p>
          <p>Data pixels: {dataPlan.totalPixels.toLocaleString()}</p>
          <p>
            Power totals (min/typ/max/peak): {powerPlan.totalWatts.min.toFixed(0)} / {powerPlan.totalWatts.typ.toFixed(0)} /{" "}
            {powerPlan.totalWatts.max.toFixed(0)} / {powerPlan.totalWatts.peak.toFixed(0)} W
          </p>
          <p>
            Current totals (min/typ/max/peak): {powerPlan.totalAmps.min.toFixed(1)} / {powerPlan.totalAmps.typ.toFixed(1)} /{" "}
            {powerPlan.totalAmps.max.toFixed(1)} / {powerPlan.totalAmps.peak.toFixed(1)} A @ {powerPlan.voltage}V
          </p>
        </div>

        <div className="print-grid">
          <div className="print-section">
            <h3>Data Arrows</h3>
            <table>
              <thead>
                <tr>
                  <th>Port</th>
                  <th>Rows</th>
                  <th>Arrow</th>
                  <th>Pixels</th>
                </tr>
              </thead>
              <tbody>
                {dataPlan.blocks.map((block) => (
                  <tr key={`${block.portIndex}-${block.rowStart}`}>
                    <td>P{block.portIndex + 1}</td>
                    <td>
                      {block.rowStart + 1} {"->"} {block.rowEnd + 1}
                    </td>
                    <td>{block.cableOrigin === "ground" ? "Ground -> Wall" : "Air -> Wall"}</td>
                    <td>{block.pixelLoad.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="print-section">
            <h3>Power Arrows</h3>
            <table>
              <thead>
                <tr>
                  <th>Circuit</th>
                  <th>Typ W</th>
                  <th>Typ A</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {powerPlan.circuits.map((circuit) => (
                  <tr key={circuit.circuitNumber}>
                    <td>
                      C{circuit.circuitNumber} ({circuit.phaseLabel})
                    </td>
                    <td>{circuit.watts.typ.toFixed(0)}</td>
                    <td>{circuit.amps.typ.toFixed(2)}</td>
                    <td>{circuit.overLimit ? "Over limit" : "OK"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="print-section">
          <h3>Revision Notes</h3>
          <p>R1: Initial issue</p>
        </div>
      </section>
    </main>
  );
}
