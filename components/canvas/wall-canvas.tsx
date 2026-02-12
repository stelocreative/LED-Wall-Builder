"use client";

import { useMemo } from "react";
import { Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import { DataPlanResult, PanelVariant, PowerPlanResult, Wall } from "@/lib/domain/types";

interface Props {
  wall: Wall;
  panelMap: Record<string, PanelVariant>;
  dataPlan?: DataPlanResult | null;
  powerPlan?: PowerPlanResult | null;
  selectedCabinetId?: string | null;
  onSelectCabinet?: (id: string) => void;
}

const STAGE_WIDTH = 1024;
const STAGE_HEIGHT = 720;
const PADDING = 40;

const variantColors: Record<string, string> = {
  P500x500: "#0EA5E9",
  P500x1000: "#22C55E"
};

export function WallCanvas({ wall, panelMap, dataPlan, powerPlan, selectedCabinetId, onSelectCabinet }: Props) {
  const { cellSize, wallPixelWidth, wallPixelHeight } = useMemo(() => {
    const cellByWidth = (STAGE_WIDTH - PADDING * 2) / wall.widthUnits;
    const cellByHeight = (STAGE_HEIGHT - PADDING * 2) / wall.heightUnits;
    const cellSize = Math.floor(Math.max(12, Math.min(cellByWidth, cellByHeight)));

    return {
      cellSize,
      wallPixelWidth: wall.widthUnits * cellSize,
      wallPixelHeight: wall.heightUnits * cellSize
    };
  }, [wall.heightUnits, wall.widthUnits]);

  const startX = (STAGE_WIDTH - wallPixelWidth) / 2;
  const startY = (STAGE_HEIGHT - wallPixelHeight) / 2;

  return (
    <div className="canvas-shell">
      <Stage width={STAGE_WIDTH} height={STAGE_HEIGHT}>
        <Layer>
          <Rect
            x={startX}
            y={startY}
            width={wallPixelWidth}
            height={wallPixelHeight}
            stroke="#475569"
            strokeWidth={2}
            fill="#0A0F18"
          />

          {Array.from({ length: wall.widthUnits + 1 }, (_, index) => (
            <Line
              key={`gx-${index}`}
              points={[startX + index * cellSize, startY, startX + index * cellSize, startY + wallPixelHeight]}
              stroke="#1F2937"
              strokeWidth={1}
            />
          ))}

          {Array.from({ length: wall.heightUnits + 1 }, (_, index) => (
            <Line
              key={`gy-${index}`}
              points={[startX, startY + index * cellSize, startX + wallPixelWidth, startY + index * cellSize]}
              stroke="#1F2937"
              strokeWidth={1}
            />
          ))}

          {wall.cabinets.map((cabinet) => {
            const panel = panelMap[cabinet.panelVariantId];
            const isSelected = cabinet.id === selectedCabinetId;

            return (
              <Group key={cabinet.id} onClick={() => onSelectCabinet?.(cabinet.id)}>
                <Rect
                  x={startX + cabinet.x * cellSize + 1}
                  y={startY + cabinet.y * cellSize + 1}
                  width={cabinet.unitWidth * cellSize - 2}
                  height={cabinet.unitHeight * cellSize - 2}
                  fill={variantColors[cabinet.panelVariantId] ?? "#64748B"}
                  opacity={0.8}
                  stroke={isSelected ? "#F59E0B" : "#E2E8F0"}
                  strokeWidth={isSelected ? 3 : 1}
                  cornerRadius={2}
                />
                <Text
                  x={startX + cabinet.x * cellSize + 4}
                  y={startY + cabinet.y * cellSize + 4}
                  text={`${cabinet.label}\n${panel?.name ?? cabinet.panelVariantId}`}
                  fill="#F8FAFC"
                  fontSize={11}
                  width={cabinet.unitWidth * cellSize - 8}
                />
              </Group>
            );
          })}

          {dataPlan?.blocks.map((block, index) => {
            const x = startX + wallPixelWidth + 8;
            const y = startY + ((block.rowStart + block.rowEnd + 1) / 2) * cellSize;

            return (
              <Group key={`data-${index}`}>
                <Line points={[x, y, startX + wallPixelWidth - 4, y]} stroke="#F97316" strokeWidth={2} pointerLength={6} />
                <Text x={x + 10} y={y - 8} text={`P${block.portIndex + 1}`} fill="#F97316" fontSize={11} />
              </Group>
            );
          })}

          {powerPlan?.circuits.map((circuit, index) => {
            const x = startX - 10;
            const y = startY + ((index + 0.5) / powerPlan.circuits.length) * wallPixelHeight;

            return (
              <Group key={`power-${circuit.circuitNumber}`}>
                <Line points={[x, y, startX + 4, y]} stroke="#22C55E" strokeWidth={2} pointerLength={6} />
                <Text x={x - 55} y={y - 8} text={`C${circuit.circuitNumber}`} fill="#22C55E" fontSize={11} />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
