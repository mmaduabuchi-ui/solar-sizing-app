import { describe, expect, it } from "vitest";
import { calculateBatterySizing } from "./battery";
import type { EnergyCalculationResult } from "./energy";
import type { BatterySpec } from "@/types/solar";

describe("Battery Sizing", () => {
  const energyCalculation: EnergyCalculationResult = {
    dailyLoadEnergyWh: 5280,
    systemLossEnergyWh: 1584,
    designEnergyWh: 6864,
    designEnergyKWh: 6.864,
    peakSunHours: 4,
    performanceRatio: 0.65,
    systemLossFactor: 0.3,
    requiredPVPowerW: 2640,
    requiredPVPowerKW: 2.64,
  };

  it("calculates required stored energy for one day autonomy", () => {
    const result = calculateBatterySizing({
      energyCalculation,
      batteryType: "tubular",
      systemVoltage: 24,
      autonomyDays: 1,
      batteryDoD: 0.8,
      batteryEfficiency: 0.8,
    });

    expect(result.requiredStoredEnergyWh).toBeCloseTo(
      10725,
      3
    );

    expect(result.requiredStoredEnergyKWh).toBeCloseTo(
      10.725,
      3
    );
  });

  it("calculates tubular battery Ah requirement correctly", () => {
    const result = calculateBatterySizing({
      energyCalculation,
      batteryType: "tubular",
      systemVoltage: 24,
      autonomyDays: 1,
      batteryDoD: 0.8,
      batteryEfficiency: 0.8,
    });

    expect(result.requiredCapacityAh).toBeCloseTo(
      446.875,
      3
    );
  });

  it("calculates lithium battery kWh requirement correctly", () => {
    const result = calculateBatterySizing({
      energyCalculation,
      batteryType: "lithium",
      systemVoltage: 24,
      autonomyDays: 1,
      batteryDoD: 0.8,
      batteryEfficiency: 0.8,
    });

    expect(result.requiredCapacityKWh).toBeCloseTo(
      10.725,
      3
    );
  });

  it("calculates tubular battery bank configuration", () => {
    const battery: BatterySpec = {
      brand: "Example",
      model: "12V 220Ah",
      type: "tubular",
      voltage: 12,
      capacityAh: 220,
    };

    const result = calculateBatterySizing({
      energyCalculation,
      batteryType: "tubular",
      systemVoltage: 24,
      autonomyDays: 1,
      batteryDoD: 0.8,
      batteryEfficiency: 0.8,
      selectedBattery: battery,
    });

    expect(result.seriesBatteries).toBe(2);
    expect(result.parallelStrings).toBe(3);
    expect(result.totalBatteryCount).toBe(6);
    expect(result.actualBankVoltage).toBe(24);
    expect(result.actualBankCapacityAh).toBe(660);
  });

  it("calculates lithium battery bank configuration", () => {
    const battery: BatterySpec = {
      brand: "Example",
      model: "24V 5kWh",
      type: "lithium",
      voltage: 24,
      capacityKWh: 5,
    };

    const result = calculateBatterySizing({
      energyCalculation,
      batteryType: "lithium",
      systemVoltage: 24,
      autonomyDays: 1,
      batteryDoD: 0.8,
      batteryEfficiency: 0.8,
      selectedBattery: battery,
    });

    expect(result.seriesBatteries).toBe(1);
    expect(result.parallelStrings).toBe(3);
    expect(result.totalBatteryCount).toBe(3);
    expect(result.actualBankVoltage).toBe(24);
    expect(result.actualBankCapacityKWh).toBe(15);
  });

  it("supports two 12V batteries in series for a 24V bank", () => {
    const battery: BatterySpec = {
      brand: "Example",
      model: "12V 220Ah",
      type: "tubular",
      voltage: 12,
      capacityAh: 220,
    };

    const result = calculateBatterySizing({
      energyCalculation,
      batteryType: "tubular",
      systemVoltage: 24,
      autonomyDays: 1,
      batteryDoD: 0.8,
      batteryEfficiency: 0.8,
      selectedBattery: battery,
    });

    expect(result.seriesBatteries).toBe(2);
  });

  it("rejects a battery voltage that cannot form the system voltage", () => {
    const battery: BatterySpec = {
      brand: "Example",
      model: "12V 220Ah",
      type: "tubular",
      voltage: 12,
      capacityAh: 220,
    };

    expect(() =>
      calculateBatterySizing({
        energyCalculation,
        batteryType: "tubular",
        systemVoltage: 230,
        autonomyDays: 1,
        batteryDoD: 0.8,
        batteryEfficiency: 0.8,
        selectedBattery: battery,
      })
    ).toThrow();
  });

  it("rejects a mismatched battery type", () => {
    const battery: BatterySpec = {
      brand: "Example",
      model: "24V 5kWh",
      type: "lithium",
      voltage: 24,
      capacityKWh: 5,
    };

    expect(() =>
      calculateBatterySizing({
        energyCalculation,
        batteryType: "tubular",
        systemVoltage: 24,
        autonomyDays: 1,
        batteryDoD: 0.8,
        batteryEfficiency: 0.8,
        selectedBattery: battery,
      })
    ).toThrow();
  });

  it("rejects invalid depth of discharge", () => {
    expect(() =>
      calculateBatterySizing({
        energyCalculation,
        batteryType: "lithium",
        systemVoltage: 24,
        autonomyDays: 1,
        batteryDoD: 0,
        batteryEfficiency: 0.8,
      })
    ).toThrow();
  });

  it("rejects invalid autonomy", () => {
    expect(() =>
      calculateBatterySizing({
        energyCalculation,
        batteryType: "lithium",
        systemVoltage: 24,
        autonomyDays: 0,
        batteryDoD: 0.8,
        batteryEfficiency: 0.8,
      })
    ).toThrow();
  });

  it("rejects a tubular battery without Ah capacity", () => {
    const battery: BatterySpec = {
      brand: "Example",
      model: "12V Battery",
      type: "tubular",
      voltage: 12,
    };

    expect(() =>
      calculateBatterySizing({
        energyCalculation,
        batteryType: "tubular",
        systemVoltage: 24,
        autonomyDays: 1,
        batteryDoD: 0.8,
        batteryEfficiency: 0.8,
        selectedBattery: battery,
      })
    ).toThrow();
  });

  it("rejects a lithium battery without kWh capacity", () => {
    const battery: BatterySpec = {
      brand: "Example",
      model: "24V Battery",
      type: "lithium",
      voltage: 24,
    };

    expect(() =>
      calculateBatterySizing({
        energyCalculation,
        batteryType: "lithium",
        systemVoltage: 24,
        autonomyDays: 1,
        batteryDoD: 0.8,
        batteryEfficiency: 0.8,
        selectedBattery: battery,
      })
    ).toThrow();
  });
});