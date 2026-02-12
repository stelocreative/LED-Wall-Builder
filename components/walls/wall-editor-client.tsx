"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { WallCanvas } from "@/components/canvas/wall-canvas";
import {
  computeWallTotals,
  hasOverlap,
  placeVariantOnGrid,
  removeCellAtCoordinate,
  variantUnitsForBase,
  variantFitsInWall
} from "@/lib/domain/wall-layout";
import {
  CabinetVariant,
  CircuitGroupingMode,
  DataPathMode,
  PanelFamily,
  ProcessorModel,
  ReceivingCardModel,
  ShowEvent,
  Wall,
  WallBundle,
  WallCell
} from "@/lib/domain/types";
import { buildDataPlan } from "@/lib/planning/data-plan";
import { buildPowerPlan } from "@/lib/planning/power-plan";

interface Props {
  wallBundle: WallBundle;
  families: PanelFamily[];
  variants: CabinetVariant[];
  processors: ProcessorModel[];
  shows: ShowEvent[];
  receivingCards: ReceivingCardModel[];
}

type ToolMode = "PLACE" | "ERASE" | "MARK_SPARE" | "MARK_VOID" | "MARK_CUTOUT";

interface RouteOffset {
  x: number;
  y: number;
}

function labelForStrategy(strategy: Wall["powerStrategy"]): string {
  switch (strategy) {
    case "EDISON_20A":
      return "20A Edison";
    case "L21_30":
      return "L21-30 / Distro";
    case "SOCAPEX":
      return "Socapex";
    case "CAMLOCK_DISTRO":
      return "Camlock-fed Distro";
    default:
      return strategy;
  }
}

function routeStorageKey(wallId: string, layer: "data" | "power"): string {
  return `led-wall-route-offsets:${wallId}:${layer}`;
}

function normalizeCellGeometry(
  sourceCells: WallCell[],
  wall: Wall,
  variantsById: Record<string, CabinetVariant>
): WallCell[] {
  return sourceCells.map((cell) => {
    if (!cell.variantId) {
      return cell;
    }

    const variant = variantsById[cell.variantId];
    if (!variant) {
      return cell;
    }

    const footprint = variantUnitsForBase(variant, wall.baseUnitWidthMm, wall.baseUnitHeightMm);
    if (cell.unitWidth === footprint.unitWidth && cell.unitHeight === footprint.unitHeight) {
      return cell;
    }

    return {
      ...cell,
      unitWidth: footprint.unitWidth,
      unitHeight: footprint.unitHeight
    };
  });
}

