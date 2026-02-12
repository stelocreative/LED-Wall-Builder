"use client";

import { useEffect, useMemo, useState } from "react";
import { Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import { CabinetVariant, DataPlanResult, PowerPlanResult, Wall, WallCell } from "@/lib/domain/types";

interface Props {
  wall: Wall;
  cells: WallCell[];
  variantsById: Record<string, CabinetVariant>;
  dataPlan?: DataPlanResult;
  powerPlan?: PowerPlanResult;
  selectedCellId?: string | null;
  showLabels: boolean;
  showMeasurements: boolean;
  showDataLayer: boolean;
  showPowerLayer: boolean;
  onSelectCell?: (cellId: string | null) => void;
  onGridClick?: (unitX: number, unitY: number) => void;
}

const STAGE_WIDTH = 1120;
const STAGE_HEIGHT = 760;
const FRAME_PADDING = 70;

const STATUS_COLOR: Record<WallCell["status"], string> = {
  active: "#0EA5E9",
  spare: "#9CA3AF",
  void: "#1E293B",
  cutout: "#3F3F46"
};

function cabinetCenter(cell: WallCell, originX: number, originY: number, size: number) {
  return {
    x: originX + (cell.unitX + cell.unitWidth / 2) * size,
    y: originY + (cell.unitY + cell.unitHeight / 2) * size
  };
}

export function WallCanvas({
  wall,
  cells,
  variantsById,
  dataPlan,
  powerPlan,
  selectedCellId,
  showLabels,
  showMeasurements,
  showDataLayer,
  showPowerLayer,
  onSelectCell,
  onGridClick
}: Props) {
  const fitCell = useMemo(() => {
    const byWidth = (STAGE_WIDTH - FRAME_PADDING * 2) / Math.max(1, wall.widthUnits);
    const byHeight = (STAGE_HEIGHT - FRAME_PADDING * 2) / Math.max(1, wall.heightUnits);
    return Math.max(12, Math.floor(Math.min(byWidth, byHeight)));
  }, [wall.heightUnits, wall.widthUnits]);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [wall.id]);

  const cellSize = fitCell * zoom;
  const wallPixelWidth = wall.widthUnits * cellSize;
  const wallPixelHeight = wall.heightUnits * cellSize;

  const originX = (STAGE_WIDTH - wallPixelWidth) / 2;
  const originY = (STAGE_HEIGHT - wallPixelHeight) / 2;

  const activeCellMap = useMemo(() => {
    const map = new Map<string, WallCell>();
    cells.forEach((cell) => map.set(cell.id, cell));
    return map;
  }, [cells]);

  const variantColors = useMemo(() => {
    const colorPool = ["#38BDF8", "#22C55E", "#F59E0B", "#F43F5E", "#A855F7", "#14B8A6"];
    const map = new Map<string, string>();
    let idx = 0;
    Object.keys(variantsById).forEach((id) => {
      map.set(id, colorPool[idx % colorPool.length]);
      idx += 1;
    });
    return map;
  }, [variantsById]);

  return (
    <div className="canvas-shell">
      <div className="header-actions" style={{ marginBottom: "0.5rem" }}>
        <button className="btn btn-secondary btn-small" type="button" onClick={() => setZoom((current) => Math.max(0.5, round(current - 0.1)))}>
          Zoom -
        </button>
        <button className="btn btn-secondary btn-small" type="button" onClick={() => setZoom((current) => Math.min(2.5, round(current + 0.1)))}>
          Zoom +
        </button>
        <button className="btn btn-secondary btn-small" type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
          Reset View
        </button>
      </div>

      <Stage
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
        onMouseDown={(event) => {
          const target = event.target;
          if (target.getClassName() !== "Rect" || target.name() !== "grid-background") {
            return;
          }

          const stage = target.getStage();
          const pointer = stage?.getPointerPosition();
          if (!pointer) {
            return;
          }

          const localX = (pointer.x - (originX + pan.x)) / cellSize;
          const localY = (pointer.y - (originY + pan.y)) / cellSize;
          const unitX = Math.floor(localX);
          const unitY = Math.floor(localY);

          if (unitX < 0 || unitY < 0 || unitX >= wall.widthUnits || unitY >= wall.heightUnits) {
            return;
          }

          onGridClick?.(unitX, unitY);
        }}
      >
        <Layer>
          <Group
            x={pan.x}
            y={pan.y}
            draggable
            onDragEnd={(event) => setPan({ x: event.target.x(), y: event.target.y() })}
          >
            <Rect
              name="grid-background"
              x={originX}
              y={originY}
              width={wallPixelWidth}
              height={wallPixelHeight}
              fill="#050A12"
              stroke="#475569"
              strokeWidth={2}
            />

            {Array.from({ length: wall.widthUnits + 1 }, (_, index) => (
              <Line
                key={`grid-x-${index}`}
                points={[originX + index * cellSize, originY, originX + index * cellSize, originY + wallPixelHeight]}
                stroke="#1F2937"
                strokeWidth={1}
              />
            ))}

            {Array.from({ length: wall.heightUnits + 1 }, (_, index) => (
              <Line
                key={`grid-y-${index}`}
                points={[originX, originY + index * cellSize, originX + wallPixelWidth, originY + index * cellSize]}
                stroke="#1F2937"
                strokeWidth={1}
              />
            ))}

            {cells.map((cell) => {
              const variant = cell.variantId ? variantsById[cell.variantId] : undefined;
              const fillColor =
                cell.status === "active" && cell.variantId
                  ? variantColors.get(cell.variantId) ?? STATUS_COLOR.active
                  : STATUS_COLOR[cell.status];

              const selected = selectedCellId === cell.id;

              return (
                <Group key={cell.id}>
                  <Rect
                    x={originX + cell.unitX * cellSize + 1}
                    y={originY + cell.unitY * cellSize + 1}
                    width={cell.unitWidth * cellSize - 2}
                    height={cell.unitHeight * cellSize - 2}
                    fill={fillColor}
                    opacity={cell.status === "active" ? 0.88 : 0.45}
                    stroke={selected ? "#FACC15" : "#E2E8F0"}
                    strokeWidth={selected ? 3 : 1}
                    onClick={() => onSelectCell?.(cell.id)}
                  />

                  {showLabels ? (
                    <Text
                      x={originX + cell.unitX * cellSize + 3}
                      y={originY + cell.unitY * cellSize + 3}
                      width={cell.unitWidth * cellSize - 6}
                      text={`${cell.label}${variant ? `\n${variant.variantName}` : `\n${cell.status.toUpperCase()}`}`}
                      fill="#F8FAFC"
                      fontSize={Math.max(9, Math.floor(11 * zoom))}
                    />
                  ) : null}
                </Group>
              );
            })}

            {showDataLayer && dataPlan
              ? dataPlan.runs.map((run) => {
                  const anchor = run.cabinetIds.length ? activeCellMap.get(run.cabinetIds[0]) : null;
                  if (!anchor) {
                    return null;
                  }

                  const center = cabinetCenter(anchor, originX, originY, cellSize);
                  return (
                    <Group key={`data-run-${run.runNumber}`}>
                      <Line points={[originX + wallPixelWidth + 16, center.y, center.x, center.y]} stroke="#3B82F6" strokeWidth={2} />
                      <Text x={originX + wallPixelWidth + 20} y={center.y - 8} text={`D${run.runNumber}`} fill="#60A5FA" fontSize={10} />
                    </Group>
                  );
                })
              : null}

            {showPowerLayer && powerPlan
              ? powerPlan.circuits.map((circuit) => {
                  const anchor = circuit.cabinetIds.length ? activeCellMap.get(circuit.cabinetIds[0]) : null;
                  if (!anchor) {
                    return null;
                  }
                  const center = cabinetCenter(anchor, originX, originY, cellSize);
                  return (
                    <Group key={`power-${circuit.circuitNumber}`}>
                      <Line points={[originX - 16, center.y, center.x, center.y]} stroke="#F97316" strokeWidth={2} />
                      <Text x={originX - 62} y={center.y - 8} text={`P${circuit.circuitNumber}`} fill="#FB923C" fontSize={10} />
                    </Group>
                  );
                })
              : null}

            {showMeasurements ? (
              <>
                <Text
                  x={originX}
                  y={originY - 24}
                  text={`W: ${(wall.widthUnits * wall.baseUnitWidthMm) / 1000}m / ${(wall.widthUnits * wall.baseUnitWidthMm * 0.00328084).toFixed(2)}ft`}
                  fill="#CBD5E1"
                  fontSize={12}
                />
                <Text
                  x={originX + wallPixelWidth + 6}
                  y={originY + 4}
                  text={`H: ${(wall.heightUnits * wall.baseUnitHeightMm) / 1000}m / ${(wall.heightUnits * wall.baseUnitHeightMm * 0.00328084).toFixed(2)}ft`}
                  fill="#CBD5E1"
                  fontSize={12}
                />
              </>
            ) : null}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
