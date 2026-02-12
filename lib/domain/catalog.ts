import { PanelVariant, ProcessorModel, ReceivingCardModel, ThemeSettings } from "@/lib/domain/types";

export const BASE_UNIT_MM = 500;

export const defaultPanelVariants: PanelVariant[] = [
  {
    id: "P500x500",
    name: "500x500 Cabinet",
    widthMm: 500,
    heightMm: 500,
    unitWidth: 1,
    unitHeight: 1,
    power: { min: 55, typ: 95, max: 130, peak: 160 },
    weightKg: 8.2,
    pixels: { width: 192, height: 192 },
    connectors: { data: "Ethercon In/Out", power: "PowerCON True1" }
  },
  {
    id: "P500x1000",
    name: "500x1000 Cabinet",
    widthMm: 500,
    heightMm: 1000,
    unitWidth: 1,
    unitHeight: 2,
    power: { min: 95, typ: 180, max: 250, peak: 320 },
    weightKg: 13.9,
    pixels: { width: 192, height: 384 },
    connectors: { data: "Ethercon In/Out", power: "PowerCON True1" }
  }
];

export const defaultReceivingCards: ReceivingCardModel[] = ["A8s", "A10s"];

export const defaultProcessors: ProcessorModel[] = [
  {
    id: "MX20",
    name: "Novastar MX20",
    ethernetPorts: 10,
    maxPixelsPerPort: {
      A8s: 650_000,
      A10s: 850_000
    }
  },
  {
    id: "MX30",
    name: "Novastar MX30",
    ethernetPorts: 16,
    maxPixelsPerPort: {
      A8s: 700_000,
      A10s: 900_000
    }
  },
  {
    id: "MX40",
    name: "Novastar MX40",
    ethernetPorts: 20,
    maxPixelsPerPort: {
      A8s: 750_000,
      A10s: 950_000
    }
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