export function WallEditorClient({ wallBundle, families, variants, processors, shows, receivingCards }: Props) {
  const initialVariantsById = Object.fromEntries(variants.map((variant) => [variant.id, variant]));
  const [wall, setWall] = useState<Wall>(wallBundle.wall);
  const [cells, setCells] = useState<WallCell[]>(() =>
    normalizeCellGeometry(wallBundle.cells, wallBundle.wall, initialVariantsById)
  );
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(variants[0]?.id ?? "");
  const [toolMode, setToolMode] = useState<ToolMode>("PLACE");
  const [activeFamilyId, setActiveFamilyId] = useState<string>("ALL");

  const [processorId, setProcessorId] = useState<string>(processors[0]?.id ?? "");
  const [receivingCard, setReceivingCard] = useState<ReceivingCardModel>(receivingCards[0] ?? "A10s");
  const [dataPathMode, setDataPathMode] = useState<DataPathMode>("SNAKE_ROWS");
  const [loomBundleSize, setLoomBundleSize] = useState(4);
  const [portGroupSize, setPortGroupSize] = useState(2);
  const [groupingMode, setGroupingMode] = useState<CircuitGroupingMode>("BALANCED");

  const [showLabels, setShowLabels] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [showDataLayer, setShowDataLayer] = useState(true);
  const [showPowerLayer, setShowPowerLayer] = useState(true);

  const [dataRouteOffsets, setDataRouteOffsets] = useState<Record<number, RouteOffset>>({});
  const [powerRouteOffsets, setPowerRouteOffsets] = useState<Record<number, RouteOffset>>({});

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [status, setStatus] = useState<string | null>(null);

  const familiesById = useMemo(() => Object.fromEntries(families.map((family) => [family.id, family])), [families]);
  const variantsById = useMemo(() => Object.fromEntries(variants.map((variant) => [variant.id, variant])), [variants]);

  const processor = processors.find((item) => item.id === processorId) ?? processors[0];

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const dataRaw = window.localStorage.getItem(routeStorageKey(wall.id, "data"));
      const powerRaw = window.localStorage.getItem(routeStorageKey(wall.id, "power"));
      setDataRouteOffsets(dataRaw ? (JSON.parse(dataRaw) as Record<number, RouteOffset>) : {});
      setPowerRouteOffsets(powerRaw ? (JSON.parse(powerRaw) as Record<number, RouteOffset>) : {});
    } catch {
      setDataRouteOffsets({});
      setPowerRouteOffsets({});
    }
  }, [wall.id]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(routeStorageKey(wall.id, "data"), JSON.stringify(dataRouteOffsets));
  }, [dataRouteOffsets, wall.id]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(routeStorageKey(wall.id, "power"), JSON.stringify(powerRouteOffsets));
  }, [powerRouteOffsets, wall.id]);

  const totals = useMemo(
    () =>
      computeWallTotals({
        wall,
        cells,
        variantsById,
        familiesById
      }),
    [wall, cells, variantsById, familiesById]
  );

  const dataPlan = useMemo(() => {
    if (!processor) {
      return null;
    }

    return buildDataPlan({
      wall,
      cells,
      variantsById,
      processor,
      receivingCard,
      dataPathMode,
      loomBundleSize,
      portGroupSize,
      rackLocation: wall.rackLocation
    });
  }, [cells, dataPathMode, loomBundleSize, portGroupSize, processor, receivingCard, variantsById, wall]);

  const powerPlan = useMemo(
    () =>
      buildPowerPlan({
        wall,
        cells,
        variantsById,
        strategy: wall.powerStrategy,
        voltageMode: wall.voltageMode,
        groupingMode,
        planningThresholdPercent: wall.planningThresholdPercent,
        hardLimitPercent: wall.hardLimitPercent
      }),
    [cells, groupingMode, variantsById, wall]
  );

  const selectedShow = shows.find((show) => show.id === wall.showId);

  const filteredVariants = useMemo(() => {
    const source =
      activeFamilyId === "ALL" ? variants : variants.filter((variant) => variant.familyId === activeFamilyId);

    return [...source].sort((a, b) => {
      const familyCompare = (familiesById[a.familyId]?.familyName ?? "").localeCompare(
        familiesById[b.familyId]?.familyName ?? ""
      );
      if (familyCompare !== 0) {
        return familyCompare;
      }
      return a.variantName.localeCompare(b.variantName);
    });
  }, [activeFamilyId, familiesById, variants]);

  function placeVariantAtCoordinate(
    variant: CabinetVariant,
    unitX: number,
    unitY: number,
    statusForPlacement: WallCell["status"]
  ) {
    setCells((current) => {
      const cleaned = removeCellAtCoordinate(current, unitX, unitY);
      const placeResult = placeVariantOnGrid({
        wall,
        cells: cleaned,
        wallId: wall.id,
        variant,
        unitX,
        unitY,
        status: statusForPlacement
      });

      if (!placeResult.ok) {
        setStatus(placeResult.reason);
        return current;
      }

      setStatus(null);
      return placeResult.cells;
    });
  }

  function applyToolAt(unitX: number, unitY: number) {
    if (toolMode === "ERASE") {
      setCells((current) => removeCellAtCoordinate(current, unitX, unitY));
      return;
    }

    if (toolMode === "MARK_VOID" || toolMode === "MARK_CUTOUT") {
      setCells((current) => {
        const cleaned = removeCellAtCoordinate(current, unitX, unitY);
        const marker: WallCell = {
          id: crypto.randomUUID(),
          wallId: wall.id,
          variantId: null,
          label: toolMode === "MARK_VOID" ? "VOID" : "CUT",
          unitX,
          unitY,
          unitWidth: 1,
          unitHeight: 1,
          status: toolMode === "MARK_VOID" ? "void" : "cutout",
          notes: ""
        };
        return [...cleaned, marker];
      });
      return;
    }

    const variant = variantsById[selectedVariantId];
    if (!variant) {
      setStatus("Select a cabinet variant before placement.");
      return;
    }

    placeVariantAtCoordinate(variant, unitX, unitY, toolMode === "MARK_SPARE" ? "spare" : "active");
  }

  function moveCell(cellId: string, nextUnitX: number, nextUnitY: number) {
    setCells((current) => {
      const target = current.find((cell) => cell.id === cellId);
      if (!target) {
        return current;
      }

      const size = { unitWidth: target.unitWidth, unitHeight: target.unitHeight };
      if (!variantFitsInWall(wall, size, nextUnitX, nextUnitY)) {
        setStatus("Moved cabinet is out of wall bounds.");
        return current;
      }

      const remaining = current.filter((cell) => cell.id !== cellId);
      const candidate = {
        ...target,
        unitX: nextUnitX,
        unitY: nextUnitY
      };

      if (hasOverlap(remaining, candidate)) {
        setStatus("Moved cabinet overlaps existing placement.");
        return current;
      }

      setStatus(null);
      return [...remaining, candidate];
    });
  }

  function placeDroppedVariant(variantId: string, unitX: number, unitY: number) {
    const variant = variantsById[variantId];
    if (!variant) {
      setStatus("Dropped variant was not found in library.");
      return;
    }

    setSelectedVariantId(variantId);
    placeVariantAtCoordinate(variant, unitX, unitY, toolMode === "MARK_SPARE" ? "spare" : "active");
  }

  function deleteSelectedCell() {
    if (!selectedCellId) {
      return;
    }
    setCells((current) => current.filter((cell) => cell.id !== selectedCellId));
    setSelectedCellId(null);
  }

  async function saveWallBundle() {
    setSaveState("saving");
    setStatus(null);

    const response = await fetch(`/api/walls/${wall.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wall,
        cells,
        dataPlan: dataPlan ?? undefined,
        powerPlan
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      setSaveState("error");
      setStatus(payload.message ?? "Unable to save wall.");
      return;
    }

    setSaveState("saved");
    setStatus("Saved wall, data runs, and power circuits.");
    setTimeout(() => setSaveState("idle"), 1800);
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <h1>{wall.name}</h1>
          <p>
            Show: {selectedShow?.showName ?? "Unknown"} | {selectedShow?.showDate ?? ""} | {selectedShow?.venue ?? ""}
          </p>
          <p>
            {wall.deploymentType === "FLOWN" ? "Flown" : "Ground Stack"} | {wall.voltageMode}V | {labelForStrategy(wall.powerStrategy)}
          </p>
        </div>
        <div className="header-actions">
          <Link className="btn btn-secondary" href={`/shows/${wall.showId}`}>
            Show
          </Link>
          <Link className="btn btn-secondary" href="/library">
            Library
          </Link>
          <Link className="btn btn-secondary" href={`/walls/${wall.id}/print`}>
            Print View
          </Link>
          <button className="btn" onClick={saveWallBundle} disabled={saveState === "saving"}>
            {saveState === "saving" ? "Saving..." : "Save Wall"}
          </button>
        </div>
      </header>

      <section className="designer-grid">
        <aside className="panel-stack">
          <section className="panel">
            <h2>Deployment</h2>
            <label>
              Wall Name
              <input value={wall.name} onChange={(event) => setWall((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <div className="form-row">
              <label>
                Deployment
                <select
                  value={wall.deploymentType}
                  onChange={(event) =>
                    setWall((current) => ({ ...current, deploymentType: event.target.value as Wall["deploymentType"] }))
                  }
                >
                  <option value="GROUND_STACK">Ground Stack</option>
                  <option value="FLOWN">Flown</option>
                </select>
              </label>
              <label>
                Voltage Mode
                <select
                  value={wall.voltageMode}
                  onChange={(event) => setWall((current) => ({ ...current, voltageMode: Number(event.target.value) as 120 | 208 }))}
                >
                  <option value={120}>120V</option>
                  <option value={208}>208V</option>
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                Power Strategy
                <select
                  value={wall.powerStrategy}
                  onChange={(event) =>
                    setWall((current) => ({ ...current, powerStrategy: event.target.value as Wall["powerStrategy"] }))
                  }
                >
                  <option value="EDISON_20A">20A Edison</option>
                  <option value="L21_30">L21-30 / Distro</option>
                  <option value="SOCAPEX">Socapex</option>
                  <option value="CAMLOCK_DISTRO">Camlock-fed Distro</option>
                </select>
              </label>
              <label>
                Rack Location
                <select
                  value={wall.rackLocation}
                  onChange={(event) =>
                    setWall((current) => ({ ...current, rackLocation: event.target.value as Wall["rackLocation"] }))
                  }
                >
                  <option value="SL">SL</option>
                  <option value="SR">SR</option>
                  <option value="USC">USC</option>
                  <option value="FOH">FOH</option>
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                Planning %
                <input
                  type="number"
                  min={40}
                  max={95}
                  value={wall.planningThresholdPercent}
                  onChange={(event) =>
                    setWall((current) => ({ ...current, planningThresholdPercent: Number(event.target.value) }))
                  }
                />
              </label>
              <label>
                Hard Limit %
                <input
                  type="number"
                  min={80}
                  max={120}
                  value={wall.hardLimitPercent}
                  onChange={(event) => setWall((current) => ({ ...current, hardLimitPercent: Number(event.target.value) }))}
                />
              </label>
            </div>
          </section>

          <section className="panel">
            <h2>Placement Tools</h2>
            <label>
              Variant
              <select value={selectedVariantId} onChange={(event) => setSelectedVariantId(event.target.value)}>
                {variants.map((variant) => {
                  const family = familiesById[variant.familyId];
                  return (
                    <option key={variant.id} value={variant.id}>
                      {family ? `${family.manufacturer} ${family.familyName}` : variant.familyId} - {variant.variantName}
                    </option>
                  );
                })}
              </select>
            </label>

            <div className="form-row">
              <button className="btn btn-small" type="button" onClick={() => setToolMode("PLACE")}>
                Place Active
              </button>
              <button className="btn btn-secondary btn-small" type="button" onClick={() => setToolMode("MARK_SPARE")}>
                Place Spare
              </button>
              <button className="btn btn-secondary btn-small" type="button" onClick={() => setToolMode("MARK_VOID")}>
                Mark Void
              </button>
              <button className="btn btn-secondary btn-small" type="button" onClick={() => setToolMode("MARK_CUTOUT")}>
                Mark Cutout
              </button>
            </div>

            <button className="btn btn-secondary btn-small" type="button" onClick={() => setToolMode("ERASE")}>
              Erase Cell
            </button>

            <button className="btn btn-secondary btn-small" type="button" onClick={deleteSelectedCell}>
              Delete Selected
            </button>

            <p>Tool Mode: {toolMode}</p>
            <p>Drag placed cabinets to reposition. Drag variants below directly onto the wall grid.</p>

            <label>
              Library Family
              <select value={activeFamilyId} onChange={(event) => setActiveFamilyId(event.target.value)}>
                <option value="ALL">All families</option>
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.manufacturer} {family.familyName}
                  </option>
                ))}
              </select>
            </label>

            <div className="variant-palette" role="list" aria-label="Cabinet variants">
              {filteredVariants.map((variant) => {
                const family = familiesById[variant.familyId];
                const selected = selectedVariantId === variant.id;
                const footprint = variantUnitsForBase(variant, wall.baseUnitWidthMm, wall.baseUnitHeightMm);
                return (
                  <button
                    key={variant.id}
                    type="button"
                    className={`variant-card${selected ? " is-selected" : ""}`}
                    draggable
                    onClick={() => setSelectedVariantId(variant.id)}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("application/x-led-variant-id", variant.id);
                      event.dataTransfer.setData("text/plain", variant.id);
                    }}
                  >
                    <strong>{family ? `${family.manufacturer} ${family.familyName}` : variant.familyId}</strong>
                    <span>{variant.variantName}</span>
                    <span>
                      {variant.dimensionsMm.widthMm}x{variant.dimensionsMm.heightMm}mm ({variant.dimensionsIn.widthIn.toFixed(1)}x
                      {variant.dimensionsIn.heightIn.toFixed(1)}in)
                    </span>
                    <span>
                      Grid: {footprint.unitWidth}x{footprint.unitHeight} units
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel">
            <h2>Data Planning</h2>
            <label>
              Processor
              <select value={processorId} onChange={(event) => setProcessorId(event.target.value)}>
                {processors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.manufacturer} {item.modelName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Receiving Card
              <select value={receivingCard} onChange={(event) => setReceivingCard(event.target.value as ReceivingCardModel)}>
                {receivingCards.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Data Path
              <select value={dataPathMode} onChange={(event) => setDataPathMode(event.target.value as DataPathMode)}>
                <option value="SNAKE_ROWS">Snake Rows</option>
                <option value="SNAKE_COLUMNS">Snake Columns</option>
                <option value="CUSTOM">Custom (Label Order)</option>
              </select>
            </label>
            <div className="form-row">
              <label>
                Loom Bundle
                <input type="number" min={1} value={loomBundleSize} onChange={(event) => setLoomBundleSize(Number(event.target.value))} />
              </label>
              <label>
                Port Group
                <input type="number" min={1} value={portGroupSize} onChange={(event) => setPortGroupSize(Number(event.target.value))} />
              </label>
            </div>
            <button className="btn btn-secondary btn-small" type="button" onClick={() => setDataRouteOffsets({})}>
              Auto Route Data (Reset Handles)
            </button>
          </section>

          <section className="panel">
            <h2>Power Planning</h2>
            <label>
              Grouping Mode
              <select value={groupingMode} onChange={(event) => setGroupingMode(event.target.value as CircuitGroupingMode)}>
                <option value="BALANCED">Balance Circuits Evenly</option>
                <option value="MIN_HOME_RUNS">Minimize Home Runs</option>
                <option value="BY_SECTION">Group by Wall Sections</option>
              </select>
            </label>
            <p>
              Estimated circuits: {powerPlan.estimatedCircuitCount} | Soca tails: {powerPlan.socapexRunsRequired}
            </p>
            <button className="btn btn-secondary btn-small" type="button" onClick={() => setPowerRouteOffsets({})}>
              Auto Route Power (Reset Handles)
            </button>
          </section>

          <section className="panel">
            <h2>View Layers</h2>
            <label className="checkbox-label">
              <input type="checkbox" checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} />
              Cabinet labels
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={showMeasurements} onChange={(event) => setShowMeasurements(event.target.checked)} />
              Measurements
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={showDataLayer} onChange={(event) => setShowDataLayer(event.target.checked)} />
              Data arrows
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={showPowerLayer} onChange={(event) => setShowPowerLayer(event.target.checked)} />
              Power arrows
            </label>
          </section>

          <section className="panel">
            <h2>Totals</h2>
            <p>
              Size: {totals.widthMeters.toFixed(2)}m x {totals.heightMeters.toFixed(2)}m ({totals.widthFeet.toFixed(2)}ft x {totals.heightFeet.toFixed(2)}ft)
            </p>
            <p>
              Resolution: {totals.wallResolution.width} x {totals.wallResolution.height} px | Total Pixels: {totals.totalPixels.toLocaleString()}
            </p>
            <p>
              Weight: {totals.totalWeightKg.toFixed(1)}kg / {totals.totalWeightLbs.toFixed(1)}lbs
            </p>
            <p>
              Power Min/Typ/Max/Peak: {totals.totalPower.min.toFixed(0)} / {totals.totalPower.typ.toFixed(0)} / {totals.totalPower.max.toFixed(0)} / {totals.totalPower.peak.toFixed(0)} W
            </p>
            <p>
              Current @ {wall.voltageMode}V: {totals.totalCurrent.min.toFixed(1)} / {totals.totalCurrent.typ.toFixed(1)} / {totals.totalCurrent.max.toFixed(1)} / {totals.totalCurrent.peak.toFixed(1)} A
            </p>
            {totals.mixedPitchWarning ? <p className="error-line">{totals.mixedPitchWarning}</p> : null}
            {status ? <p className={saveState === "error" ? "error-line" : "status-line"}>{status}</p> : null}
          </section>
        </aside>

        <section className="canvas-panel">
          <WallCanvas
            wall={wall}
            cells={cells}
            variantsById={variantsById}
            dataPlan={dataPlan ?? undefined}
            powerPlan={powerPlan}
            selectedCellId={selectedCellId}
            showLabels={showLabels}
            showMeasurements={showMeasurements}
            showDataLayer={showDataLayer}
            showPowerLayer={showPowerLayer}
            dataRouteOffsets={dataRouteOffsets}
            powerRouteOffsets={powerRouteOffsets}
            onSelectCell={setSelectedCellId}
            onGridClick={applyToolAt}
            onMoveCell={moveCell}
            onDropVariant={placeDroppedVariant}
            onDataRouteOffsetChange={(runNumber, offset) =>
              setDataRouteOffsets((current) => ({
                ...current,
                [runNumber]: offset
              }))
            }
            onPowerRouteOffsetChange={(circuitNumber, offset) =>
              setPowerRouteOffsets((current) => ({
                ...current,
                [circuitNumber]: offset
              }))
            }
          />

          <div className="table-grid">
            <article className="panel">
              <h2>Variant Breakdown</h2>
              <table>
                <thead>
                  <tr>
                    <th>Variant</th>
                    <th>Count</th>
                    <th>Weight kg/lbs</th>
                    <th>Pixels</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.variantBreakdown.map((item) => (
                    <tr key={item.variantId}>
                      <td>
                        {item.familyName} {item.variantName}
                      </td>
                      <td>{item.count}</td>
                      <td>
                        {item.weightKg.toFixed(1)} / {item.weightLbs.toFixed(1)}
                      </td>
                      <td>{item.pixels.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>

            <article className="panel">
              <h2>Data Runs</h2>
              {dataPlan ? (
                <>
                  <table>
                    <thead>
                      <tr>
                        <th>Run</th>
                        <th>Port</th>
                        <th>Cabinets</th>
                        <th>Jumpers</th>
                        <th>Home Run</th>
                        <th>Pixels</th>
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
                          <td>{run.pixelLoad.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {dataPlan.warnings.map((warning) => (
                    <p className="error-line" key={warning}>
                      {warning}
                    </p>
                  ))}
                </>
              ) : (
                <p>Select a processor to generate runs.</p>
              )}
            </article>
          </div>

          <article className="panel">
            <h2>Power Circuits</h2>
            <table>
              <thead>
                <tr>
                  <th>Circuit</th>
                  <th>Phase</th>
                  <th>Typ W / A</th>
                  <th>Max W / A</th>
                  <th>Status</th>
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
                    <td>{circuit.overHardLimit ? "Hard Limit" : circuit.overPlanning ? "Over Planning" : "OK"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              Totals Min/Typ/Max/Peak (W): {powerPlan.totalsWatts.min.toFixed(0)} / {powerPlan.totalsWatts.typ.toFixed(0)} / {powerPlan.totalsWatts.max.toFixed(0)} / {powerPlan.totalsWatts.peak.toFixed(0)}
            </p>
            <p>
              Totals Min/Typ/Max/Peak (A @ {wall.voltageMode}V): {powerPlan.totalsAmps.min.toFixed(1)} / {powerPlan.totalsAmps.typ.toFixed(1)} / {powerPlan.totalsAmps.max.toFixed(1)} / {powerPlan.totalsAmps.peak.toFixed(1)}
            </p>
            {powerPlan.strategy === "SOCAPEX" ? (
              <p>
                Socapex required: {powerPlan.socapexRunsRequired} tails ({powerPlan.socapexCircuitsUsed} circuits used)
              </p>
            ) : null}
            {powerPlan.warnings.map((warning) => (
              <p className="error-line" key={warning}>
                {warning}
              </p>
            ))}
          </article>
        </section>
      </section>
    </main>
  );
}
