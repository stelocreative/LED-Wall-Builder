export type RackLocation = "SL" | "SR" | "USC" | "FOH";

export type DeploymentType = "GROUND_STACK" | "FLOWN";

export type VoltageMode = 120 | 208;

export type ReceivingCardModel = "A8s" | "A10s";

export type PowerStrategy = "EDISON_20A" | "L21_30" | "SOCAPEX" | "CAMLOCK_DISTRO";

export type CircuitGroupingMode = "BALANCED" | "MIN_HOME_RUNS" | "BY_SECTION";

export type DataPathMode = "SNAKE_ROWS" | "SNAKE_COLUMNS" | "CUSTOM";

export type WallCellStatus = "active" | "spare" | "void" | "cutout";

export interface PowerProfile {
  min: number;
  typ: number;
  max: number;
  peak: number;
}

export interface DimensionMm {
  widthMm: number;
  heightMm: number;
  depthMm: number;
}

export interface DimensionIn {
  widthIn: number;
  heightIn: number;
  depthIn: number;
}

export interface PixelDimensions {
  width: number;
  height: number;
}

export interface ConnectorProfile {
  data: string;
  power: string;
}

export interface PanelFamily {
  id: string;
  manufacturer: string;
  familyName: string;
  pixelPitchMm: number;
  notes: string;
  outdoorRating: string;
  serviceAccess: string;
  createdAt?: string;
}

export interface CabinetVariant {
  id: string;
  familyId: string;
  variantName: string;
  dimensionsMm: DimensionMm;
  dimensionsIn: DimensionIn;
  pixels: PixelDimensions;
  weightKg: number;
  weightLbs: number;
  connectors: ConnectorProfile;
  power: PowerProfile;
  peakFactor: number | null;
  recommendedPer20A120: number;
  recommendedPer20A208: number;
  recommendedPerSoca120: number;
  recommendedPerSoca208: number;
  recommendedPerL2130: number;
  notes: string;
  unitWidth: number;
  unitHeight: number;
  createdAt?: string;
}

export interface ProcessorModel {
  id: string;
  manufacturer: string;
  modelName: string;
  ethernetPorts: number;
  maxPixelsPerPortA8s: number;
  maxPixelsPerPortA10s: number;
  notes: string;
  createdAt?: string;
}

export interface ShowEvent {
  id: string;
  showName: string;
  showDate: string;
  venue: string;
  notes: string;
  revision: string;
  createdAt?: string;
}

export interface Wall {
  id: string;
  showId: string;
  name: string;
  deploymentType: DeploymentType;
  voltageMode: VoltageMode;
  powerStrategy: PowerStrategy;
  rackLocation: RackLocation;
  baseUnitWidthMm: number;
  baseUnitHeightMm: number;
  widthUnits: number;
  heightUnits: number;
  planningThresholdPercent: number;
  hardLimitPercent: number;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WallCell {
  id: string;
  wallId: string;
  variantId: string | null;
  label: string;
  unitX: number;
  unitY: number;
  unitWidth: number;
  unitHeight: number;
  status: WallCellStatus;
  notes: string;
}

export interface VariantRollup {
  variantId: string;
  familyName: string;
  variantName: string;
  count: number;
  weightKg: number;
  weightLbs: number;
  pixels: number;
  power: PowerProfile;
}

export interface WallTotals {
  widthMeters: number;
  heightMeters: number;
  widthFeet: number;
  heightFeet: number;
  widthFeetInchesLabel: string;
  heightFeetInchesLabel: string;
  totalCabinets: number;
  totalWeightKg: number;
  totalWeightLbs: number;
  wallResolution: PixelDimensions;
  totalPixels: number;
  totalPower: PowerProfile;
  totalCurrent: PowerProfile;
  variantBreakdown: VariantRollup[];
  mixedPitchWarning: string | null;
}

export interface DataRun {
  runNumber: number;
  processorPort: string;
  portIndex: number;
  cabinetIds: string[];
  cabinetCount: number;
  jumperCount: number;
  estimatedHomeRunMeters: number;
  estimatedHomeRunFeet: number;
  loomBundle: number;
  portGroup: number;
  cableOrigin: "ground" | "air";
  pixelLoad: number;
  overLimit: boolean;
}

export interface DataPlanResult {
  processorId: string;
  receivingCard: ReceivingCardModel;
  dataPathMode: DataPathMode;
  rackLocation: RackLocation;
  runs: DataRun[];
  totalPixels: number;
  warnings: string[];
}

export interface PowerCircuit {
  circuitNumber: number;
  label: string;
  phase: string;
  breakerAmps: number;
  planningAmps: number;
  hardLimitAmps: number;
  cabinetIds: string[];
  watts: PowerProfile;
  amps: PowerProfile;
  overPlanning: boolean;
  overHardLimit: boolean;
}

export interface PowerPlanResult {
  strategy: PowerStrategy;
  voltageMode: VoltageMode;
  groupingMode: CircuitGroupingMode;
  thresholdPlanningPercent: number;
  thresholdHardLimitPercent: number;
  circuits: PowerCircuit[];
  totalsWatts: PowerProfile;
  totalsAmps: PowerProfile;
  estimatedCircuitCount: number;
  socapexRunsRequired: number;
  socapexCircuitsUsed: number;
  warnings: string[];
}

export interface ThemeSettings {
  brandName: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  fontFamily: string;
  logoDataUrl?: string | null;
}

export interface WallBundle {
  wall: Wall;
  cells: WallCell[];
  show: ShowEvent;
}
