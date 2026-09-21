import type { BatterySpec } from "@/types/solar";
import type { EnergyCalculationResult } from "./energy";

export interface BatterySizingInput {
  energyCalculation: EnergyCalculationResult;
  batteryType: "lithium" | "tubular";
  systemVoltage: number;
  autonomyDays: number;
  batteryDoD: number;
  batteryEfficiency: number;
  selectedBattery?: BatterySpec;
}

export interface BatterySizingResult {
  batteryType: "lithium" | "tubular";

  designEnergyWh: number;
  autonomyDays: number;
  batteryDoD: number;
  batteryEfficiency: number;
  systemVoltage: number;

  requiredStoredEnergyWh: number;
  requiredStoredEnergyKWh: number;

  requiredCapacityAh?: number;
  requiredCapacityKWh?: number;

  selectedBattery?: BatterySpec;
  batteriesRequired?: number;

  seriesBatteries?: number;
  parallelStrings?: number;
  totalBatteryCount?: number;

  actualBankVoltage?: number;
  actualBankCapacityAh?: number;
  actualBankCapacityKWh?: number;
}

function validateInput(input: BatterySizingInput): void {
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
    !Number.isFinite(input.systemVoltage) ||
    input.systemVoltage <= 0
  ) {
    throw new Error(
      "System voltage must be greater than 0 V."
    );
  }

  if (
    !Number.isFinite(input.autonomyDays) ||
    input.autonomyDays <= 0
  ) {
    throw new Error(
      "Autonomy must be greater than 0 days."
    );
  }

  if (
    !Number.isFinite(input.batteryDoD) ||
    input.batteryDoD <= 0 ||
    input.batteryDoD > 1
  ) {
    throw new Error(
      "Battery DoD must be greater than 0 and no greater than 1."
    );
  }

  if (
    !Number.isFinite(input.batteryEfficiency) ||
    input.batteryEfficiency <= 0 ||
    input.batteryEfficiency > 1
  ) {
    throw new Error(
      "Battery efficiency must be greater than 0 and no greater than 1."
    );
  }

  if (
    input.batteryType !== "lithium" &&
    input.batteryType !== "tubular"
  ) {
    throw new Error("Unsupported battery type.");
  }

  if (input.selectedBattery) {
    if (
      !Number.isFinite(input.selectedBattery.voltage) ||
      input.selectedBattery.voltage <= 0
    ) {
      throw new Error(
        "Selected battery voltage must be greater than 0 V."
      );
    }

    if (
      input.selectedBattery.type !== input.batteryType
    ) {
      throw new Error(
        "Selected battery type does not match the requested battery type."
      );
    }

    if (input.batteryType === "tubular") {
      if (
        !Number.isFinite(input.selectedBattery.capacityAh) ||
        (input.selectedBattery.capacityAh ?? 0) <= 0
      ) {
        throw new Error(
          "Tubular battery must have a valid Ah capacity."
        );
      }
    }

    if (input.batteryType === "lithium") {
      if (
        !Number.isFinite(input.selectedBattery.capacityKWh) ||
        (input.selectedBattery.capacityKWh ?? 0) <= 0
      ) {
        throw new Error(
          "Lithium battery must have a valid kWh capacity."
        );
      }
    }
  }
}

export function calculateBatterySizing(
  input: BatterySizingInput
): BatterySizingResult {
  validateInput(input);

  const designEnergyWh =
    input.energyCalculation.designEnergyWh;

  /*
   * Energy that must be stored in the battery bank.
   *
   * Required stored energy =
   * Design Energy × Autonomy
   * -------------------------
   * DoD × Battery Efficiency
   */
  const requiredStoredEnergyWh =
    (designEnergyWh * input.autonomyDays) /
    (input.batteryDoD * input.batteryEfficiency);

  const requiredStoredEnergyKWh =
    requiredStoredEnergyWh / 1000;

  const baseResult: BatterySizingResult = {
    batteryType: input.batteryType,
    designEnergyWh,
    autonomyDays: input.autonomyDays,
    batteryDoD: input.batteryDoD,
    batteryEfficiency: input.batteryEfficiency,
    systemVoltage: input.systemVoltage,
    requiredStoredEnergyWh,
    requiredStoredEnergyKWh,
  };

  /*
   * If no commercial battery has been selected yet,
   * return the required bank capacity only.
   */
  if (!input.selectedBattery) {
    if (input.batteryType === "tubular") {
      return {
        ...baseResult,
        requiredCapacityAh:
          requiredStoredEnergyWh /
          input.systemVoltage,
      };
    }

    return {
      ...baseResult,
      requiredCapacityKWh:
        requiredStoredEnergyKWh,
    };
  }

  const batteryVoltage =
    input.selectedBattery.voltage;

  /*
   * The battery-bank voltage must be an exact multiple
   * of the selected battery voltage.
   *
   * Example:
   * 24 V battery → 48 V bank = 2 batteries in series.
   */
  const seriesBatteries =
    input.systemVoltage / batteryVoltage;

  if (
    !Number.isInteger(seriesBatteries) ||
    seriesBatteries < 1
  ) {
    throw new Error(
      `System voltage ${input.systemVoltage} V cannot be formed using ${batteryVoltage} V batteries.`
    );
  }

  if (input.batteryType === "tubular") {
    const capacityAh =
      input.selectedBattery.capacityAh!;

    const requiredCapacityAh =
      requiredStoredEnergyWh /
      input.systemVoltage;

    const parallelStrings = Math.ceil(
      requiredCapacityAh / capacityAh
    );

    const totalBatteryCount =
      seriesBatteries * parallelStrings;

    const actualBankCapacityAh =
      capacityAh * parallelStrings;

    return {
      ...baseResult,
      requiredCapacityAh,
      selectedBattery: input.selectedBattery,
      batteriesRequired: totalBatteryCount,
      seriesBatteries,
      parallelStrings,
      totalBatteryCount,
      actualBankVoltage:
        batteryVoltage * seriesBatteries,
      actualBankCapacityAh,
    };
  }

  const capacityKWh =
    input.selectedBattery.capacityKWh!;

  /*
   * Each parallel string contains the selected battery
   * capacity multiplied by the number of batteries in series.
   */
  const capacityPerSeriesStringKWh =
    capacityKWh * seriesBatteries;

  const parallelStrings = Math.ceil(
    requiredStoredEnergyKWh /
      capacityPerSeriesStringKWh
  );

  const totalBatteryCount =
    seriesBatteries * parallelStrings;

  const actualBankCapacityKWh =
    capacityPerSeriesStringKWh *
    parallelStrings;

  return {
    ...baseResult,
    requiredCapacityKWh:
      requiredStoredEnergyKWh,
    selectedBattery: input.selectedBattery,
    batteriesRequired: totalBatteryCount,
    seriesBatteries,
    parallelStrings,
    totalBatteryCount,
    actualBankVoltage:
      batteryVoltage * seriesBatteries,
    actualBankCapacityKWh,
  };
}