import {
  CabinetVariant,
  CircuitGroupingMode,
  PowerCircuit,
  PowerPlanResult,
  PowerProfile,
  PowerStrategy,
  VoltageMode,
  Wall,
  WallCell
} from "@/lib/domain/types";

export interface PowerPlanInput {
  wall: Wall;
  cells: WallCell[];
  variantsById: Record<string, CabinetVariant>;
  strategy: PowerStrategy;
  voltageMode: VoltageMode;
  groupingMode: CircuitGroupingMode;
  planningThresholdPercent: number;
  hardLimitPercent: number;
}

interface StrategySpec {
  breakerAmps: number;
  phases: string[];
}

const STRATEGY_SPECS: Record<PowerStrategy, StrategySpec> = {
  EDISON_20A: {
    breakerAmps: 20,
    phases: ["A"]
  },
  SOCAPEX: {
    breakerAmps: 20,
    phases: ["A", "B", "C", "A", "B", "C"]
  },
  L21_30: {
    breakerAmps: 30,
    phases: ["A", "B", "C"]
  },
  CAMLOCK_DISTRO: {
    breakerAmps: 20,
    phases: ["A", "B", "C"]
  }
};

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

function wattsToAmps(power: PowerProfile, voltage: VoltageMode): PowerProfile {
  return {
    min: power.min / voltage,
    typ: power.typ / voltage,
    max: power.max / voltage,
    peak: power.peak / voltage
  };
}

function recommendedCountByStrategy(
  variant: CabinetVariant,
  strategy: PowerStrategy,
  voltageMode: VoltageMode
): number {
  if (strategy === "SOCAPEX") {
    return voltageMode === 120 ? variant.recommendedPerSoca120 : variant.recommendedPerSoca208;
  }
  if (strategy === "L21_30") {
    return variant.recommendedPerL2130;
  }
  return voltageMode === 120 ? variant.recommendedPer20A120 : variant.recommendedPer20A208;
}

function sortCellsByGrouping(cells: WallCell[], groupingMode: CircuitGroupingMode): WallCell[] {
  if (groupingMode === "BY_SECTION") {
    return [...cells].sort((a, b) => {
      const sectionA = Math.floor(a.unitX / 4);
      const sectionB = Math.floor(b.unitX / 4);
      if (sectionA !== sectionB) {
        return sectionA - sectionB;
      }
      if (a.unitY !== b.unitY) {
        return a.unitY - b.unitY;
      }
      return a.unitX - b.unitX;
    });
  }

  if (groupingMode === "BALANCED") {
    return [...cells].sort((a, b) => a.label.localeCompare(b.label));
  }

  return [...cells].sort((a, b) => {
    if (a.unitY !== b.unitY) {
      return a.unitY - b.unitY;
    }
    return a.unitX - b.unitX;
  });
}

function buildCircuitLabel(strategy: PowerStrategy, index: number): string {
  const prefix =
    strategy === "SOCAPEX"
      ? "SOC"
      : strategy === "L21_30"
        ? "L21"
        : strategy === "CAMLOCK_DISTRO"
          ? "CAM"
          : "EDI";
  return `${prefix}-${String(index + 1).padStart(2, "0")}`;
}

