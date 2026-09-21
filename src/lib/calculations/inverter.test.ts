import { describe, expect, it } from "vitest";
import { calculateInverterSizing } from "./inverter";
import type { LoadAuditResult } from "./loadAudit";

describe("Inverter Sizing", () => {
  const loadAudit: LoadAuditResult = {
    totalRunningPowerW: 220,
    totalDailyEnergyWh: 5280,
    totalSurgePowerW: 220,
    loads: [],
  };

  it("calculates continuous working load with 25% design margin", () => {
    const result = calculateInverterSizing({
      loadAudit,
      workingMargin: 1.25,
      powerFactor: 0.8,
    });

    expect(result.workingLoadW).toBe(275);
  });

  it("calculates apparent power from continuous working load", () => {
    const result = calculateInverterSizing({
      loadAudit,
      workingMargin: 1.25,
      powerFactor: 0.8,
    });

    expect(
      result.requiredVABasedOnRunningLoad
    ).toBeCloseTo(343.75, 2);

    expect(result.requiredKVA).toBeCloseTo(
      0.34375,
      4
    );
  });

  it("does not use the 25% margin as surge capacity", () => {
    const surgeLoadAudit: LoadAuditResult = {
      ...loadAudit,
      totalSurgePowerW: 1100,
    };

    const result = calculateInverterSizing({
      loadAudit: surgeLoadAudit,
      workingMargin: 1.25,
      powerFactor: 0.8,
    });

    /*
     * Continuous load:
     * 220 W × 1.25 = 275 W
     */
    expect(result.workingLoadW).toBe(275);

    /*
     * Starting surge remains 1,100 W.
     *
     * It is NOT:
     * 1,100 × 1.25 = 1,375 W
     */
    expect(result.startingSurgeW).toBe(1100);
  });

  it("recognizes a genuine surge requirement", () => {
    const surgeLoadAudit: LoadAuditResult = {
      ...loadAudit,
      totalSurgePowerW: 1100,
    };

    const result = calculateInverterSizing({
      loadAudit: surgeLoadAudit,
      workingMargin: 1.25,
      powerFactor: 0.8,
    });

    expect(result.surgeDataAvailable).toBe(true);
  });

  it("does not claim confirmed surge data when surge equals running load", () => {
    const result = calculateInverterSizing({
      loadAudit,
      workingMargin: 1.25,
      powerFactor: 0.8,
    });

    expect(result.startingSurgeW).toBe(220);
    expect(result.surgeDataAvailable).toBe(false);
  });

  it("rejects an invalid power factor", () => {
    expect(() =>
      calculateInverterSizing({
        loadAudit,
        workingMargin: 1.25,
        powerFactor: 0,
      })
    ).toThrow();
  });

  it("rejects an invalid working margin", () => {
    expect(() =>
      calculateInverterSizing({
        loadAudit,
        workingMargin: 0.8,
        powerFactor: 0.8,
      })
    ).toThrow();
  });

  it("rejects negative surge power", () => {
    const invalidLoadAudit: LoadAuditResult = {
      ...loadAudit,
      totalSurgePowerW: -100,
    };

    expect(() =>
      calculateInverterSizing({
        loadAudit: invalidLoadAudit,
        workingMargin: 1.25,
        powerFactor: 0.8,
      })
    ).toThrow();
  });
});