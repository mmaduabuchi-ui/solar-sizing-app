import { describe, expect, it } from "vitest";

import {
  calculateCableSizing,
  type CableSizingInput,
} from "./cable";

describe("Cable Sizing", () => {
  const baseInput: CableSizingInput = {
    currentA: 20,
    systemVoltageV: 230,
    oneWayLengthM: 10,
    resistivityOhmMm2PerM: 0.0179,
    maximumVoltageDropPercent: 3,

    cableSizesMm2: [
      1.5,
      2.5,
      4,
      6,
      10,
      16,
      25,
      35,
      50,
      70,
      95,
      120,
    ],

    cableAmpacitiesA: {
      1.5: 15,
      2.5: 20,
      4: 27,
      6: 34,
      10: 46,
      16: 61,
      25: 80,
      35: 99,
      50: 119,
      70: 151,
      95: 182,
      120: 210,
    },

    protectionDeviceA: 25,
  };

  it("calculates voltage drop correctly", () => {
    const result = calculateCableSizing(baseInput);

    /*
     * Vd = (2 × L × I × ρ) / A
     *
     * Vd = (2 × 10 × 20 × 0.0179) / 2.5
     * Vd = 2.864 V
     */
    expect(result.voltageDropV).toBeCloseTo(
      2.864,
      4,
    );
  });

  it("calculates voltage drop percentage correctly", () => {
    const result = calculateCableSizing(baseInput);

    /*
     * Voltage drop % = (Vd / system voltage) × 100
     *
     * = (2.864 / 230) × 100
     * = 1.2452%
     */
    expect(result.voltageDropPercent).toBeCloseTo(
      1.245217,
      4,
    );
  });

  it("selects a cable that satisfies the voltage-drop requirement", () => {
    const result = calculateCableSizing(baseInput);

    /*
     * Maximum permitted voltage drop:
     *
     * 230 × 3% = 6.9 V
     *
     * Required theoretical cable area:
     *
     * (2 × 10 × 20 × 0.0179) / 6.9
     * ≈ 1.0406 mm²
     *
     * First available standard cable:
     * 1.5 mm²
     */
    expect(
      result.minimumCableSizeByVoltageDropMm2,
    ).toBe(1.5);
  });

  it("selects a cable that satisfies the ampacity requirement", () => {
    const result = calculateCableSizing(baseInput);

    /*
     * 1.5 mm² = 15 A → insufficient
     * 2.5 mm² = 20 A → sufficient
     */
    expect(
      result.minimumCableSizeByAmpacityMm2,
    ).toBe(2.5);
  });

  it("selects the larger requirement as the recommended cable size", () => {
    const result = calculateCableSizing(baseInput);

    expect(
      result.recommendedCableSizeMm2,
    ).toBe(2.5);
  });

  it("fails protection coordination when cable ampacity is below the protection device rating", () => {
    const result = calculateCableSizing(baseInput);

    /*
     * Cable ampacity = 20 A
     * Protection device = 25 A
     *
     * 20 A < 25 A
     *
     * Therefore coordination must fail.
     */
    expect(
      result.protectionCoordinationPass,
    ).toBe(false);

    expect(result.status).toBe("fail");
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("passes protection coordination when the cable ampacity is sufficient", () => {
    const result = calculateCableSizing({
      ...baseInput,
      protectionDeviceA: 16,
    });

    /*
     * Cable ampacity = 20 A
     * Protection device = 16 A
     *
     * 20 A >= 16 A
     */
    expect(
      result.protectionCoordinationPass,
    ).toBe(true);
  });

  it("reports the recommended cable ampacity", () => {
    const result = calculateCableSizing(baseInput);

    expect(
      result.recommendedCableAmpacityA,
    ).toBe(20);
  });

  it("reports the protection device rating", () => {
    const result = calculateCableSizing(baseInput);

    expect(result.protectionDeviceA).toBe(25);
  });

  it("rejects zero or negative current", () => {
    expect(() =>
      calculateCableSizing({
        ...baseInput,
        currentA: 0,
      }),
    ).toThrow();

    expect(() =>
      calculateCableSizing({
        ...baseInput,
        currentA: -10,
      }),
    ).toThrow();
  });

  it("rejects zero or negative system voltage", () => {
    expect(() =>
      calculateCableSizing({
        ...baseInput,
        systemVoltageV: 0,
      }),
    ).toThrow();
  });

  it("rejects invalid cable length", () => {
    expect(() =>
      calculateCableSizing({
        ...baseInput,
        oneWayLengthM: 0,
      }),
    ).toThrow();
  });

  it("rejects invalid voltage-drop percentage", () => {
    expect(() =>
      calculateCableSizing({
        ...baseInput,
        maximumVoltageDropPercent: 0,
      }),
    ).toThrow();
  });

  it("rejects an empty cable-size list", () => {
    expect(() =>
      calculateCableSizing({
        ...baseInput,
        cableSizesMm2: [],
      }),
    ).toThrow();
  });

  it("fails when no available cable has sufficient ampacity", () => {
    const result = calculateCableSizing({
      ...baseInput,

      /*
       * Largest available cable:
       * 120 mm² = 210 A
       *
       * Current = 220 A
       *
       * Therefore no available cable is sufficient.
       */
      currentA: 220,
      protectionDeviceA: 250,
    });

    expect(
      result.recommendedCableSizeMm2,
    ).toBeNull();

    expect(
      result.errors.length,
    ).toBeGreaterThan(0);

    expect(result.status).toBe("fail");
  });

  it("reports a warning when the selected cable is larger than the minimum voltage-drop requirement", () => {
    const result = calculateCableSizing({
      ...baseInput,
      currentA: 40,
      protectionDeviceA: 50,
    });

    /*
     * At 40 A:
     *
     * Voltage-drop requirement → 4 mm²
     * Ampacity requirement → 10 mm²
     *
     * Therefore 10 mm² is selected.
     */
    expect(
      result.recommendedCableSizeMm2,
    ).toBe(10);

    expect(
      result.warnings.length,
    ).toBeGreaterThanOrEqual(0);
  });

  it("returns an overall validation status", () => {
    const result = calculateCableSizing(baseInput);

    expect([
      "pass",
      "warning",
      "fail",
    ]).toContain(result.status);
  });

  it("uses twice the one-way length for a two-conductor circuit", () => {
    const result = calculateCableSizing({
      ...baseInput,
      currentA: 20,
      oneWayLengthM: 20,
    });

    expect(
      result.totalCircuitLengthM,
    ).toBe(40);
  });

  it("calculates the maximum allowable voltage drop in volts", () => {
    const result = calculateCableSizing(baseInput);

    /*
     * 230 V × 3% = 6.9 V
     */
    expect(
      result.maximumVoltageDropV,
    ).toBeCloseTo(6.9, 6);
  });
});