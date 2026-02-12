"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { defaultProcessors } from "@/lib/domain/catalog";
import { metersToFeet, roundTo } from "@/lib/domain/conversions";
import { autoPopulateWall, validateNoOverlap } from "@/lib/domain/wall-layout";
import { PanelVariant, ProcessorModel, ReceivingCardModel, Wall } from "@/lib/domain/types";
import { buildDataPlan } from "@/lib/planning/data-plan";
import { buildMirroredDataPlan, buildMirroredPowerPlan } from "@/lib/planning/mirroring";
import { buildPowerPlan } from "@/lib/planning/power-plan";

const WallCanvas = dynamic(
  () => import("@/components/canvas/wall-canvas").then((mod) => mod.WallCanvas),
  { ssr: false }
);

interface ReferencePayload {
  panels: PanelVariant[];
  processors: ProcessorModel[];
  receivingCards: ReceivingCardModel[];
}

interface Props {
  initialWall: Wall;
  reference: ReferencePayload;
  wallOptions: Wall[];
}

export function WallEditorClient({ initialWall, reference, wallOptions }: Props) {
  const [wall, setWall] = useState<Wall>(initialWall);
  const [processorId, setProcessorId] = useState(reference.processors[0]?.id ?? defaultProcessors[0].id);
  const [receivingCard, setReceivingCard] = useState<ReceivingCardModel>(reference.receivingCards[0] ?? "A10s");
  const [sourceType, setSourceType] = useState<"20A" | "SOCAPEX" | "L21-30">("L21-30");
  const [loomBundleSize, setLoomBundleSize] = useState(4);
  const [portGroupSize, setPortGroupSize] = useState(2);
  const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const panelMap = useMemo(
    () => Object.fromEntries(reference.panels.map((panel) => [panel.id, panel])),
    [reference.panels]
  );

  const selectedProcessor =
    reference.processors.find((processor) => processor.id === processorId) ?? reference.processors[0] ?? defaultProcessors[0];

  const resolvedDataPlan = useMemo(() => {
    const basePlan = buildDataPlan({
      wall,
      processor: selectedProcessor,
      receivingCard,
      panelMap,
      loomBundleSize,
      portGroupSize
    });

    if (wall.imagRole === "mirror") {
      return buildMirroredDataPlan(basePlan, {
        mirroredPortOrder: wall.mirroredPortOrder,
        mirroredCircuitMapping: wall.mirroredCircuitMapping
      });
    }

    return basePlan;
  }, [loomBundleSize, panelMap, portGroupSize, receivingCard, selectedProcessor, wall]);

  const resolvedPowerPlan = useMemo(() => {
    const basePlan = buildPowerPlan({
      wall,
      panelMap,
      sourceType,
      voltage: wall.voltage
    });

    if (wall.imagRole === "mirror") {
      return buildMirroredPowerPlan(basePlan, {
        mirroredPortOrder: wall.mirroredPortOrder,
        mirroredCircuitMapping: wall.mirroredCircuitMapping
      });
    }

    return basePlan;
  }, [panelMap, sourceType, wall]);

  async function saveWall() {
    setSaveState("saving");

    const response = await fetch(`/api/walls/${wall.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        wall,
        dataPlan: resolvedDataPlan,
        powerPlan: {
          sourceType,
          voltage: wall.voltage,
          plan: resolvedPowerPlan
        }
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      setSaveState("error");
      setMessage(payload.message ?? "Save failed");
      return;
    }

    setSaveState("saved");
    setMessage("Wall and plans saved");
    setTimeout(() => setSaveState("idle"), 1800);
  }

  function rebuildAutoMix(includeTallMix: boolean) {
    const cabinets = autoPopulateWall(wall.widthUnits, wall.heightUnits, panelMap, {
      primaryVariantId: "P500x500",
      includeTallMix,
      tallEveryNColumns: 3
    });

    setWall((current) => ({ ...current, cabinets }));
    setSelectedCabinetId(null);
  }

  function replaceSelectedCabinet(variantId: string) {
    if (!selectedCabinetId) {
      return;
    }

    const selected = wall.cabinets.find((cabinet) => cabinet.id === selectedCabinetId);
    const variant = panelMap[variantId];
    if (!selected || !variant) {
      return;
    }

    const updatedCabinets = wall.cabinets.map((cabinet) =>
      cabinet.id === selectedCabinetId
        ? {
            ...cabinet,
            panelVariantId: variant.id,
            unitWidth: variant.unitWidth,
            unitHeight: variant.unitHeight
          }
        : cabinet
    );

    const errors = validateNoOverlap(updatedCabinets, wall.widthUnits, wall.heightUnits);
    if (errors.length > 0) {
      setMessage(errors[0]);
      return;
    }

    setWall((current) => ({ ...current, cabinets: updatedCabinets }));
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <h1>{wall.name}</h1>
          <p>
            {wall.widthMeters.toFixed(2)}m x {wall.heightMeters.toFixed(2)}m ({roundTo(metersToFeet(wall.widthMeters), 2)}ft x{" "}
            {roundTo(metersToFeet(wall.heightMeters), 2)}ft)
          </p>
        </div>
        <div className="header-actions">
          <Link className="btn btn-secondary" href="/">
            Dashboard
          </Link>
          <Link className="btn btn-secondary" href={`/walls/${wall.id}/print`}>
            Print View
          </Link>
          <button className="btn" onClick={saveWall} disabled={saveState === "saving"}>
            {saveState === "saving" ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      <section className="designer-grid">
        <aside className="panel-stack">
          <section className="panel">
            <h2>Wall Controls</h2>
            <label>
              Wall Name
              <input value={wall.name} onChange={(event) => setWall({ ...wall, name: event.target.value })} />
            </label>

            <div className="form-row">
              <label>
                Rack Location
                <select
                  value={wall.rackLocation}
                  onChange={(event) =>
                    setWall({
                      ...wall,
                      rackLocation: event.target.value as Wall["rackLocation"]
                    })
                  }
                >
                  <option value="SL">SL</option>
                  <option value="SR">SR</option>
                  <option value="USC">USC</option>
                  <option value="FOH">FOH</option>
                </select>
              </label>

              <label>
                Rigging Mode
                <select
                  value={wall.riggingMode}
                  onChange={(event) =>
                    setWall({
                      ...wall,
                      riggingMode: event.target.value as Wall["riggingMode"]
                    })
                  }
                >
                  <option value="ground">Ground</option>
                  <option value="flown">Flown</option>
                </select>
              </label>
            </div>

            <div className="form-row">
              <label>
                Voltage
                <select
                  value={wall.voltage}
                  onChange={(event) => setWall({ ...wall, voltage: Number(event.target.value) as 120 | 208 })}
                >
                  <option value={120}>120V</option>
                  <option value={208}>208V</option>
                </select>
              </label>

              <label>
                Power Source
                <select value={sourceType} onChange={(event) => setSourceType(event.target.value as "20A" | "SOCAPEX" | "L21-30") }>
                  <option value="20A">20A Edison</option>
                  <option value="SOCAPEX">Socapex</option>
                  <option value="L21-30">L21-30</option>
                </select>
              </label>
            </div>

            <div className="form-row">
              <button className="btn btn-small" type="button" onClick={() => rebuildAutoMix(true)}>
                Rebuild Mixed
              </button>
              <button className="btn btn-secondary btn-small" type="button" onClick={() => rebuildAutoMix(false)}>
                Rebuild 500x500
              </button>
            </div>

            <div className="form-row">
              <button className="btn btn-small" type="button" onClick={() => replaceSelectedCabinet("P500x500") }>
                Set Selected 500x500
              </button>
              <button className="btn btn-secondary btn-small" type="button" onClick={() => replaceSelectedCabinet("P500x1000") }>
                Set Selected 500x1000
              </button>
            </div>
          </section>

          <section className="panel">
            <h2>Data Planner</h2>
            <label>
              Processor
              <select value={processorId} onChange={(event) => setProcessorId(event.target.value)}>
                {reference.processors.map((processor) => (
                  <option key={processor.id} value={processor.id}>
                    {processor.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Receiving Card
              <select value={receivingCard} onChange={(event) => setReceivingCard(event.target.value as ReceivingCardModel)}>
                {reference.receivingCards.map((card) => (
                  <option key={card} value={card}>
                    {card}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-row">
              <label>
                Loom Bundle Size
                <input
                  type="number"
                  min="1"
                  value={loomBundleSize}
                  onChange={(event) => setLoomBundleSize(Number(event.target.value))}
                />
              </label>

              <label>
                Port Group Size
                <input
                  type="number"
                  min="1"
                  value={portGroupSize}
                  onChange={(event) => setPortGroupSize(Number(event.target.value))}
                />
              </label>
            </div>
          </section>

          <section className="panel">
            <h2>IMAG Mirroring</h2>
            <label>
              Role
              <select
                value={wall.imagRole}
                onChange={(event) => setWall({ ...wall, imagRole: event.target.value as Wall["imagRole"] })}
              >
                <option value="none">No IMAG Link</option>
                <option value="master">Master</option>
                <option value="mirror">Mirror</option>
              </select>
            </label>

            <label>
              Linked Master Wall
              <select
                value={wall.imagMasterWallId ?? ""}
                onChange={(event) => setWall({ ...wall, imagMasterWallId: event.target.value || null })}
              >
                <option value="">None</option>
                {wallOptions
                  .filter((candidate) => candidate.id !== wall.id)
                  .map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={wall.mirroredPortOrder}
                onChange={(event) => setWall({ ...wall, mirroredPortOrder: event.target.checked })}
              />
              Mirror port order
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={wall.mirroredCircuitMapping}
                onChange={(event) => setWall({ ...wall, mirroredCircuitMapping: event.target.checked })}
              />
              Mirror circuit mapping
            </label>
          </section>

          <section className="panel">
            <h2>Totals</h2>
            <p>Cabinets: {wall.cabinets.length}</p>
            <p>Data Pixels: {resolvedDataPlan.totalPixels.toLocaleString()}</p>
            <p>
              Typ Power: {resolvedPowerPlan.totalWatts.typ.toFixed(0)}W ({resolvedPowerPlan.totalAmps.typ.toFixed(1)}A @ {wall.voltage}V)
            </p>
            <p>Data Block Rows: {resolvedDataPlan.blockRows}</p>
            <p className={resolvedDataPlan.overload ? "error-line" : "status-line"}>
              {resolvedDataPlan.overload ? "Data overload risk detected" : "Data thresholds within limits"}
            </p>
            {message ? <p className={saveState === "error" ? "error-line" : "status-line"}>{message}</p> : null}
          </section>
        </aside>

        <section className="canvas-panel">
          <WallCanvas
            wall={wall}
            panelMap={panelMap}
            dataPlan={resolvedDataPlan}
            powerPlan={resolvedPowerPlan}
            selectedCabinetId={selectedCabinetId}
            onSelectCabinet={setSelectedCabinetId}
          />

          <div className="table-grid">
            <article className="panel">
              <h2>Data Blocks</h2>
              <table>
                <thead>
                  <tr>
                    <th>Port</th>
                    <th>Rows</th>
                    <th>Pixels</th>
                    <th>Loom</th>
                    <th>Group</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedDataPlan.blocks.map((block) => (
                    <tr key={`${block.portIndex}-${block.rowStart}`}>
                      <td>P{block.portIndex + 1}</td>
                      <td>
                        {block.rowStart + 1} - {block.rowEnd + 1}
                      </td>
                      <td>{block.pixelLoad.toLocaleString()}</td>
                      <td>L{block.loomBundle}</td>
                      <td>G{block.portGroup}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>

            <article className="panel">
              <h2>Power Circuits</h2>
              <table>
                <thead>
                  <tr>
                    <th>Circuit</th>
                    <th>Phase</th>
                    <th>Typ W</th>
                    <th>Typ A</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedPowerPlan.circuits.map((circuit) => (
                    <tr key={circuit.circuitNumber}>
                      <td>C{circuit.circuitNumber}</td>
                      <td>{circuit.phaseLabel}</td>
                      <td>{circuit.watts.typ.toFixed(0)}</td>
                      <td>{circuit.amps.typ.toFixed(2)}</td>
                      <td>{circuit.overLimit ? "Over" : "OK"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}
