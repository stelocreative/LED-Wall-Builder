import { feetToMeters, kgToLbs, metersToFeet, metersToFeetInchesLabel, roundTo } from "@/lib/domain/conversions";
import { CabinetVariant, PowerProfile, Wall, WallCell, WallTotals } from "@/lib/domain/types";

export interface GridDeriveInput {
  widthMeters?: number;
  heightMeters?: number;
  widthFeet?: number;
  heightFeet?: number;
  widthUnits?: number;
  heightUnits?: number;
  baseUnitWidthMm: number;
  baseUnitHeightMm: number;
}

export interface GridDeriveResult {
  widthUnits: number;
  heightUnits: number;
  snappedWidthMeters: number;
  snappedHeightMeters: number;
}

function safePositive(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return fallback;
  }
  return value;
}

function emptyPowerProfile(): PowerProfile {
  return { min: 0, typ: 0, max: 0, peak: 0 };
}

function addPower(a: PowerProfile, b: PowerProfile): PowerProfile {
  return {
    min: a.min + b.min,
    typ: a.typ + b.typ,
    max: a.max + b.max,
    peak: a.peak + b.peak
  };
}

export function deriveGrid(input: GridDeriveInput): GridDeriveResult {
  if (input.widthUnits && input.heightUnits) {
    const widthUnits = Math.max(1, Math.floor(input.widthUnits));
    const heightUnits = Math.max(1, Math.floor(input.heightUnits));

    return {
      widthUnits,
      heightUnits,
      snappedWidthMeters: (widthUnits * input.baseUnitWidthMm) / 1000,
      snappedHeightMeters: (heightUnits * input.baseUnitHeightMm) / 1000
    };
  }

  const widthMeters =
    input.widthMeters ??
    (input.widthFeet ? feetToMeters(input.widthFeet) : (safePositive(input.baseUnitWidthMm, 500) * 8) / 1000);
  const heightMeters =
    input.heightMeters ??
    (input.heightFeet ? feetToMeters(input.heightFeet) : (safePositive(input.baseUnitHeightMm, 500) * 6) / 1000);

  const widthUnits = Math.max(1, Math.round((safePositive(widthMeters, 1) * 1000) / input.baseUnitWidthMm));
  const heightUnits = Math.max(1, Math.round((safePositive(heightMeters, 1) * 1000) / input.baseUnitHeightMm));

  return {
    widthUnits,
    heightUnits,
    snappedWidthMeters: (widthUnits * input.baseUnitWidthMm) / 1000,
    snappedHeightMeters: (heightUnits * input.baseUnitHeightMm) / 1000
  };
}

export function nextCabinetLabel(cells: WallCell[]): string {
  const maxNumber = cells.reduce((max, cell) => {
    const match = cell.label.match(/(\d+)/);
    if (!match) {
      return max;
    }
    return Math.max(max, Number(match[1]));
  }, 0);

  return `C${String(maxNumber + 1).padStart(3, "0")}`;
}

export function variantFitsInWall(
  wall: Pick<Wall, "widthUnits" | "heightUnits">,
  variant: Pick<CabinetVariant, "unitWidth" | "unitHeight">,
  unitX: number,
  unitY: number
): boolean {
  return (
    unitX >= 0 &&
    unitY >= 0 &&
    unitX + variant.unitWidth <= wall.widthUnits &&
    unitY + variant.unitHeight <= wall.heightUnits
  );
}

export function variantUnitsForBase(
  variant: Pick<CabinetVariant, "dimensionsMm">,
  baseUnitWidthMm: number,
  baseUnitHeightMm: number
): { unitWidth: number; unitHeight: number } {
  return {
    unitWidth: Math.max(1, Math.round(variant.dimensionsMm.widthMm / Math.max(1, baseUnitWidthMm))),
    unitHeight: Math.max(1, Math.round(variant.dimensionsMm.heightMm / Math.max(1, baseUnitHeightMm)))
  };
}

export function hasOverlap(cells: WallCell[], candidate: Pick<WallCell, "unitX" | "unitY" | "unitWidth" | "unitHeight">): boolean {
  return cells
    .filter((cell) => cell.status !== "void" && cell.status !== "cutout")
    .some((cell) => {
      const noOverlap =
        candidate.unitX + candidate.unitWidth <= cell.unitX ||
        cell.unitX + cell.unitWidth <= candidate.unitX ||
        candidate.unitY + candidate.unitHeight <= cell.unitY ||
        cell.unitY + cell.unitHeight <= candidate.unitY;
      return !noOverlap;
    });
}

