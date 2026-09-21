import type { LoadItem } from "@/types/solar";

export interface LoadAuditResult {
  totalRunningPowerW: number;
  totalDailyEnergyWh: number;
  totalSurgePowerW: number;
  loads: AuditedLoad[];
}

export interface AuditedLoad {
  id: string;
  appliance: string;
  powerW: number;
  quantity: number;
  hoursPerDay: number;
  surgeW: number;
  runningPowerW: number;
  dailyEnergyWh: number;
  surgeContributionW: number;
  critical: boolean;
}

function validateLoad(load: LoadItem): void {
  if (!load.appliance.trim()) {
    throw new Error("Appliance name is required.");
  }

  if (!Number.isFinite(load.powerW) || load.powerW <= 0) {
    throw new Error(
      `Invalid power for "${load.appliance}". Power must be greater than 0 W.`
    );
  }

  if (
    !Number.isFinite(load.quantity) ||
    !Number.isInteger(load.quantity) ||
    load.quantity <= 0
  ) {
    throw new Error(
      `Invalid quantity for "${load.appliance}". Quantity must be a positive whole number.`
    );
  }

  if (
    !Number.isFinite(load.hoursPerDay) ||
    load.hoursPerDay < 0 ||
    load.hoursPerDay > 24
  ) {
    throw new Error(
      `Invalid operating hours for "${load.appliance}". Hours must be between 0 and 24.`
    );
  }

  if (
    load.surgeW !== undefined &&
    (!Number.isFinite(load.surgeW) || load.surgeW < 0)
  ) {
    throw new Error(
      `Invalid surge power for "${load.appliance}". Surge power cannot be negative.`
    );
  }
}

export function auditLoad(load: LoadItem): AuditedLoad {
  validateLoad(load);

  const runningPowerW = load.powerW * load.quantity;

  const dailyEnergyWh =
    runningPowerW * load.hoursPerDay;

  const surgeW = load.surgeW ?? load.powerW;

  const surgeContributionW =
    surgeW * load.quantity;

  return {
    id: load.id,
    appliance: load.appliance,
    powerW: load.powerW,
    quantity: load.quantity,
    hoursPerDay: load.hoursPerDay,
    surgeW,
    runningPowerW,
    dailyEnergyWh,
    surgeContributionW,
    critical: load.critical ?? false,
  };
}

export function calculateLoadAudit(
  loads: LoadItem[]
): LoadAuditResult {
  if (!Array.isArray(loads)) {
    throw new Error("Loads must be provided as an array.");
  }

  if (loads.length === 0) {
    throw new Error("At least one appliance is required.");
  }

  const auditedLoads = loads.map(auditLoad);

  const totalRunningPowerW = auditedLoads.reduce(
    (total, load) => total + load.runningPowerW,
    0
  );

  const totalDailyEnergyWh = auditedLoads.reduce(
    (total, load) => total + load.dailyEnergyWh,
    0
  );

  const totalSurgePowerW = auditedLoads.reduce(
    (total, load) => total + load.surgeContributionW,
    0
  );

  return {
    totalRunningPowerW,
    totalDailyEnergyWh,
    totalSurgePowerW,
    loads: auditedLoads,
  };
}