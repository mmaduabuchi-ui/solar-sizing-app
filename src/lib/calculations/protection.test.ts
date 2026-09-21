import { describe, expect, it } from "vitest";
import {
  calculateProtection,
  type ProtectionSizingInput,
} from "./protection";

describe("Protection Sizing", () => {
  const baseInput: ProtectionSizingInput = {
    inverterRatedVA: 3000,
    acVoltage: 230,

    inverterPowerW: 3000,
    batteryVoltage: 24,
    inverterEfficiency: 0.8,

    panelIscA: 12.9,
    parallelStrings: 3,

    acProtectionFactor: 1.25,
    batteryProtectionFactor: 1.25,
    pvProtectionFactor: 1.25,

    standardBreakerRatingsA: [
      10,
      16,
      20,
      25,
      32,
      40,
      50,
      63,
      80,
      100,
      125,
      160,
      200,
      250,
      315,
      400,
    ],
  };

  it("calculates AC inverter output current correctly", () => {
    const result = calculateProtection(baseInput);

    expect(result.ac.requiredCurrentA).toBeCloseTo(13.0435, 3);
  });

  it("applies the AC protection factor correctly", () => {
    const result = calculateProtection(baseInput);

    expect(result.ac.protectedCurrentA).toBeCloseTo(16.3043, 3);
  });

  it("selects the next standard AC breaker rating", () => {
    const result = calculateProtection(baseInput);

    expect(result.ac.recommendedBreakerA).toBe(20);
  });

  it("calculates battery current correctly", () => {
    const result = calculateProtection(baseInput);

    expect(result.battery.requiredCurrentA).toBeCloseTo(156.25, 2);
  });

  it("applies the battery protection factor correctly", () => {
    const result = calculateProtection(baseInput);

    expect(result.battery.protectedCurrentA).toBeCloseTo(195.3125, 3);
  });

  it("selects the next standard battery breaker rating", () => {
    const result = calculateProtection(baseInput);

    expect(result.battery.recommendedBreakerA).toBe(200);
  });

  it("calculates PV array Isc correctly", () => {
    const result = calculateProtection(baseInput);

    expect(result.pv.requiredCurrentA).toBeCloseTo(38.7, 2);
  });

  it("applies the PV protection factor correctly", () => {
    const result = calculateProtection(baseInput);

    expect(result.pv.protectedCurrentA).toBeCloseTo(48.375, 3);
  });

  it("selects the next standard PV breaker rating", () => {
    const result = calculateProtection(baseInput);

    expect(result.pv.recommendedBreakerA).toBe(50);
  });

  it("selects the exact standard rating when calculated current matches it", () => {
    const input: ProtectionSizingInput = {
      ...baseInput,
      inverterRatedVA: 3680,
      acVoltage: 230,
      acProtectionFactor: 1,
    };

    const result = calculateProtection(input);

    expect(result.ac.requiredCurrentA).toBeCloseTo(16, 6);
    expect(result.ac.protectedCurrentA).toBeCloseTo(16, 6);
    expect(result.ac.recommendedBreakerA).toBe(16);
  });

  it("selects the next rating when current falls between standard ratings", () => {
    const input: ProtectionSizingInput = {
      ...baseInput,
      inverterRatedVA: 3900,
      acVoltage: 230,
      acProtectionFactor: 1,
    };

    const result = calculateProtection(input);

    expect(result.ac.requiredCurrentA).toBeCloseTo(16.9565, 3);
    expect(result.ac.recommendedBreakerA).toBe(20);
  });

  it("rejects invalid zero or negative values", () => {
    expect(() =>
      calculateProtection({
        ...baseInput,
        inverterRatedVA: 0,
      }),
    ).toThrow();

    expect(() =>
      calculateProtection({
        ...baseInput,
        acVoltage: 0,
      }),
    ).toThrow();

    expect(() =>
      calculateProtection({
        ...baseInput,
        batteryVoltage: -24,
      }),
    ).toThrow();

    expect(() =>
      calculateProtection({
        ...baseInput,
        inverterEfficiency: 0,
      }),
    ).toThrow();

    expect(() =>
      calculateProtection({
        ...baseInput,
        panelIscA: -12.9,
      }),
    ).toThrow();
  });

  it("rejects an efficiency greater than 1", () => {
    expect(() =>
      calculateProtection({
        ...baseInput,
        inverterEfficiency: 1.1,
      }),
    ).toThrow();
  });

  it("rejects an empty breaker-rating list", () => {
    expect(() =>
      calculateProtection({
        ...baseInput,
        standardBreakerRatingsA: [],
      }),
    ).toThrow();
  });

  it("reports a warning when the recommended breaker exceeds a supplied equipment limit", () => {
    const input: ProtectionSizingInput = {
      ...baseInput,
      acBreakerMaximumA: 16,
    };

    const result = calculateProtection(input);

    expect(result.ac.recommendedBreakerA).toBe(20);
    expect(result.ac.warnings.length).toBeGreaterThan(0);
  });

  it("reports an error when no available breaker can protect the calculated current", () => {
    const input: ProtectionSizingInput = {
      ...baseInput,
      standardBreakerRatingsA: [10, 16],
    };

    const result = calculateProtection(input);

    expect(result.ac.recommendedBreakerA).toBeNull();
    expect(result.ac.errors.length).toBeGreaterThan(0);
  });

  it("returns an overall protection status", () => {
    const result = calculateProtection(baseInput);

    expect(["pass", "warning", "fail"]).toContain(result.status);
  });
});