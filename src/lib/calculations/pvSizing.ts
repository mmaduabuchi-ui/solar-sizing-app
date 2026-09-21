import type { EnergyCalculationResult } from "./energy";

export interface PVSizingInput {
  energyCalculation: EnergyCalculationResult;
}

export interface PVSizingResult {
  designEnergyWh: number;
  peakSunHours: number;
  performanceRatio: number;
  requiredPVPowerW: number;
  requiredPVPowerKW: number;
}

function validateInput(input: PVSizingInput): void {
  if (!input.energyCalculation) {
    throw new Error("Energy calculation result is required.");
  }

  if (
    !Number.isFinite(input.energyCalculation.designEnergyWh) ||
    input.energyCalculation.designEnergyWh <= 0
  ) {
    throw new Error(
      "Design energy must be greater than 0 Wh."
    );
  }

  if (
    !Number.isFinite(input.energyCalculation.peakSunHours) ||
    input.energyCalculation.peakSunHours <= 0
  ) {
    throw new Error(
      "Peak sun hours must be greater than 0."
    );
  }

  if (
    !Number.isFinite(input.energyCalculation.performanceRatio) ||
    input.energyCalculation.performanceRatio <= 0 ||
    input.energyCalculation.performanceRatio > 1
  ) {
    throw new Error(
      "Performance ratio must be greater than 0 and no greater than 1."
    );
  }
}

export function calculatePVSizing(
  input: PVSizingInput
): PVSizingResult {
  validateInput(input);

  const {
    designEnergyWh,
    peakSunHours,
    performanceRatio,
  } = input.energyCalculation;

  /*
   * Required PV Power:
   *
   * PV Power (W) =
   * Design Energy (Wh/day)
   * --------------------------------
   * Peak Sun Hours × Performance Ratio
   *
   * PSH and PR are multiplied together before
   * dividing the required daily energy.
   */
  const requiredPVPowerW =
    designEnergyWh /
    (peakSunHours * performanceRatio);

  const requiredPVPowerKW =
    requiredPVPowerW / 1000;

  return {
    designEnergyWh,
    peakSunHours,
    performanceRatio,
    requiredPVPowerW,
    requiredPVPowerKW,
  };
}