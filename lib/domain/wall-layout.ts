import { BASE_UNIT_MM } from "@/lib/domain/catalog";
import { CabinetPlacement, PanelVariant } from "@/lib/domain/types";

export interface WallGridResult {
  widthUnits: number;
  heightUnits: number;
  snappedWidthMeters: number;
  snappedHeightMeters: number;
}

export function deriveWallGridFromMeters(widthMeters: number, heightMeters: number): WallGridResult {
  const widthUnits = Math.max(1, Math.ceil((widthMeters * 1000) / BASE_UNIT_MM));
  const heightUnits = Math.max(1, Math.ceil((heightMeters * 1000) / BASE_UNIT_MM));

  return {
    widthUnits,
    heightUnits,
    snappedWidthMeters: (widthUnits * BASE_UNIT_MM) / 1000,
    snappedHeightMeters: (heightUnits * BASE_UNIT_MM) / 1000
  };
}

export function autoPopulateWall(
  widthUnits: number,
  heightUnits: number,
  variantMap: Record<string, PanelVariant>,
  options?: {
    primaryVariantId?: string;
    includeTallMix?: boolean;
    tallEveryNColumns?: number;
  }
): CabinetPlacement[] {
  const placements: CabinetPlacement[] = [];
  const occupied: boolean[][] = Array.from({ length: heightUnits }, () => Array(widthUnits).fill(false));

  const primaryVariant = variantMap[options?.primaryVariantId ?? "P500x500"] ?? Object.values(variantMap)[0];
  const tallVariant = Object.values(variantMap).find((variant) => variant.unitHeight === 2 && variant.unitWidth === 1);
  const includeTall = Boolean(options?.includeTallMix && tallVariant);
  const tallEveryNColumns = Math.max(2, options?.tallEveryNColumns ?? 4);

  let index = 1;

  for (let y = 0; y < heightUnits; y += 1) {
    for (let x = 0; x < widthUnits; x += 1) {
      if (occupied[y][x]) {
        continue;
      }

      const shouldPlaceTall =
        includeTall &&
        tallVariant &&
        x % tallEveryNColumns === tallEveryNColumns - 1 &&
        y + tallVariant.unitHeight <= heightUnits &&
        !occupied[y + 1][x];

      const chosenVariant = shouldPlaceTall ? tallVariant : primaryVariant;

      if (!chosenVariant) {
        continue;
      }

      if (x + chosenVariant.unitWidth > widthUnits || y + chosenVariant.unitHeight > heightUnits) {
        continue;
      }

      let overlaps = false;
      for (let yy = y; yy < y + chosenVariant.unitHeight; yy += 1) {
        for (let xx = x; xx < x + chosenVariant.unitWidth; xx += 1) {
          if (occupied[yy][xx]) {
            overlaps = true;
          }
        }
      }

      if (overlaps) {
        continue;
      }

      for (let yy = y; yy < y + chosenVariant.unitHeight; yy += 1) {
        for (let xx = x; xx < x + chosenVariant.unitWidth; xx += 1) {
          occupied[yy][xx] = true;
        }
      }

      placements.push({
        id: `cab-${index}`,
        panelVariantId: chosenVariant.id,
        x,
        y,
        unitWidth: chosenVariant.unitWidth,
        unitHeight: chosenVariant.unitHeight,
        label: `C${index.toString().padStart(3, "0")}`
      });
      index += 1;
    }
  }

  return placements;
}

export function wallAreaSqM(widthUnits: number, heightUnits: number): number {
  return ((widthUnits * BASE_UNIT_MM) / 1000) * ((heightUnits * BASE_UNIT_MM) / 1000);
}

export function validateNoOverlap(cabinets: CabinetPlacement[], widthUnits: number, heightUnits: number): string[] {
  const errors: string[] = [];
  const map = Array.from({ length: heightUnits }, () => Array<string | null>(widthUnits).fill(null));

  for (const cabinet of cabinets) {
    if (
      cabinet.x < 0 ||
      cabinet.y < 0 ||
      cabinet.x + cabinet.unitWidth > widthUnits ||
      cabinet.y + cabinet.unitHeight > heightUnits
    ) {
      errors.push(`${cabinet.label} is out of wall bounds`);
      continue;
    }

    for (let y = cabinet.y; y < cabinet.y + cabinet.unitHeight; y += 1) {
      for (let x = cabinet.x; x < cabinet.x + cabinet.unitWidth; x += 1) {
        if (map[y][x]) {
          errors.push(`${cabinet.label} overlaps with ${map[y][x]}`);
        }
        map[y][x] = cabinet.label;
      }
    }
  }

  return errors;
}
