import { kgToLbs, mmToInches, roundTo } from "@/lib/domain/conversions";
import {
  CabinetVariant,
  PanelFamily,
  ProcessorModel,
  ReceivingCardModel,
  ShowEvent,
  ThemeSettings,
  Wall,
  WallCell
} from "@/lib/domain/types";

export const DEFAULT_BASE_UNIT_MM = 500;

export const defaultPanelFamilies: PanelFamily[] = [
  {
    id: "absen-pl39-v2",
    manufacturer: "Absen",
    familyName: "PL3.9 Pro V2",
    pixelPitchMm: 3.9,
    notes: "Touring frame with front/rear service support",
    outdoorRating: "IP65 front / IP54 rear",
    serviceAccess: "Front + Rear"
  }
];

function makeVariant(input: {
  id: string;
  familyId: string;
  variantName: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  pixelWidth: number;
  pixelHeight: number;
  weightKg: number;
  minW: number;
  typW: number;
  maxW: number;
  peakW?: number;
  rec20a120: number;
  rec20a208: number;
  recSoca120: number;
  recSoca208: number;
  recL2130: number;
}): CabinetVariant {
  return {
    id: input.id,
    familyId: input.familyId,
    variantName: input.variantName,
    dimensionsMm: {
      widthMm: input.widthMm,
      heightMm: input.heightMm,
      depthMm: input.depthMm
    },
    dimensionsIn: {
      widthIn: roundTo(mmToInches(input.widthMm), 2),
      heightIn: roundTo(mmToInches(input.heightMm), 2),
      depthIn: roundTo(mmToInches(input.depthMm), 2)
    },
    pixels: {
      width: input.pixelWidth,
      height: input.pixelHeight
    },
    weightKg: input.weightKg,
    weightLbs: roundTo(kgToLbs(input.weightKg), 2),
    connectors: {
      data: "EtherCON In/Out",
      power: "PowerCON True1 In/Out"
    },
    power: {
      min: input.minW,
      typ: input.typW,
      max: input.maxW,
      peak: input.peakW ?? roundTo(input.maxW * 1.15, 1)
    },
    peakFactor: input.peakW ? null : 1.15,
    recommendedPer20A120: input.rec20a120,
    recommendedPer20A208: input.rec20a208,
    recommendedPerSoca120: input.recSoca120,
    recommendedPerSoca208: input.recSoca208,
    recommendedPerL2130: input.recL2130,
    notes: "Default planning values; tune per content and ambient conditions.",
    unitWidth: Math.max(1, Math.round(input.widthMm / DEFAULT_BASE_UNIT_MM)),
    unitHeight: Math.max(1, Math.round(input.heightMm / DEFAULT_BASE_UNIT_MM))
  };
}

export const defaultCabinetVariants: CabinetVariant[] = [
  makeVariant({
    id: "absen-pl39-v2-500x500",
    familyId: "absen-pl39-v2",
    variantName: "500x500",
    widthMm: 500,
    heightMm: 500,
    depthMm: 86,
    pixelWidth: 128,
    pixelHeight: 128,
    weightKg: 8.8,
    minW: 55,
    typW: 110,
    maxW: 180,
    peakW: 210,
    rec20a120: 8,
    rec20a208: 13,
    recSoca120: 8,
    recSoca208: 13,
    recL2130: 16
  }),
  makeVariant({
    id: "absen-pl39-v2-500x1000",
    familyId: "absen-pl39-v2",
    variantName: "500x1000",
    widthMm: 500,
    heightMm: 1000,
    depthMm: 86,
    pixelWidth: 128,
    pixelHeight: 256,
    weightKg: 14.6,
    minW: 100,
    typW: 205,
    maxW: 340,
    peakW: 390,
    rec20a120: 4,
    rec20a208: 7,
    recSoca120: 4,
    recSoca208: 7,
    recL2130: 9
  })
];

export const defaultProcessors: ProcessorModel[] = [
  {
    id: "novastar-mx20",
    manufacturer: "Novastar",
    modelName: "MX20",
    ethernetPorts: 10,
    maxPixelsPerPortA8s: 650_000,
    maxPixelsPerPortA10s: 850_000,
    notes: "Standard touring processor"
  },
  {
    id: "novastar-mx30",
    manufacturer: "Novastar",
    modelName: "MX30",
    ethernetPorts: 16,
    maxPixelsPerPortA8s: 700_000,
    maxPixelsPerPortA10s: 900_000,
    notes: "Higher-capacity touring processor"
  },
  {
    id: "novastar-mx40",
    manufacturer: "Novastar",
    modelName: "MX40",
    ethernetPorts: 20,
    maxPixelsPerPortA8s: 750_000,
    maxPixelsPerPortA10s: 950_000,
    notes: "Large-format processor for IMAG/main walls"
  }
];

export const defaultReceivingCards: ReceivingCardModel[] = ["A8s", "A10s"];

export const defaultShows: ShowEvent[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    showName: "Demo Arena Show",
    showDate: "2026-02-12",
    venue: "Example Arena",
    notes: "Initial demo build",
    revision: "R1"
  }
];

export const defaultTheme: ThemeSettings = {
  brandName: "LED Wall Deployment Designer",
  primaryColor: "#20A4F3",
  accentColor: "#F05D23",
  backgroundColor: "#0A1018",
  surfaceColor: "#111C2B",
  textColor: "#F7FAFC",
  mutedTextColor: "#9FB1C6",
  fontFamily: "'Space Grotesk', 'Segoe UI', sans-serif",
  logoDataUrl: null
};

export function makeDefaultWall(showId: string): Wall {
  return {
    id: "",
    showId,
    name: "Main Wall",
    deploymentType: "FLOWN",
    voltageMode: 208,
    powerStrategy: "L21_30",
    rackLocation: "SL",
    baseUnitWidthMm: 500,
    baseUnitHeightMm: 500,
    widthUnits: 24,
    heightUnits: 12,
    planningThresholdPercent: 80,
    hardLimitPercent: 100,
    notes: ""
  };
}

export function makeDefaultCells(wallId: string): WallCell[] {
  return defaultCabinetVariants.slice(0, 1).map((variant, index) => ({
    id: `demo-cell-${index + 1}`,
    wallId,
    variantId: variant.id,
    label: `C${(index + 1).toString().padStart(3, "0")}`,
    unitX: index,
    unitY: 0,
    unitWidth: variant.unitWidth,
    unitHeight: variant.unitHeight,
    status: "active",
    notes: ""
  }));
}
