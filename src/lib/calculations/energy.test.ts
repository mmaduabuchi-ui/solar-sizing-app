import { describe, expect, it } from "vitest";
import { calculateEnergy } from "./energy";
import type { LoadAuditResult } from "./loadAudit";

describe("Energy Calculation", () => {
  const loadAudit: LoadAuditResult = {
    totalRunningPowerW: 220,
    totalDailyEnergyWh: 5280,
    totalSurgePowerW: 220,
    loads: [],
  };

  it("calculates design energy with 30% system losses", () => {
    const result = calculateEnergy({
      loadAudit,
      systemLossFactor: 0.3,
      peakSunHours: 4,
      performanceRatio: 0.65,
    });

    expect(result.dailyLoadEnergyWh).toBe(5280);
    expect(result.systemLossEnergyWh).toBe(1584);
    expect(result.designEnergyWh).toBe(6864);
    expect(result.designEnergyKWh).toBe(6.864);
  });

  it("calculates required PV power correctly", () => {
    const result = calculateEnergy({
      loadAudit,
      systemLossFactor: 0,
      peakSunHours: 4,
      performanceRatio: 0.65,
    });

    expect(result.requiredPVPowerW).toBeCloseTo(
      2030.7692,
      3
    );
  });

  it("calculates PV requirement after system losses", () => {
    const result = calculateEnergy({
      loadAudit,
      systemLossFactor: 0.3,
      peakSunHours: 4,
      performanceRatio: 0.65,
    });

    expect(result.requiredPVPowerW).toBeCloseTo(
      2640,
      3
    );
  });

  it("rejects zero daily energy", () => {
    const invalidAudit: LoadAuditResult = {
      totalRunningPowerW: 0,
      totalDailyEnergyWh: 0,
      totalSurgePowerW: 0,
      loads: [],
    };

    expect(() =>
      calculateEnergy({
        loadAudit: invalidAudit,
        systemLossFactor: 0.3,
        peakSunHours: 4,
        performanceRatio: 0.65,
      })
    ).toThrow();
  });

  it("rejects invalid peak sun hours", () => {
    expect(() =>
      calculateEnergy({
        loadAudit,
        systemLossFactor: 0.3,
        peakSunHours: 0,
        performanceRatio: 0.65,
      })
    ).toThrow();
  });

  it("rejects invalid performance ratio", () => {
    expect(() =>
      calculateEnergy({
        loadAudit,
        systemLossFactor: 0.3,
        peakSunHours: 4,
        performanceRatio: 1.5,
      })
    ).toThrow();
  });

  it("rejects invalid system loss factor", () => {
    expect(() =>
      calculateEnergy({
        loadAudit,
        systemLossFactor: 1,
        peakSunHours: 4,
        performanceRatio: 0.65,
      })
    ).toThrow();
  });
});