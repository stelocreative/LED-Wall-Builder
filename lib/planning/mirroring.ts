import { DataPlanResult, PowerPlanResult } from "@/lib/domain/types";

export interface MirrorOptions {
  mirroredPortOrder: boolean;
  mirroredCircuitMapping: boolean;
}

export function mirrorPortIndex(portIndex: number, totalPorts: number, mirroredPortOrder: boolean): number {
  if (!mirroredPortOrder) {
    return portIndex;
  }
  return totalPorts - 1 - portIndex;
}

export function mirrorCircuitIndex(
  circuitIndex: number,
  totalCircuits: number,
  mirroredCircuitMapping: boolean
): number {
  if (!mirroredCircuitMapping) {
    return circuitIndex;
  }
  return totalCircuits - circuitIndex - 1;
}

export function buildMirroredDataPlan(masterPlan: DataPlanResult, options: MirrorOptions): DataPlanResult {
  const maxPort = Math.max(...masterPlan.blocks.map((block) => block.portIndex), 0) + 1;

  return {
    ...masterPlan,
    notes: [...masterPlan.notes, "Mirrored from IMAG master plan"],
    blocks: masterPlan.blocks.map((block) => ({
      ...block,
      portIndex: mirrorPortIndex(block.portIndex, maxPort, options.mirroredPortOrder)
    }))
  };
}

export function buildMirroredPowerPlan(masterPlan: PowerPlanResult, options: MirrorOptions): PowerPlanResult {
  const totalCircuits = masterPlan.circuits.length;

  const circuits = masterPlan.circuits.map((circuit, idx) => {
    const mapped = mirrorCircuitIndex(idx, totalCircuits, options.mirroredCircuitMapping);
    return {
      ...circuit,
      circuitNumber: mapped + 1,
      phaseLabel: masterPlan.circuits[mapped]?.phaseLabel ?? circuit.phaseLabel
    };
  });

  return {
    ...masterPlan,
    circuits
  };
}
