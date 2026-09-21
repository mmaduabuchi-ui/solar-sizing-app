import { describe, expect, it } from "vitest";
import { calculatePVSizing } from "./pvSizing";
import type { EnergyCalculationResult } from "./energy";

describe("PV Sizing", () => {
  const energyCalculation: EnergyCalculationResult = {
    dailyLoadEnergyWh: 5280,
    systemLossEnergyWh: 0,
    designEnergyWh: 5280,
    designEnergyKWh: 5.28,
    peakSunHours: 4,
    performanceRatio: 0.65,
    systemLossFactor: 0,
    requiredPVPowerW: 2030.7692,
    requiredPVPowerKW: 2.0307692,
  };

  it("calculates required PV power correctly", () => {
    const result = calculatePVSizing({
      energyCalculation,
    });

    expect(result.requiredPVPowerW).toBeCloseTo(
      2030.7692,
      3
    );
  });

  it("converts required PV power to kW correctly", () => {
    const result = calculatePVSizing({
      energyCalculation,
    });

    expect(result.requiredPVPowerKW).toBeCloseTo(
      2.0307692,
      4
    );
  });

  it("uses peak sun hours and performance ratio correctly", () => {
    const result = calculatePVSizing({
      energyCalculation: {
        ...energyCalculation,
        designEnergyWh: 6864,
        peakSunHours: 4,
        performanceRatio: 0.65,
      },
    });

    expect(result.requiredPVPowerW).toBeCloseTo(
      2640,
      3
    );
  });

  it("does not perform the calculation in the wrong order", () => {
    const result = calculatePVSizing({
      energyCalculation,
    });

    /*
     * Correct:
     * 5280 / (4 × 0.65)
     *
     * Incorrect:
     * (5280 / 4) × 0.65
     */
    expect(result.requiredPVPowerW).not.toBeCloseTo(
      858,
      0
    );
  });

  it("rejects zero design energy", () => {
    expect(() =>
      calculatePVSizing({
        energyCalculation: {
          ...energyCalculation,
          designEnergyWh: 0,
        },
      })
    ).toThrow();
  });

  it("rejects zero peak sun hours", () => {
    expect(() =>
      calculatePVSizing({
        energyCalculation: {
          ...energyCalculation,
          peakSunHours: 0,
        },
      })
    ).toThrow();
  });

  it("rejects an invalid performance ratio", () => {
    expect(() =>
      calculatePVSizing({
        energyCalculation: {
          ...energyCalculation,
          performanceRatio: 1.1,
        },
      })
    ).toThrow();
  });
});