export function placeVariantOnGrid(params: {
  wall: Wall;
  cells: WallCell[];
  wallId: string;
  variant: CabinetVariant;
  unitX: number;
  unitY: number;
  status?: WallCell["status"];
  notes?: string;
}): { ok: true; cells: WallCell[] } | { ok: false; reason: string } {
  const { wall, cells, variant, unitX, unitY } = params;
  const footprint = variantUnitsForBase(variant, wall.baseUnitWidthMm, wall.baseUnitHeightMm);

  if (!variantFitsInWall(wall, footprint, unitX, unitY)) {
    return { ok: false, reason: "Cabinet is out of wall bounds." };
  }

  const candidate: WallCell = {
    id: crypto.randomUUID(),
    wallId: params.wallId,
    variantId: variant.id,
    label: nextCabinetLabel(cells),
    unitX,
    unitY,
    unitWidth: footprint.unitWidth,
    unitHeight: footprint.unitHeight,
    status: params.status ?? "active",
    notes: params.notes ?? ""
  };

  if (hasOverlap(cells, candidate)) {
    return { ok: false, reason: "Cabinet overlaps existing placement." };
  }

  return { ok: true, cells: [...cells, candidate] };
}

export function removeCellAtCoordinate(cells: WallCell[], unitX: number, unitY: number): WallCell[] {
  return cells.filter((cell) => {
    const insideX = unitX >= cell.unitX && unitX < cell.unitX + cell.unitWidth;
    const insideY = unitY >= cell.unitY && unitY < cell.unitY + cell.unitHeight;
    return !(insideX && insideY);
  });
}

export function autoFillWall(params: {
  wallId: string;
  widthUnits: number;
  heightUnits: number;
  baseUnitWidthMm?: number;
  baseUnitHeightMm?: number;
  primaryVariant: CabinetVariant;
  secondaryVariant?: CabinetVariant | null;
  secondaryEveryNColumns?: number;
}): WallCell[] {
  const filled: WallCell[] = [];
  const occupied = Array.from({ length: params.heightUnits }, () => Array<boolean>(params.widthUnits).fill(false));
  const baseUnitWidthMm = params.baseUnitWidthMm ?? 500;
  const baseUnitHeightMm = params.baseUnitHeightMm ?? 500;

  const everyN = Math.max(2, params.secondaryEveryNColumns ?? 4);

  for (let y = 0; y < params.heightUnits; y += 1) {
    for (let x = 0; x < params.widthUnits; x += 1) {
      if (occupied[y][x]) {
        continue;
      }

      let chosen = params.primaryVariant;
      let footprint = variantUnitsForBase(chosen, baseUnitWidthMm, baseUnitHeightMm);

      if (
        params.secondaryVariant &&
        x % everyN === everyN - 1 &&
        y + variantUnitsForBase(params.secondaryVariant, baseUnitWidthMm, baseUnitHeightMm).unitHeight <= params.heightUnits
      ) {
        chosen = params.secondaryVariant;
        footprint = variantUnitsForBase(chosen, baseUnitWidthMm, baseUnitHeightMm);
      }

      if (x + footprint.unitWidth > params.widthUnits || y + footprint.unitHeight > params.heightUnits) {
        continue;
      }

      let overlaps = false;
      for (let yy = y; yy < y + footprint.unitHeight; yy += 1) {
        for (let xx = x; xx < x + footprint.unitWidth; xx += 1) {
          if (occupied[yy][xx]) {
            overlaps = true;
            break;
          }
        }
      }

      if (overlaps) {
        continue;
      }

      for (let yy = y; yy < y + footprint.unitHeight; yy += 1) {
        for (let xx = x; xx < x + footprint.unitWidth; xx += 1) {
          occupied[yy][xx] = true;
        }
      }

      filled.push({
        id: crypto.randomUUID(),
        wallId: params.wallId,
        variantId: chosen.id,
        label: `C${String(filled.length + 1).padStart(3, "0")}`,
        unitX: x,
        unitY: y,
        unitWidth: footprint.unitWidth,
        unitHeight: footprint.unitHeight,
        status: "active",
        notes: ""
      });
    }
  }

  return filled;
}

