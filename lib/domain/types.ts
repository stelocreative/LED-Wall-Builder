export type RackLocation = "SL" | "SR" | "USC" | "FOH";

export type RiggingMode = "ground" | "flown";

export type ImagRole = "none" | "master" | "mirror";

export type ReceivingCardModel = "A8s" | "A10s";

export type PowerSourceType = "20A" | "SOCAPEX" | "L21-30";

export type VoltageType = 120 | 208;

export interface PowerProfile {
  min: number;
  typ: number;
  max: number;
  peak: number;
}

export interface PixelDimensions {
  width: number;
  height: number;
}

export interface ConnectorProfile {
  data: string;
  power: string;
}

export interface PanelVariant {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  unitWidth: number;
  unitHeight: number;
  power: PowerProfile;
  weightKg: number;
  pixels: PixelDimensions;
  connectors: ConnectorProfile;
}

export interface ProcessorModel {
  id: string;
  name: string;
  ethernetPorts: number;
  maxPixelsPerPort: Record<ReceivingCardModel, number>;
}

export interface CabinetPlacement {
  id: string;
  panelVariantId: string;
  x: number;
  y: number;
  unitWidth: number;
  unitHeight: number;
  label: string;
}

export interface Wall {
  id: string;
  name: string;
  widthMeters: number;
  heightMeters: number;
  widthUnits: number;
  heightUnits: number;
  voltage: VoltageType;
  rackLocation: RackLocation;
  riggingMode: RiggingMode;
  imagRole: ImagRole;
  imagMasterWallId?: string | null;
  mirroredPortOrder: boolean;
  mirroredCircuitMapping: boolean;
  cabinets: CabinetPlacement[];
}

export interface DataBlock {
  portIndex: number;
  rowStart: number;
  rowEnd: number;
  cabinetIds: string[];
  pixelLoad: number;
  loomBundle: number;
  portGroup: number;
  cableOrigin: "ground" | "air";
}

export interface DataPlanResult {
  processorId: string;
  receivingCard: ReceivingCardModel;
  rackLocation: RackLocation;
  riggingMode: RiggingMode;
  blockRows: number;
  totalPixels: number;
  blocks: DataBlock[];
  overload: boolean;
  notes: string[];
}

export interface CircuitLoad {
  circuitNumber: number;
  sourceType: PowerSourceType;
  phaseLabel: string;
  cabinetIds: string[];
  watts: PowerProfile;
  amps: PowerProfile;
  breakerAmps: number;
  deratedAmps: number;
  overLimit: boolean;
}

export interface PowerPlanResult {
  sourceType: PowerSourceType;
  voltage: VoltageType;
  circuits: CircuitLoad[];
  totalWatts: PowerProfile;
  totalAmps: PowerProfile;
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
