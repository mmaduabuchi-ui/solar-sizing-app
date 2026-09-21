import type { LoadAuditResult } from "./loadAudit";

export interface EnergyCalculationInput {
  loadAudit: LoadAuditResult;
  systemLossFactor: number;
  peakSunHours: number;
  performanceRatio: number;
}

export interface EnergyCalculationResult {
  dailyLoadEnergyWh: number;
  systemLossEnergyWh: number;
  designEnergyWh: number;
  designEnergyKWh: number;
  peakSunHours: number;
  performanceRatio: number;
  systemLossFactor: number;
  requiredPVPowerW: number;
  requiredPVPowerKW: number;
}

function validateInput(input: EnergyCalculationInput): void {
  if (!input.loadAudit) {
    throw new Error("Load audit result is required.");
  }

  if (
    !Number.isFinite(input.loadAudit.totalDailyEnergyWh) ||
    input.loadAudit.totalDailyEnergyWh <= 0
  ) {
    throw new Error(
      "Daily load energy must be greater than 0 Wh."
    );
  }

  if (
    !Number.isFinite(input.systemLossFactor) ||
    input.systemLossFactor < 0 ||
    input.systemLossFactor >= 1
  ) {
    throw new Error(
      "System loss factor must be between 0 and 1, excluding 1."
    );
  }

  if (
    !Number.isFinite(input.peakSunHours) ||
    input.peakSunHours <= 0
  ) {
    throw new Error(
      "Peak sun hours must be greater than 0."
    );
  }

  if (
    !Number.isFinite(input.performanceRatio) ||
    input.performanceRatio <= 0 ||
    input.performanceRatio > 1
  ) {
    throw new Error(
      "Performance ratio must be greater than 0 and no greater than 1."
    );
  }
}

export function calculateEnergy(
  input: EnergyCalculationInput
): EnergyCalculationResult {
  validateInput(input);

  const dailyLoadEnergyWh =
    input.loadAudit.totalDailyEnergyWh;

  const systemLossEnergyWh =
    dailyLoadEnergyWh * input.systemLossFactor;

  const designEnergyWh =
    dailyLoadEnergyWh + systemLossEnergyWh;

  const designEnergyKWh =
    designEnergyWh / 1000;

  const requiredPVPowerW =
    designEnergyWh /
    (input.peakSunHours * input.performanceRatio);

  const requiredPVPowerKW =
    requiredPVPowerW / 1000;

  return {
    dailyLoadEnergyWh,
    systemLossEnergyWh,
    designEnergyWh,
    designEnergyKWh,
    peakSunHours: input.peakSunHours,
    performanceRatio: input.performanceRatio,
    systemLossFactor: input.systemLossFactor,
    requiredPVPowerW,
    requiredPVPowerKW,
  };
}