export function computeWallTotals(params: {
  wall: Wall;
  cells: WallCell[];
  variantsById: Record<string, CabinetVariant>;
  familiesById: Record<string, { familyName: string }>;
}): WallTotals {
  const { wall, variantsById, familiesById } = params;
  const activeCells = params.cells.filter((cell) => cell.status === "active" && cell.variantId);

  const widthMeters = (wall.widthUnits * wall.baseUnitWidthMm) / 1000;
  const heightMeters = (wall.heightUnits * wall.baseUnitHeightMm) / 1000;

  const variantBreakdownMap = new Map<string, WallTotals["variantBreakdown"][number]>();

  let totalPower = emptyPowerProfile();
  let totalPixels = 0;

  const pitchSamples = new Set<number>();

  for (const cell of activeCells) {
    if (!cell.variantId) {
      continue;
    }
    const variant = variantsById[cell.variantId];
    if (!variant) {
      continue;
    }

    const variantPixels = variant.pixels.width * variant.pixels.height;
    totalPixels += variantPixels;
    totalPower = addPower(totalPower, variant.power);

    pitchSamples.add(roundTo(variant.dimensionsMm.widthMm / Math.max(1, variant.pixels.width), 5));

    const existing = variantBreakdownMap.get(variant.id);
    const family = familiesById[variant.familyId]?.familyName ?? "Unknown Family";

    if (existing) {
      existing.count += 1;
      existing.weightKg += variant.weightKg;
      existing.weightLbs += variant.weightLbs;
      existing.pixels += variantPixels;
      existing.power = addPower(existing.power, variant.power);
    } else {
      variantBreakdownMap.set(variant.id, {
        variantId: variant.id,
        familyName: family,
        variantName: variant.variantName,
        count: 1,
        weightKg: variant.weightKg,
        weightLbs: variant.weightLbs,
        pixels: variantPixels,
        power: { ...variant.power }
      });
    }
  }

  const weightedPitch = (() => {
    const pitches = Array.from(pitchSamples);
    if (!pitches.length) {
      return 3.9;
    }
    return pitches.reduce((sum, value) => sum + value, 0) / pitches.length;
  })();

  const wallWidthMm = wall.widthUnits * wall.baseUnitWidthMm;
  const wallHeightMm = wall.heightUnits * wall.baseUnitHeightMm;

  const wallResolution = {
    width: Math.round(wallWidthMm / weightedPitch),
    height: Math.round(wallHeightMm / weightedPitch)
  };

  const totalWeightKg = Array.from(variantBreakdownMap.values()).reduce((sum, item) => sum + item.weightKg, 0);
  const totalWeightLbs = kgToLbs(totalWeightKg);

  const totalCurrent: PowerProfile = {
    min: totalPower.min / wall.voltageMode,
    typ: totalPower.typ / wall.voltageMode,
    max: totalPower.max / wall.voltageMode,
    peak: totalPower.peak / wall.voltageMode
  };

  return {
    widthMeters,
    heightMeters,
    widthFeet: metersToFeet(widthMeters),
    heightFeet: metersToFeet(heightMeters),
    widthFeetInchesLabel: metersToFeetInchesLabel(widthMeters),
    heightFeetInchesLabel: metersToFeetInchesLabel(heightMeters),
    totalCabinets: activeCells.length,
    totalWeightKg,
    totalWeightLbs,
    wallResolution,
    totalPixels,
    totalPower,
    totalCurrent,
    variantBreakdown: Array.from(variantBreakdownMap.values()).sort((a, b) => a.variantName.localeCompare(b.variantName)),
    mixedPitchWarning:
      pitchSamples.size > 1
        ? "Mixed pixel pitch detected. Wall output resolution is estimated from averaged pitch values."
        : null
  };
}

export function estimateHomeRunDistanceMeters(wall: Wall, rackLocation: Wall["rackLocation"]): number {
  const wallWidthM = (wall.widthUnits * wall.baseUnitWidthMm) / 1000;
  const wallHeightM = (wall.heightUnits * wall.baseUnitHeightMm) / 1000;

  switch (rackLocation) {
    case "SL":
    case "SR":
      return roundTo(Math.max(wallWidthM * 0.3, wallHeightM * 0.75), 1);
    case "USC":
      return roundTo(Math.max(wallHeightM * 0.5, wallWidthM * 0.25), 1);
    case "FOH":
    default:
      return roundTo(wallWidthM + wallHeightM, 1);
  }
}

export function totalsToDisplayRow(totals: WallTotals): string {
  return `${roundTo(totals.widthMeters, 2)}m x ${roundTo(totals.heightMeters, 2)}m | ${roundTo(
    totals.widthFeet,
    2
  )}ft x ${roundTo(totals.heightFeet, 2)}ft`;
}
