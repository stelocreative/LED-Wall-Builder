import Link from "next/link";
import { PrintActions } from "@/components/print/print-actions";
import { computeWallTotals } from "@/lib/domain/wall-layout";
import { buildDataPlan } from "@/lib/planning/data-plan";
import { buildPowerPlan } from "@/lib/planning/power-plan";
import { getBootstrapData, getWallBundleById, getTheme } from "@/lib/supabase/queries";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PrintPage({ params }: Props) {
  const { id } = await params;

  const [bundle, bootstrap, theme] = await Promise.all([getWallBundleById(id), getBootstrapData(), getTheme()]);

  if (!bundle) {
    return (
      <main className="page-shell">
        <h1>Wall not found</h1>
      </main>
    );
  }

  const variantsById = Object.fromEntries(bootstrap.variants.map((variant) => [variant.id, variant]));
  const familiesById = Object.fromEntries(bootstrap.families.map((family) => [family.id, family]));

  const processor = bootstrap.processors[0];
  if (!processor) {
    return (
      <main className="page-shell">
        <h1>No processor models available</h1>
      </main>
    );
  }
  const receivingCard = bootstrap.receivingCards[1] ?? bootstrap.receivingCards[0];

  const totals = computeWallTotals({
    wall: bundle.wall,
    cells: bundle.cells,
    variantsById,
    familiesById
  });

  const dataPlan = buildDataPlan({
    wall: bundle.wall,
    cells: bundle.cells,
    variantsById,
    processor,
    receivingCard,
    dataPathMode: "SNAKE_ROWS",
    loomBundleSize: 4,
    portGroupSize: 2,
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

  const generatedAt = new Date().toISOString();
  const unitPx = 18;
  const diagramWidth = bundle.wall.widthUnits * unitPx;
  const diagramHeight = bundle.wall.heightUnits * unitPx;
  const cellById = Object.fromEntries(bundle.cells.map((cell) => [cell.id, cell]));

  return (
    <main className="page-shell print-shell">
      <header className="page-header no-print">
        <div>
          <h1>Crew Deployment Sheet: {bundle.wall.name}</h1>
          <p>Print-clean deployment packet for LED crew, video, and power teams.</p>
        </div>
        <div className="header-actions">
          <Link className="btn btn-secondary" href={`/walls/${bundle.wall.id}`}>
            Back to Designer
          </Link>
          <PrintActions />
          <Link className="btn" href={`/api/walls/${bundle.wall.id}/pdf`} target="_blank">
            Open PDF
          </Link>
        </div>
      </header>

      <section className="print-card">
        <div className="print-title-block">
          <div>
            <h2 style={{ color: theme.primaryColor }}>{theme.brandName}</h2>
            <p>
              Show: {bundle.show.showName} | Date: {bundle.show.showDate} | Venue: {bundle.show.venue}
            </p>
            <p>
              Wall: {bundle.wall.name} | Deployment: {bundle.wall.deploymentType === "FLOWN" ? "Flown" : "Ground Stack"} | Voltage: {bundle.wall.voltageMode}V
            </p>
            <p>
              Revision: {bundle.show.revision} | Generated: {generatedAt}
            </p>
          </div>
        </div>

        <div className="print-section">
          <h3>Summary Totals</h3>
          <p>
            Wall Size: {totals.widthMeters.toFixed(2)}m x {totals.heightMeters.toFixed(2)}m | {totals.widthFeet.toFixed(2)}ft x {totals.heightFeet.toFixed(2)}ft
          </p>
          <p>
            Base Grid: {bundle.wall.baseUnitWidthMm}x{bundle.wall.baseUnitHeightMm}mm | {bundle.wall.widthUnits}x{bundle.wall.heightUnits} units
          </p>
          <p>
            Total Cabinets: {totals.totalCabinets} | Resolution: {totals.wallResolution.width} x {totals.wallResolution.height} px
          </p>
          <p>
            Total Pixels: {totals.totalPixels.toLocaleString()} | Total Weight: {totals.totalWeightKg.toFixed(1)}kg / {totals.totalWeightLbs.toFixed(1)}lbs
          </p>
        </div>

        <div className="print-section">
          <h3>Cabinet Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>Family</th>
                <th>Variant</th>
                <th>Count</th>
                <th>Weight kg/lbs</th>
                <th>Pixels</th>
              </tr>
            </thead>
            <tbody>
              {totals.variantBreakdown.map((item) => (
                <tr key={item.variantId}>
                  <td>{item.familyName}</td>
                  <td>{item.variantName}</td>
                  <td>{item.count}</td>
                  <td>
                    {item.weightKg.toFixed(1)} / {item.weightLbs.toFixed(1)}
                  </td>
                  <td>{item.pixels.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="print-section">
          <h3>Power Totals ({bundle.wall.voltageMode}V)</h3>
          <p>
            Min: {powerPlan.totalsWatts.min.toFixed(0)}W / {powerPlan.totalsAmps.min.toFixed(1)}A | Typical: {powerPlan.totalsWatts.typ.toFixed(0)}W / {powerPlan.totalsAmps.typ.toFixed(1)}A
          </p>
          <p>
            Max: {powerPlan.totalsWatts.max.toFixed(0)}W / {powerPlan.totalsAmps.max.toFixed(1)}A | Peak: {powerPlan.totalsWatts.peak.toFixed(0)}W / {powerPlan.totalsAmps.peak.toFixed(1)}A
          </p>
          <p>
            Strategy: {bundle.wall.powerStrategy} | Estimated circuits: {powerPlan.estimatedCircuitCount}
          </p>
          {powerPlan.strategy === "SOCAPEX" ? (
            <p>
              Socapex runs: {powerPlan.socapexRunsRequired} | Circuits utilized: {powerPlan.socapexCircuitsUsed}
            </p>
          ) : null}
        </div>

        <div className="print-grid">
          <div className="print-section">
            <h3>Wall Diagram (Data + Power Arrows)</h3>
            <svg width={diagramWidth + 140} height={diagramHeight + 40} style={{ border: "1px solid #cbd5e1" }}>
              <g transform="translate(70,20)">
                <rect x={0} y={0} width={diagramWidth} height={diagramHeight} fill="#0f172a" />
                {Array.from({ length: bundle.wall.widthUnits + 1 }, (_, index) => (
                  <line
                    key={`grid-x-${index}`}
                    x1={index * unitPx}
                    y1={0}
                    x2={index * unitPx}
                    y2={diagramHeight}
                    stroke="#334155"
                    strokeWidth={1}
                  />
                ))}
                {Array.from({ length: bundle.wall.heightUnits + 1 }, (_, index) => (
                  <line
                    key={`grid-y-${index}`}
                    x1={0}
                    y1={index * unitPx}
                    x2={diagramWidth}
                    y2={index * unitPx}
                    stroke="#334155"
                    strokeWidth={1}
                  />
                ))}
                {bundle.cells.map((cell) => (
                  <rect
                    key={cell.id}
                    x={cell.unitX * unitPx + 1}
                    y={cell.unitY * unitPx + 1}
                    width={cell.unitWidth * unitPx - 2}
                    height={cell.unitHeight * unitPx - 2}
                    fill={cell.status === "active" ? "#0EA5E9" : cell.status === "spare" ? "#9CA3AF" : "#475569"}
                    opacity={cell.status === "active" ? 0.85 : 0.5}
                  />
                ))}
                {dataPlan.runs.map((run) => {
                  const anchor = run.cabinetIds.length ? cellById[run.cabinetIds[0]] : null;
                  if (!anchor) return null;
                  const y = (anchor.unitY + anchor.unitHeight / 2) * unitPx;
                  return (
                    <g key={`data-${run.runNumber}`}>
                      <line x1={diagramWidth + 10} y1={y} x2={anchor.unitX * unitPx + 2} y2={y} stroke="#3b82f6" strokeWidth={1.5} />
                      <text x={diagramWidth + 14} y={y + 4} fontSize={8} fill="#1d4ed8">{`D${run.runNumber}`}</text>
                    </g>
                  );
                })}
                {powerPlan.circuits.map((circuit) => {
                  const anchor = circuit.cabinetIds.length ? cellById[circuit.cabinetIds[0]] : null;
                  if (!anchor) return null;
                  const y = (anchor.unitY + anchor.unitHeight / 2) * unitPx;
                  return (
                    <g key={`power-${circuit.circuitNumber}`}>
                      <line x1={-10} y1={y} x2={anchor.unitX * unitPx + 2} y2={y} stroke="#f97316" strokeWidth={1.5} />
                      <text x={-42} y={y + 4} fontSize={8} fill="#c2410c">{`P${circuit.circuitNumber}`}</text>
                    </g>
                  );
                })}
              </g>
            </svg>
            <p>Blue arrows = data runs, orange arrows = power circuits.</p>
          </div>

          <div className="print-section">
            <h3>Data Runs</h3>
            <table>
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Port</th>
                  <th>Cabinets</th>
                  <th>Jumpers</th>
                  <th>Home Run</th>
                </tr>
              </thead>
              <tbody>
                {dataPlan.runs.map((run) => (
                  <tr key={run.runNumber}>
                    <td>D{run.runNumber}</td>
                    <td>{run.processorPort}</td>
                    <td>{run.cabinetCount}</td>
                    <td>{run.jumperCount}</td>
                    <td>
                      {run.estimatedHomeRunMeters.toFixed(1)}m / {run.estimatedHomeRunFeet.toFixed(1)}ft
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="print-section">
            <h3>Power Circuits</h3>
            <table>
              <thead>
                <tr>
                  <th>Circuit</th>
                  <th>Phase</th>
                  <th>Typ W/A</th>
                  <th>Max W/A</th>
                </tr>
              </thead>
              <tbody>
                {powerPlan.circuits.map((circuit) => (
                  <tr key={circuit.circuitNumber}>
                    <td>{circuit.label}</td>
                    <td>{circuit.phase}</td>
                    <td>
                      {circuit.watts.typ.toFixed(0)} / {circuit.amps.typ.toFixed(1)}
                    </td>
                    <td>
                      {circuit.watts.max.toFixed(0)} / {circuit.amps.max.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="print-section">
          <h3>Warnings / Notes</h3>
          {totals.mixedPitchWarning ? <p>{totals.mixedPitchWarning}</p> : null}
          {dataPlan.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
          {powerPlan.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
          <p>{bundle.wall.notes || "No additional notes."}</p>
        </div>
      </section>
    </main>
  );
}
