import { describe, expect, it } from "vitest";

import {
  calculateOversizing,
} from "./oversizing";

describe("PV Oversizing / ILR", () => {
  it("calculates ILR correctly", () => {
    const result = calculateOversizing({
      requiredPVPowerW: 2000,
      actualPVPowerW: 3000,
      inverterRatedPowerW: 2500,
      minILR: 1.2,
      maxILR: 1.3,
    });

    expect(result.ilr).toBeCloseTo(1.2);
  });

  it("calculates PV oversizing percentage", () => {
    const result = calculateOversizing({
      requiredPVPowerW: 2000,
      actualPVPowerW: 2500,
      inverterRatedPowerW: 2500,
      minILR: 1.2,
      maxILR: 1.3,
    });

    expect(result.oversizingPercent).toBeCloseTo(25);
  });

  it("passes an array within the acceptable ILR range", () => {
    const result = calculateOversizing({
      requiredPVPowerW: 2000,
      actualPVPowerW: 3000,
      inverterRatedPowerW: 2500,
      minILR: 1.2,
      maxILR: 1.3,
    });

    expect(result.status).toBe("acceptable");
    expect(result.ilr).toBeCloseTo(1.2);
  });

  it("detects an undersized PV array", () => {
    const result = calculateOversizing({
      requiredPVPowerW: 3000,
      actualPVPowerW: 2500,
      inverterRatedPowerW: 2500,
      minILR: 1.2,
      maxILR: 1.3,
    });

    expect(result.status).toBe("undersized");
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("detects an array below the preferred ILR", () => {
    const result = calculateOversizing({
      requiredPVPowerW: 2000,
      actualPVPowerW: 2500,
      inverterRatedPowerW: 3000,
      minILR: 1.2,
      maxILR: 1.3,
    });

    expect(result.ilr).toBeCloseTo(2500 / 3000);
    expect(result.status).toBe("below-preferred");
  });

  it("detects an array above the preferred ILR", () => {
    const result = calculateOversizing({
      requiredPVPowerW: 2000,
      actualPVPowerW: 3500,
      inverterRatedPowerW: 2500,
      minILR: 1.2,
      maxILR: 1.3,
    });

    expect(result.ilr).toBeCloseTo(1.4);
    expect(result.status).toBe("above-preferred");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("rejects excessive ILR", () => {
    const result = calculateOversizing({
      requiredPVPowerW: 2000,
      actualPVPowerW: 4500,
      inverterRatedPowerW: 2500,
      minILR: 1.2,
      maxILR: 1.3,
    });

    expect(result.ilr).toBeCloseTo(1.8);
    expect(result.status).toBe("excessive");
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects zero required PV power", () => {
    expect(() =>
      calculateOversizing({
        requiredPVPowerW: 0,
        actualPVPowerW: 2500,
        inverterRatedPowerW: 2500,
        minILR: 1.2,
        maxILR: 1.3,
      })
    ).toThrow("Required PV power must be greater than 0 W.");
  });

  it("rejects zero actual PV power", () => {
    expect(() =>
      calculateOversizing({
        requiredPVPowerW: 2000,
        actualPVPowerW: 0,
        inverterRatedPowerW: 2500,
        minILR: 1.2,
        maxILR: 1.3,
      })
    ).toThrow("Actual PV power must be greater than 0 W.");
  });

  it("rejects zero inverter power", () => {
    expect(() =>
      calculateOversizing({
        requiredPVPowerW: 2000,
        actualPVPowerW: 2500,
        inverterRatedPowerW: 0,
        minILR: 1.2,
        maxILR: 1.3,
      })
    ).toThrow("Inverter rated power must be greater than 0 W.");
  });

  it("rejects invalid minimum ILR", () => {
    expect(() =>
      calculateOversizing({
        requiredPVPowerW: 2000,
        actualPVPowerW: 2500,
        inverterRatedPowerW: 2500,
        minILR: 0,
        maxILR: 1.3,
      })
    ).toThrow("Minimum ILR must be greater than 0.");
  });

  it("rejects maximum ILR below minimum ILR", () => {
    expect(() =>
      calculateOversizing({
        requiredPVPowerW: 2000,
        actualPVPowerW: 2500,
        inverterRatedPowerW: 2500,
        minILR: 1.3,
        maxILR: 1.2,
      })
    ).toThrow(
      "Maximum ILR cannot be less than minimum ILR."
    );
  });
});