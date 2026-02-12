import { DataBlock, DataPlanResult, PanelVariant, ProcessorModel, ReceivingCardModel, Wall } from "@/lib/domain/types";

export interface DataPlanInput {
  wall: Wall;
  processor: ProcessorModel;
  receivingCard: ReceivingCardModel;
  panelMap: Record<string, PanelVariant>;
  loomBundleSize: number;
  portGroupSize: number;
}

function lcm(a: number, b: number): number {
  const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
  return Math.abs((a * b) / gcd(a, b));
}

function isSafeBoundary(row: number, wall: Wall): boolean {
  return !wall.cabinets.some((cabinet) => cabinet.y < row && row < cabinet.y + cabinet.unitHeight);
}

function cabinetPixels(panelMap: Record<string, PanelVariant>, panelVariantId: string): number {
  const panel = panelMap[panelVariantId];
  if (!panel) {
    return 0;
  }
  return panel.pixels.width * panel.pixels.height;
}

function rowPixelLoad(row: number, wall: Wall, panelMap: Record<string, PanelVariant>): number {
  return wall.cabinets
    .filter((cabinet) => cabinet.y <= row && row < cabinet.y + cabinet.unitHeight)
    .reduce((sum, cabinet) => {
      const panel = panelMap[cabinet.panelVariantId];
      if (!panel) {
        return sum;
      }
      return sum + panel.pixels.width * (panel.pixels.height / panel.unitHeight);
    }, 0);
}

function chooseConsistentBlockRows(
  wall: Wall,
  maxRowsByCapacity: number,
  alignment: number
): number {
  const candidates: number[] = [];

  for (let rows = alignment; rows <= wall.heightUnits; rows += alignment) {
    if (rows > maxRowsByCapacity || wall.heightUnits % rows !== 0) {
      continue;
    }

    let valid = true;
    for (let boundary = rows; boundary < wall.heightUnits; boundary += rows) {
      if (!isSafeBoundary(boundary, wall)) {
        valid = false;
        break;
      }
    }

    if (valid) {
      candidates.push(rows);
    }
  }

  if (candidates.length > 0) {
    return Math.max(...candidates);
  }

  for (let rows = Math.min(maxRowsByCapacity, wall.heightUnits); rows >= 1; rows -= 1) {
    if (wall.heightUnits % rows !== 0) {
      continue;
    }

    let valid = true;
    for (let boundary = rows; boundary < wall.heightUnits; boundary += rows) {
      if (!isSafeBoundary(boundary, wall)) {
        valid = false;
        break;
      }
    }

    if (valid) {
      return rows;
    }
  }

  return 1;
}

export function buildDataPlan(input: DataPlanInput): DataPlanResult {
  const { wall, processor, receivingCard, panelMap } = input;

  const allPixels = wall.cabinets.reduce((sum, cabinet) => sum + cabinetPixels(panelMap, cabinet.panelVariantId), 0);
  const perPortLimit = processor.maxPixelsPerPort[receivingCard];
  const maxRowPixels = Math.max(...Array.from({ length: wall.heightUnits }, (_, row) => rowPixelLoad(row, wall, panelMap)), 1);

  const cabinetHeights = wall.cabinets.map((cabinet) => cabinet.unitHeight);
  const alignment = cabinetHeights.reduce((acc, value) => lcm(acc, value), 1);

  const maxRowsByCapacity = Math.max(alignment, Math.floor(perPortLimit / maxRowPixels));
  const blockRows = chooseConsistentBlockRows(wall, maxRowsByCapacity, alignment);

  const blocks: DataBlock[] = [];
  let overload = false;

  const blockCount = Math.ceil(wall.heightUnits / blockRows);
  for (let i = 0; i < blockCount; i += 1) {
    const rowStart = i * blockRows;
    const rowEnd = Math.min(wall.heightUnits - 1, rowStart + blockRows - 1);

    const cabinetIds = wall.cabinets
      .filter((cabinet) => cabinet.y + cabinet.unitHeight - 1 >= rowStart && cabinet.y <= rowEnd)
      .map((cabinet) => cabinet.id);

    const pixelLoad = cabinetIds.reduce((sum, id) => {
      const cabinet = wall.cabinets.find((item) => item.id === id);
      if (!cabinet) {
        return sum;
      }
      return sum + cabinetPixels(panelMap, cabinet.panelVariantId);
    }, 0);

    const portIndex = i % processor.ethernetPorts;
    if (pixelLoad > perPortLimit || i >= processor.ethernetPorts) {
      overload = true;
    }

    blocks.push({
      portIndex,
      rowStart,
      rowEnd,
      cabinetIds,
      pixelLoad,
      loomBundle: Math.floor(portIndex / Math.max(1, input.loomBundleSize)) + 1,
      portGroup: Math.floor(portIndex / Math.max(1, input.portGroupSize)) + 1,
      cableOrigin: wall.riggingMode === "ground" ? "ground" : "air"
    });
  }

  const notes: string[] = [];
  if (overload) {
    notes.push("Processor port load exceeds safe threshold; increase processor capacity or split wall.");
  }
  notes.push(`Data origin: ${wall.riggingMode === "ground" ? "ground rack-up" : "air-down flown origin"}`);
  notes.push(`Rack location: ${wall.rackLocation}`);

  return {
    processorId: processor.id,
    receivingCard,
    rackLocation: wall.rackLocation,
    riggingMode: wall.riggingMode,
    blockRows,
    totalPixels: allPixels,
    blocks,
    overload,
    notes
  };
}
