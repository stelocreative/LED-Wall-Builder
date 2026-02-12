import { DataPlanResult, PowerPlanResult } from "@/lib/domain/types";

export interface MirrorOptions {
  mirroredPortOrder: boolean;
  mirroredCircuitMapping: boolean;
}

export function buildMirroredDataPlan(masterPlan: DataPlanResult, options: MirrorOptions): DataPlanResult {
  if (!options.mirroredPortOrder) {
    return masterPlan;
  }

  const totalPorts = Math.max(...masterPlan.runs.map((run) => run.portIndex), 0) + 1;

  return {
    ...masterPlan,
    runs: masterPlan.runs.map((run) => ({
      ...run,
      portIndex: totalPorts - 1 - run.portIndex,
      processorPort: `Port ${totalPorts - run.portIndex}`
    }))
  };
}

export function buildMirroredPowerPlan(masterPlan: PowerPlanResult, options: MirrorOptions): PowerPlanResult {
  if (!options.mirroredCircuitMapping) {
    return masterPlan;
  }

  const total = masterPlan.circuits.length;

  return {
    ...masterPlan,
    circuits: masterPlan.circuits.map((circuit) => ({
      ...circuit,
      circuitNumber: total - circuit.circuitNumber + 1,
      label: `${circuit.label}-MIR`
    }))
  };
}
