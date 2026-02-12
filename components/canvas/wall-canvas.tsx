"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Arrow, Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import { CabinetVariant, DataPlanResult, PowerPlanResult, Wall, WallCell } from "@/lib/domain/types";

interface RouteOffset {
  x: number;
  y: number;
}

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
  dataRouteOffsets?: Record<number, RouteOffset>;
  powerRouteOffsets?: Record<number, RouteOffset>;
  onSelectCell?: (cellId: string | null) => void;
  onGridClick?: (unitX: number, unitY: number) => void;
  onMoveCell?: (cellId: string, unitX: number, unitY: number) => void;
  onDropVariant?: (variantId: string, unitX: number, unitY: number) => void;
  onDataRouteOffsetChange?: (runNumber: number, offset: RouteOffset) => void;
  onPowerRouteOffsetChange?: (circuitNumber: number, offset: RouteOffset) => void;
}

interface Point {
  x: number;
  y: number;
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function cabinetAnchor(cell: WallCell, originX: number, originY: number, size: number, layer: "data" | "power"): Point {
  const verticalRatio = layer === "data" ? 0.35 : 0.65;
  return {
    x: originX + (cell.unitX + cell.unitWidth / 2) * size,
    y: originY + (cell.unitY + cell.unitHeight * verticalRatio) * size
  };
}

function rackSourcePoint(
  wall: Wall,
  originX: number,
  originY: number,
  wallPixelWidth: number,
  wallPixelHeight: number,
  index: number,
  layer: "data" | "power"
): Point {
  const laneShift = (index % 8) * 14 - 28;
  const layerBias = layer === "data" ? -8 : 8;

  switch (wall.rackLocation) {
    case "SL":
      return {
        x: originX - 26,
        y: originY + wallPixelHeight * 0.5 + laneShift + layerBias
      };
    case "SR":
      return {
        x: originX + wallPixelWidth + 26,
        y: originY + wallPixelHeight * 0.5 + laneShift + layerBias
      };
    case "USC":
      return {
        x: originX + wallPixelWidth * 0.5 + laneShift,
        y: originY - 26 + layerBias
      };
    case "FOH":
    default:
      return {
        x: originX + wallPixelWidth * 0.5 + laneShift,
        y: originY + wallPixelHeight + 26 + layerBias
      };
  }
}

function buildRoutePoints(source: Point, anchors: Point[]): number[] {
  if (!anchors.length) {
    return [];
  }

  const points: number[] = [source.x, source.y];
  for (const anchor of anchors) {
    points.push(anchor.x, anchor.y);
  }

  return points;
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
  dataRouteOffsets,
  powerRouteOffsets,
  onSelectCell,
  onGridClick,
  onMoveCell,
  onDropVariant,
  onDataRouteOffsetChange,
  onPowerRouteOffsetChange
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

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

  function pointerToUnit(clientX: number, clientY: number): { unitX: number; unitY: number } | null {
    const container = containerRef.current;
    if (!container) {
      return null;
    }

    const bounds = container.getBoundingClientRect();
    const localX = (clientX - bounds.left - (originX + pan.x)) / cellSize;
    const localY = (clientY - bounds.top - (originY + pan.y)) / cellSize;

    const unitX = Math.floor(localX);
    const unitY = Math.floor(localY);

    if (unitX < 0 || unitY < 0 || unitX >= wall.widthUnits || unitY >= wall.heightUnits) {
      return null;
    }

    return { unitX, unitY };
  }

  return (
    <div className="canvas-shell">
      <div className="header-actions" style={{ marginBottom: "0.5rem" }}>
        <button className="btn btn-secondary btn-small" type="button" onClick={() => setZoom((current) => Math.max(0.5, round(current - 0.1)))}>
          Zoom -
        </button>
        <button className="btn btn-secondary btn-small" type="button" onClick={() => setZoom((current) => Math.min(2.5, round(current + 0.1)))}>
          Zoom +
        </button>
        <button className="btn btn-secondary btn-small" type="button" onClick={() => {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }}>
          Reset View
        </button>
      </div>

      <div
        ref={containerRef}
        onDragOver={(event) => {
          if (!onDropVariant) {
            return;
          }
          event.preventDefault();
        }}
        onDrop={(event) => {
          if (!onDropVariant) {
            return;
          }

          event.preventDefault();
          const variantId =
            event.dataTransfer.getData("application/x-led-variant-id") || event.dataTransfer.getData("text/plain");

          if (!variantId) {
            return;
          }

          const unit = pointerToUnit(event.clientX, event.clientY);
          if (!unit) {
            return;
          }

          onDropVariant(variantId, unit.unitX, unit.unitY);
        }}
      >
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
                const boxWidth = cell.unitWidth * cellSize - 2;
                const boxHeight = cell.unitHeight * cellSize - 2;

                return (
                  <Group
                    key={cell.id}
                    x={originX + cell.unitX * cellSize + 1}
                    y={originY + cell.unitY * cellSize + 1}
                    draggable={Boolean(onMoveCell)}
                    onDragEnd={(event) => {
                      if (!onMoveCell) {
                        return;
                      }

                      const nextUnitX = Math.round((event.target.x() - originX - 1) / cellSize);
                      const nextUnitY = Math.round((event.target.y() - originY - 1) / cellSize);
                      onMoveCell(cell.id, nextUnitX, nextUnitY);
                    }}
                    onClick={() => onSelectCell?.(cell.id)}
                  >
                    <Rect
                      width={boxWidth}
                      height={boxHeight}
                      fill={fillColor}
                      opacity={cell.status === "active" ? 0.88 : 0.45}
                      stroke={selected ? "#FACC15" : "#E2E8F0"}
                      strokeWidth={selected ? 3 : 1}
                      cornerRadius={2}
                    />

                    <Text
                      x={4}
                      y={4}
                      text={
                        showLabels
                          ? `${cell.label}${variant ? `\n${variant.variantName}` : `\n${cell.status.toUpperCase()}`}`
                          : `${variant ? `${variant.unitWidth}x${variant.unitHeight}` : ""}`
                      }
                      fill="#F8FAFC"
                      fontSize={Math.max(9, Math.floor(11 * zoom))}
                      width={Math.max(1, boxWidth - 6)}
                    />
                  </Group>
                );
              })}

              {showDataLayer && dataPlan
                ? dataPlan.runs.map((run, index) => {
                    const routeCells = run.cabinetIds
                      .map((cabinetId) => activeCellMap.get(cabinetId))
                      .filter((cell): cell is WallCell => Boolean(cell));

                    if (!routeCells.length) {
                      return null;
                    }

                    const sourceBase = rackSourcePoint(wall, originX, originY, wallPixelWidth, wallPixelHeight, index, "data");
                    const manualOffset = dataRouteOffsets?.[run.runNumber] ?? { x: 0, y: 0 };
                    const source = {
                      x: sourceBase.x + manualOffset.x,
                      y: sourceBase.y + manualOffset.y
                    };

                    const anchors = routeCells.map((cell) => cabinetAnchor(cell, originX, originY, cellSize, "data"));
                    const points = buildRoutePoints(source, anchors);

                    if (!points.length) {
                      return null;
                    }

                    return (
                      <Group key={`data-run-${run.runNumber}`}>
                        <Arrow
                          points={points}
                          stroke="#3B82F6"
                          fill="#3B82F6"
                          strokeWidth={2}
                          pointerWidth={7}
                          pointerLength={7}
                          tension={0}
                        />
                        <Circle
                          x={source.x}
                          y={source.y}
                          radius={5}
                          fill="#60A5FA"
                          stroke="#E2E8F0"
                          strokeWidth={1}
                          draggable
                          onDragMove={(event) => {
                            if (!onDataRouteOffsetChange) {
                              return;
                            }
                            onDataRouteOffsetChange(run.runNumber, {
                              x: round(event.target.x() - sourceBase.x),
                              y: round(event.target.y() - sourceBase.y)
                            });
                          }}
                        />
                        <Text x={source.x + 8} y={source.y - 8} text={`D${run.runNumber}`} fill="#60A5FA" fontSize={10} />
                      </Group>
                    );
                  })
                : null}

              {showPowerLayer && powerPlan
                ? powerPlan.circuits.map((circuit, index) => {
                    const routeCells = circuit.cabinetIds
                      .map((cabinetId) => activeCellMap.get(cabinetId))
                      .filter((cell): cell is WallCell => Boolean(cell));

                    if (!routeCells.length) {
                      return null;
                    }

                    const sourceBase = rackSourcePoint(wall, originX, originY, wallPixelWidth, wallPixelHeight, index, "power");
                    const manualOffset = powerRouteOffsets?.[circuit.circuitNumber] ?? { x: 0, y: 0 };
                    const source = {
                      x: sourceBase.x + manualOffset.x,
                      y: sourceBase.y + manualOffset.y
                    };

                    const anchors = routeCells.map((cell) => cabinetAnchor(cell, originX, originY, cellSize, "power"));
                    const points = buildRoutePoints(source, anchors);

                    if (!points.length) {
                      return null;
                    }

                    return (
                      <Group key={`power-${circuit.circuitNumber}`}>
                        <Arrow
                          points={points}
                          stroke="#F97316"
                          fill="#F97316"
                          strokeWidth={2}
                          pointerWidth={7}
                          pointerLength={7}
                          tension={0}
                        />
                        <Circle
                          x={source.x}
                          y={source.y}
                          radius={5}
                          fill="#FB923C"
                          stroke="#E2E8F0"
                          strokeWidth={1}
                          draggable
                          onDragMove={(event) => {
                            if (!onPowerRouteOffsetChange) {
                              return;
                            }
                            onPowerRouteOffsetChange(circuit.circuitNumber, {
                              x: round(event.target.x() - sourceBase.x),
                              y: round(event.target.y() - sourceBase.y)
                            });
                          }}
                        />
                        <Text x={source.x + 8} y={source.y - 8} text={`P${circuit.circuitNumber}`} fill="#FB923C" fontSize={10} />
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
    </div>
  );
}
