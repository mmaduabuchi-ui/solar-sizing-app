import { describe, expect, it } from "vitest";
import { calculateChargeControllerSizing } from "./chargeController";
import type {
  InverterSpec,
  PanelSpec,
} from "@/types/solar";

describe("Charge Controller Sizing", () => {
  const panel: PanelSpec = {
    brand: "Example",
    model: "500W Solar Panel",
    pmaxW: 500,
    voc: 49.5,
    vmp: 41.2,
    isc: 12.9,
    imp: 12.14,
    efficiency: 21.3,
  };

  const inverter: InverterSpec = {
    brand: "Example",
    model: "3kVA Hybrid",
    type: "hybrid",
    ratedKVA: 3,
    ratedWatts: 3000,
    systemVoltage: 24,
    maxPVInputW: 3000,
    maxPVVoc: 145,
    mpptMinVoltage: 30,
    mpptMaxVoltage: 120,
    mpptCurrent: 60,
    maxChargingCurrent: 80,
  };

  it("calculates PV array power", () => {
    const result =
      calculateChargeControllerSizing({
        controllerType: "built-in-mppt",
        systemVoltage: 24,
        panelCount: 4,
        panelsInSeries: 2,
        selectedPanel: panel,
        selectedInverter: inverter,
        safetyFactor: 1.25,
        vocSafetyFactor: 1.15,
      });

    expect(result.arrayPowerW).toBe(2000);
  });

  it("calculates series and parallel configuration", () => {
    const result =
      calculateChargeControllerSizing({
        controllerType: "built-in-mppt",
        systemVoltage: 24,
        panelCount: 4,
        panelsInSeries: 2,
        selectedPanel: panel,
        selectedInverter: inverter,
        safetyFactor: 1.25,
        vocSafetyFactor: 1.15,
      });

    expect(result.panelsInSeries).toBe(2);
    expect(result.parallelStrings).toBe(2);
  });

  it("calculates PV string voltage correctly", () => {
    const result =
      calculateChargeControllerSizing({
        controllerType: "built-in-mppt",
        systemVoltage: 24,
        panelCount: 4,
        panelsInSeries: 2,
        selectedPanel: panel,
        selectedInverter: inverter,
        safetyFactor: 1.25,
        vocSafetyFactor: 1.15,
      });

    expect(result.stringVocV).toBe(99);
    expect(result.stringVmpV).toBe(82.4);
  });

  it("calculates PV array current correctly", () => {
    const result =
      calculateChargeControllerSizing({
        controllerType: "built-in-mppt",
        systemVoltage: 24,
        panelCount: 4,
        panelsInSeries: 2,
        selectedPanel: panel,
        selectedInverter: inverter,
        safetyFactor: 1.25,
        vocSafetyFactor: 1.15,
      });

    expect(result.arrayIscA).toBeCloseTo(
      25.8,
      5
    );

    expect(result.arrayImpA).toBeCloseTo(
      24.28,
      5
    );
  });

  it("calculates controller current requirement", () => {
    const result =
      calculateChargeControllerSizing({
        controllerType: "mppt",
        systemVoltage: 24,
        panelCount: 4,
        panelsInSeries: 2,
        selectedPanel: panel,
        safetyFactor: 1.25,
        vocSafetyFactor: 1.15,
      });

    expect(
      result.requiredControllerCurrentA
    ).toBeCloseTo(104.1667, 3);
  });

  it("calculates controller voltage requirement", () => {
    const result =
      calculateChargeControllerSizing({
        controllerType: "mppt",
        systemVoltage: 24,
        panelCount: 4,
        panelsInSeries: 2,
        selectedPanel: panel,
        safetyFactor: 1.25,
        vocSafetyFactor: 1.15,
      });

    expect(
      result.requiredControllerVoltageV
    ).toBeCloseTo(113.85, 3);
  });

  it("validates a hybrid inverter built-in MPPT", () => {
    const result =
      calculateChargeControllerSizing({
        controllerType: "built-in-mppt",
        systemVoltage: 24,
        panelCount: 4,
        panelsInSeries: 2,
        selectedPanel: panel,
        selectedInverter: inverter,
        safetyFactor: 1.25,
        vocSafetyFactor: 1.15,
      });

    expect(result.inverterPVLimitPass).toBe(true);
    expect(result.inverterMPPTVoltagePass).toBe(true);
    expect(result.inverterMPPTCurrentPass).toBe(true);
    expect(result.inverterPVVocPass).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects PV power above inverter maximum", () => {
    const result =
      calculateChargeControllerSizing({
        controllerType: "built-in-mppt",
        systemVoltage: 24,
        panelCount: 8,
        panelsInSeries: 2,
        selectedPanel: panel,
        selectedInverter: inverter,
        safetyFactor: 1.25,
        vocSafetyFactor: 1.15,
      });

    expect(result.inverterPVLimitPass).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects PV string Voc above inverter maximum", () => {
    const result =
      calculateChargeControllerSizing({
        controllerType: "built-in-mppt",
        systemVoltage: 24,
        panelCount: 6,
        panelsInSeries: 3,
        selectedPanel: panel,
        selectedInverter: inverter,
        safetyFactor: 1.25,
        vocSafetyFactor: 1.15,
      });

    expect(result.inverterPVVocPass).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("warns when PWM is used with substantially higher PV voltage", () => {
    const result =
      calculateChargeControllerSizing({
        controllerType: "pwm",
        systemVoltage: 24,
        panelCount: 4,
        panelsInSeries: 2,
        selectedPanel: panel,
        safetyFactor: 1.25,
        vocSafetyFactor: 1.15,
      });

    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("rejects a panel count that cannot form the selected series configuration", () => {
    expect(() =>
      calculateChargeControllerSizing({
        controllerType: "mppt",
        systemVoltage: 24,
        panelCount: 5,
        panelsInSeries: 2,
        selectedPanel: panel,
        safetyFactor: 1.25,
        vocSafetyFactor: 1.15,
      })
    ).toThrow();
  });

  it("rejects built-in MPPT without an inverter", () => {
    expect(() =>
      calculateChargeControllerSizing({
        controllerType: "built-in-mppt",
        systemVoltage: 24,
        panelCount: 4,
        panelsInSeries: 2,
        selectedPanel: panel,
        safetyFactor: 1.25,
        vocSafetyFactor: 1.15,
      })
    ).toThrow();
  });
});