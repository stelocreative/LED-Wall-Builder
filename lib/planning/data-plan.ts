import { estimateHomeRunDistanceMeters } from "@/lib/domain/wall-layout";
import {
  CabinetVariant,
  DataPathMode,
  DataPlanResult,
  ProcessorModel,
  RackLocation,
  ReceivingCardModel,
  Wall,
  WallCell
} from "@/lib/domain/types";
import { metersToFeet, roundTo } from "@/lib/domain/conversions";

export interface DataPlanInput {
  wall: Wall;
  cells: WallCell[];
  variantsById: Record<string, CabinetVariant>;
  processor: ProcessorModel;
  receivingCard: ReceivingCardModel;
  dataPathMode: DataPathMode;
  loomBundleSize: number;
  portGroupSize: number;
  rackLocation: RackLocation;
}

interface RowBand {
  rowStart: number;
  rowEnd: number;
  cabinetIds: string[];
  pixelLoad: number;
}

function cabinetPixels(variant: CabinetVariant | undefined): number {
  if (!variant) {
    return 0;
  }
  return variant.pixels.width * variant.pixels.height;
}

function safeBoundaries(wall: Wall, cells: WallCell[]): number[] {
  const boundaries = [0, wall.heightUnits];

  for (let y = 1; y < wall.heightUnits; y += 1) {
    const cutsCabinet = cells.some((cell) => cell.unitY < y && y < cell.unitY + cell.unitHeight);
    if (!cutsCabinet) {
      boundaries.push(y);
    }
  }

  return Array.from(new Set(boundaries)).sort((a, b) => a - b);
}

function buildRowBands(input: DataPlanInput): RowBand[] {
  const active = input.cells.filter((cell) => cell.status === "active" && cell.variantId);
  const boundaries = safeBoundaries(input.wall, active);

  const bands: RowBand[] = [];

  for (let i = 0; i < boundaries.length - 1; i += 1) {
    const rowStart = boundaries[i];
    const rowEnd = boundaries[i + 1] - 1;

    const inBand = active.filter(
      (cell) => cell.unitY + cell.unitHeight - 1 >= rowStart && cell.unitY <= rowEnd && cell.variantId
    );

    if (!inBand.length) {
      continue;
    }

    const pixelLoad = inBand.reduce((sum, cell) => {
      const variant = cell.variantId ? input.variantsById[cell.variantId] : undefined;
      return sum + cabinetPixels(variant);
    }, 0);

    bands.push({
      rowStart,
      rowEnd,
      cabinetIds: inBand.map((cell) => cell.id),
      pixelLoad
    });
  }

  return bands;
}

function sortByPathMode(cells: WallCell[], mode: DataPathMode): WallCell[] {
  if (mode === "SNAKE_COLUMNS") {
    return [...cells].sort((a, b) => {
      if (a.unitX !== b.unitX) {
        return a.unitX - b.unitX;
      }
      const reverse = a.unitX % 2 === 1;
      return reverse ? b.unitY - a.unitY : a.unitY - b.unitY;
    });
  }

  if (mode === "CUSTOM") {
    return [...cells].sort((a, b) => a.label.localeCompare(b.label));
  }

  return [...cells].sort((a, b) => {
    if (a.unitY !== b.unitY) {
      return a.unitY - b.unitY;
    }
    const reverse = a.unitY % 2 === 1;
    return reverse ? b.unitX - a.unitX : a.unitX - b.unitX;
  });
}

export function buildDataPlan(input: DataPlanInput): DataPlanResult {
  const perPortLimit =
    input.receivingCard === "A8s" ? input.processor.maxPixelsPerPortA8s : input.processor.maxPixelsPerPortA10s;

  const active = sortByPathMode(
    input.cells.filter((cell) => cell.status === "active" && cell.variantId),
    input.dataPathMode
  );

  const rowBands = buildRowBands(input);

  const warnings: string[] = [];
  const runs: DataPlanResult["runs"] = [];

  const homeRunMeters = estimateHomeRunDistanceMeters(input.wall, input.rackLocation);

  rowBands.forEach((band, index) => {
    const portIndex = index % input.processor.ethernetPorts;
    const overLimit = band.pixelLoad > perPortLimit || index >= input.processor.ethernetPorts;

    if (overLimit) {
      warnings.push(
        `Run ${index + 1} exceeds ${input.receivingCard} port capacity (${band.pixelLoad.toLocaleString()} px > ${perPortLimit.toLocaleString()} px).`
      );
    }

    const cabinetsInRun = active.filter((cell) => band.cabinetIds.includes(cell.id));

    runs.push({
      runNumber: index + 1,
      processorPort: `Port ${portIndex + 1}`,
      portIndex,
      cabinetIds: cabinetsInRun.map((cell) => cell.id),
      cabinetCount: cabinetsInRun.length,
      jumperCount: Math.max(0, cabinetsInRun.length - 1),
      estimatedHomeRunMeters: homeRunMeters,
      estimatedHomeRunFeet: roundTo(metersToFeet(homeRunMeters), 1),
      loomBundle: Math.floor(portIndex / Math.max(1, input.loomBundleSize)) + 1,
      portGroup: Math.floor(portIndex / Math.max(1, input.portGroupSize)) + 1,
      cableOrigin: input.wall.deploymentType === "GROUND_STACK" ? "ground" : "air",
      pixelLoad: band.pixelLoad,
      overLimit
    });
  });

  if (runs.length === 0 && active.length > 0) {
    warnings.push("No data runs generated; verify wall cell statuses and variant assignments.");
  }

  const totalPixels = active.reduce((sum, cell) => {
    const variant = cell.variantId ? input.variantsById[cell.variantId] : undefined;
    return sum + cabinetPixels(variant);
  }, 0);

  return {
    processorId: input.processor.id,
    receivingCard: input.receivingCard,
    dataPathMode: input.dataPathMode,
    rackLocation: input.rackLocation,
    runs,
    totalPixels,
    warnings
  };
}
