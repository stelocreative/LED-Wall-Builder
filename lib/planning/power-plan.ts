import { CircuitLoad, PanelVariant, PowerPlanResult, PowerProfile, PowerSourceType, VoltageType, Wall } from "@/lib/domain/types";

export interface PowerPlanInput {
  wall: Wall;
  panelMap: Record<string, PanelVariant>;
  sourceType: PowerSourceType;
  voltage: VoltageType;
}

interface SourceSpec {
  circuits: number;
  breakerAmps: number;
  phaseLabels: string[];
}

const sourceSpecs: Record<PowerSourceType, SourceSpec> = {
  "20A": {
    circuits: 1,
    breakerAmps: 20,
    phaseLabels: ["A"]
  },
  SOCAPEX: {
    circuits: 6,
    breakerAmps: 20,
    phaseLabels: ["A", "B", "C", "A", "B", "C"]
  },
  "L21-30": {
    circuits: 3,
    breakerAmps: 30,
    phaseLabels: ["A", "B", "C"]
  }
};

function emptyProfile(): PowerProfile {
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

function wattsToAmps(power: PowerProfile, voltage: VoltageType): PowerProfile {
  return {
    min: power.min / voltage,
    typ: power.typ / voltage,
    max: power.max / voltage,
    peak: power.peak / voltage
  };
}

export function buildPowerPlan(input: PowerPlanInput): PowerPlanResult {
  const { wall, panelMap, sourceType, voltage } = input;
  const source = sourceSpecs[sourceType];

  const buckets = Array.from({ length: source.circuits }, () => ({
    cabinetIds: [] as string[],
    watts: emptyProfile()
  }));

  wall.cabinets.forEach((cabinet, index) => {
    const panel = panelMap[cabinet.panelVariantId];
    if (!panel) {
      return;
    }

    const bucketIndex = index % source.circuits;
    buckets[bucketIndex].cabinetIds.push(cabinet.id);
    buckets[bucketIndex].watts = addPower(buckets[bucketIndex].watts, panel.power);
  });

  const circuits: CircuitLoad[] = buckets.map((bucket, index) => {
    const amps = wattsToAmps(bucket.watts, voltage);
    const deratedAmps = source.breakerAmps * 0.8;

    return {
      circuitNumber: index + 1,
      sourceType,
      phaseLabel: source.phaseLabels[index] ?? "A",
      cabinetIds: bucket.cabinetIds,
      watts: bucket.watts,
      amps,
      breakerAmps: source.breakerAmps,
      deratedAmps,
      overLimit: amps.typ > deratedAmps || amps.max > source.breakerAmps
    };
  });

  const totalWatts = circuits.reduce((sum, circuit) => addPower(sum, circuit.watts), emptyProfile());
  const totalAmps = wattsToAmps(totalWatts, voltage);

  return {
    sourceType,
    voltage,
    circuits,
    totalWatts,
    totalAmps
  };
}