export function buildPowerPlan(input: PowerPlanInput): PowerPlanResult {
  const spec = STRATEGY_SPECS[input.strategy];
  const planningThreshold = Math.max(40, Math.min(95, input.planningThresholdPercent));
  const hardLimitThreshold = Math.max(planningThreshold, Math.min(120, input.hardLimitPercent));

  const activeCells = sortCellsByGrouping(
    input.cells.filter((cell) => cell.status === "active" && cell.variantId),
    input.groupingMode
  );

  const planningAmps = (spec.breakerAmps * planningThreshold) / 100;
  const hardLimitAmps = (spec.breakerAmps * hardLimitThreshold) / 100;

  const circuits: Array<{
    cabinetIds: string[];
    watts: PowerProfile;
    typAmps: number;
    cabinetCount: number;
    recommendedCount: number;
  }> = [];

  function createCircuit(targetRecommended = 999): {
    cabinetIds: string[];
    watts: PowerProfile;
    typAmps: number;
    cabinetCount: number;
    recommendedCount: number;
  } {
    return {
      cabinetIds: [],
      watts: emptyPowerProfile(),
      typAmps: 0,
      cabinetCount: 0,
      recommendedCount: targetRecommended
    };
  }

  if (activeCells.length > 0) {
    circuits.push(createCircuit());
  }

  for (const cell of activeCells) {
    if (!cell.variantId) {
      continue;
    }

    const variant = input.variantsById[cell.variantId];
    if (!variant) {
      continue;
    }

    const variantTypAmps = variant.power.typ / input.voltageMode;
    const recommendedCount = Math.max(1, recommendedCountByStrategy(variant, input.strategy, input.voltageMode));

    let chosenIndex = circuits.length - 1;

    if (input.groupingMode === "BALANCED") {
      let bestIndex = -1;
      let bestAmps = Number.MAX_VALUE;
      for (let i = 0; i < circuits.length; i += 1) {
        const circuit = circuits[i];
        const nextAmps = circuit.typAmps + variantTypAmps;
        const nextCount = circuit.cabinetCount + 1;
        if (nextAmps <= planningAmps && nextCount <= circuit.recommendedCount && circuit.typAmps < bestAmps) {
          bestIndex = i;
          bestAmps = circuit.typAmps;
        }
      }

      if (bestIndex >= 0) {
        chosenIndex = bestIndex;
      } else {
        circuits.push(createCircuit(recommendedCount));
        chosenIndex = circuits.length - 1;
      }
    } else {
      const last = circuits[circuits.length - 1];
      const nextAmps = last.typAmps + variantTypAmps;
      const nextCount = last.cabinetCount + 1;
      if (nextAmps > planningAmps || nextCount > Math.min(last.recommendedCount, recommendedCount)) {
        circuits.push(createCircuit(recommendedCount));
        chosenIndex = circuits.length - 1;
      }
    }

    const target = circuits[chosenIndex];
    target.cabinetIds.push(cell.id);
    target.watts = addPower(target.watts, variant.power);
    target.typAmps += variantTypAmps;
    target.cabinetCount += 1;
    target.recommendedCount = Math.min(target.recommendedCount, recommendedCount);
  }

  const detailedCircuits: PowerCircuit[] = circuits.map((circuit, index) => {
    const amps = wattsToAmps(circuit.watts, input.voltageMode);
    const phase = spec.phases[index % spec.phases.length] ?? "A";

    return {
      circuitNumber: index + 1,
      label: buildCircuitLabel(input.strategy, index),
      phase,
      breakerAmps: spec.breakerAmps,
      planningAmps,
      hardLimitAmps,
      cabinetIds: circuit.cabinetIds,
      watts: circuit.watts,
      amps,
      overPlanning: amps.typ > planningAmps,
      overHardLimit: amps.max > hardLimitAmps
    };
  });

  const totalsWatts = detailedCircuits.reduce((sum, circuit) => addPower(sum, circuit.watts), emptyPowerProfile());
  const totalsAmps = wattsToAmps(totalsWatts, input.voltageMode);

  const warnings: string[] = [];
  if (detailedCircuits.some((circuit) => circuit.overPlanning)) {
    warnings.push("One or more circuits exceed planning threshold.");
  }
  if (detailedCircuits.some((circuit) => circuit.overHardLimit)) {
    warnings.push("One or more circuits exceed hard amp limit.");
  }

  const estimatedCircuitCount = Math.max(1, Math.ceil(totalsAmps.typ / planningAmps));
  const socapexRunsRequired = input.strategy === "SOCAPEX" ? Math.ceil(detailedCircuits.length / 6) : 0;
  const socapexCircuitsUsed = input.strategy === "SOCAPEX" ? detailedCircuits.length : 0;

  return {
    strategy: input.strategy,
    voltageMode: input.voltageMode,
    groupingMode: input.groupingMode,
    thresholdPlanningPercent: planningThreshold,
    thresholdHardLimitPercent: hardLimitThreshold,
    circuits: detailedCircuits,
    totalsWatts,
    totalsAmps,
    estimatedCircuitCount,
    socapexRunsRequired,
    socapexCircuitsUsed,
    warnings
  };
}
