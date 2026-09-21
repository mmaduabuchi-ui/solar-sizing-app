import { describe, it, expect } from "vitest";
import type {
  InverterSpec,
  PanelSpec,
} from "@/types/solar";

import {
  calculatePanelArrangement,
} from "./panelArrangement";

const panel: PanelSpec = {
  brand: "Test Solar",
  model: "500W Test Panel",
  pmaxW: 500,
  voc: 49.5,
  vmp: 41.2,
  isc: 12.9,
  imp: 12.14,
  efficiency: 21.3,
};

const inverter: InverterSpec = {
  brand: "Test Inverter",
  model: "PV18-3024 VHM",
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

describe("calculatePanelArrangement", () => {
  it("exports calculatePanelArrangement as a function", () => {
    expect(
      typeof calculatePanelArrangement
    ).toBe("function");
  });

  it("calculates the minimum panel count correctly", () => {
    const result = calculatePanelArrangement({
      requiredPVPowerW: 2030.8,
      selectedPanel: panel,
      currentSafetyFactor: 1.25,
    });

    expect(result.minimumPanelCount).toBe(5);
  });

  it("calculates the minimum panel count for 2640 W correctly", () => {
    const result = calculatePanelArrangement({
      requiredPVPowerW: 2640,
      selectedPanel: panel,
      currentSafetyFactor: 1.25,
    });

    expect(result.minimumPanelCount).toBe(6);
  });

  it("finds a valid 2S2P arrangement for four panels", () => {
    const result = calculatePanelArrangement({
      requiredPVPowerW: 1900,
      selectedPanel: panel,
      inverter,
      currentSafetyFactor: 1.25,
      maxPanelCount: 4,
    });

    expect(result.status).toBe("valid");
    expect(result.selectedArrangement).toBeDefined();

    expect(
      result.selectedArrangement?.panelCount
    ).toBe(4);

    expect(
      result.selectedArrangement?.panelsInSeries
    ).toBe(2);

    expect(
      result.selectedArrangement?.parallelStrings
    ).toBe(2);
  });

  it("calculates 2S2P electrical values correctly", () => {
    const result = calculatePanelArrangement({
      requiredPVPowerW: 1900,
      selectedPanel: panel,
      inverter,
      currentSafetyFactor: 1.25,
      maxPanelCount: 4,
    });

    const arrangement = result.selectedArrangement;

    expect(arrangement).toBeDefined();

    expect(arrangement?.arrayPowerW).toBe(2000);
    expect(arrangement?.stringVocV).toBe(99);
    expect(arrangement?.stringVmpV).toBe(82.4);
    expect(arrangement?.arrayIscA).toBeCloseTo(25.8);
    expect(arrangement?.arrayImpA).toBeCloseTo(24.28);
  });

  it("calculates oversizing ratio correctly", () => {
    const result = calculatePanelArrangement({
      requiredPVPowerW: 1900,
      selectedPanel: panel,
      inverter,
      currentSafetyFactor: 1.25,
      maxPanelCount: 4,
    });

    const arrangement = result.selectedArrangement;

    expect(arrangement).toBeDefined();

    expect(
      arrangement?.oversizingRatio
    ).toBeCloseTo(2000 / 1900);

    expect(
      arrangement?.oversizingPercent
    ).toBeCloseTo(
      ((2000 / 1900) - 1) * 100
    );
  });

  it("finds a valid 2S3P arrangement for six panels", () => {
    const result = calculatePanelArrangement({
      requiredPVPowerW: 2640,
      selectedPanel: panel,
      inverter,
      currentSafetyFactor: 1.25,
      maxPanelCount: 6,
    });

    expect(result.status).toBe("valid");
    expect(result.selectedArrangement).toBeDefined();

    expect(
      result.selectedArrangement?.panelCount
    ).toBe(6);

    expect(
      result.selectedArrangement?.panelsInSeries
    ).toBe(2);

    expect(
      result.selectedArrangement?.parallelStrings
    ).toBe(3);
  });

  it("calculates the six-panel array power correctly", () => {
    const result = calculatePanelArrangement({
      requiredPVPowerW: 2640,
      selectedPanel: panel,
      inverter,
      currentSafetyFactor: 1.25,
      maxPanelCount: 6,
    });

    expect(
      result.selectedArrangement?.arrayPowerW
    ).toBe(3000);
  });

  it("calculates six-panel 2S3P current correctly", () => {
    const result = calculatePanelArrangement({
      requiredPVPowerW: 2640,
      selectedPanel: panel,
      inverter,
      currentSafetyFactor: 1.25,
      maxPanelCount: 6,
    });

    const arrangement = result.selectedArrangement;

    expect(
      arrangement?.arrayIscA
    ).toBeCloseTo(38.7);

    expect(
      arrangement?.arrayImpA
    ).toBeCloseTo(36.42);
  });

  it("accepts a valid string Voc below inverter maximum Voc", () => {
    const result = calculatePanelArrangement({
      requiredPVPowerW: 1900,
      selectedPanel: panel,
      inverter,
      currentSafetyFactor: 1.25,
      maxPanelCount: 4,
    });

    const arrangement = result.candidates.find(
      (candidate) =>
        candidate.panelCount === 4 &&
        candidate.panelsInSeries === 2
    );

    expect(arrangement).toBeDefined();
    expect(arrangement?.stringVocV).toBe(99);
    expect(arrangement?.valid).toBe(true);
  });

  it("rejects an arrangement when string Voc exceeds inverter maximum", () => {
    const lowVocLimitInverter: InverterSpec = {
      ...inverter,
      maxPVVoc: 90,
    };

    const result = calculatePanelArrangement({
      requiredPVPowerW: 1900,
      selectedPanel: panel,
      inverter: lowVocLimitInverter,
      currentSafetyFactor: 1.25,
      maxPanelCount: 4,
    });

    const twoSeries = result.candidates.find(
      (candidate) =>
        candidate.panelCount === 4 &&
        candidate.panelsInSeries === 2
    );

    expect(twoSeries).toBeDefined();
    expect(twoSeries?.valid).toBe(false);

    expect(
      twoSeries?.reasons.some(
        (reason) =>
          reason.includes(
            "maximum PV Voc"
          )
      )
    ).toBe(true);
  });

  it("rejects an arrangement when array power exceeds inverter PV input", () => {
    const lowPVPowerInverter: InverterSpec = {
      ...inverter,
      maxPVInputW: 2500,
    };

    const result = calculatePanelArrangement({
      requiredPVPowerW: 2400,
      selectedPanel: panel,
      inverter: lowPVPowerInverter,
      currentSafetyFactor: 1.25,
      maxPanelCount: 6,
    });

    const sixPanelCandidate = result.candidates.find(
      (candidate) =>
        candidate.panelCount === 6 &&
        candidate.panelsInSeries === 2
    );

    expect(sixPanelCandidate).toBeDefined();
    expect(sixPanelCandidate?.arrayPowerW).toBe(3000);
    expect(sixPanelCandidate?.valid).toBe(false);

    expect(
      sixPanelCandidate?.reasons.some(
        (reason) =>
          reason.includes(
            "maximum PV input"
          )
      )
    ).toBe(true);
  });

  it("rejects an arrangement when MPPT current is exceeded", () => {
    const lowCurrentInverter: InverterSpec = {
      ...inverter,
      mpptCurrent: 30,
    };

    const result = calculatePanelArrangement({
      requiredPVPowerW: 2640,
      selectedPanel: panel,
      inverter: lowCurrentInverter,
      currentSafetyFactor: 1.25,
      maxPanelCount: 6,
    });

    const sixPanelCandidate = result.candidates.find(
      (candidate) =>
        candidate.panelCount === 6 &&
        candidate.panelsInSeries === 2
    );

    expect(sixPanelCandidate).toBeDefined();
    expect(sixPanelCandidate?.valid).toBe(false);

    expect(
      sixPanelCandidate?.reasons.some(
        (reason) =>
          reason.includes(
            "MPPT current rating"
          )
      )
    ).toBe(true);
  });

  it("rejects a PV arrangement when string Vmp is below MPPT minimum", () => {
    const highMinimumVoltageInverter: InverterSpec = {
      ...inverter,
      mpptMinVoltage: 100,
    };

    const result = calculatePanelArrangement({
      requiredPVPowerW: 2000,
      selectedPanel: panel,
      inverter: highMinimumVoltageInverter,
      currentSafetyFactor: 1.25,
      maxPanelCount: 4,
    });

    const twoSeries = result.candidates.find(
      (candidate) =>
        candidate.panelCount === 4 &&
        candidate.panelsInSeries === 2
    );

    expect(twoSeries).toBeDefined();

    expect(
      twoSeries?.valid
    ).toBe(false);

    expect(
      twoSeries?.reasons.some(
        (reason) =>
          reason.includes(
            "MPPT minimum voltage"
          )
      )
    ).toBe(true);
  });

  it("rejects a PV arrangement when string Vmp exceeds MPPT maximum", () => {
    const lowMaximumVoltageInverter: InverterSpec = {
      ...inverter,
      mpptMaxVoltage: 70,
    };

    const result = calculatePanelArrangement({
      requiredPVPowerW: 1900,
      selectedPanel: panel,
      inverter: lowMaximumVoltageInverter,
      currentSafetyFactor: 1.25,
      maxPanelCount: 4,
    });

    const twoSeries = result.candidates.find(
      (candidate) =>
        candidate.panelCount === 4 &&
        candidate.panelsInSeries === 2
    );

    expect(twoSeries).toBeDefined();
    expect(twoSeries?.valid).toBe(false);

    expect(
      twoSeries?.reasons.some(
        (reason) =>
          reason.includes(
            "MPPT maximum voltage"
          )
      )
    ).toBe(true);
  });

  it("returns no-valid-arrangement when inverter constraints cannot be satisfied", () => {
    const restrictiveInverter: InverterSpec = {
      ...inverter,
      maxPVInputW: 1000,
      maxPVVoc: 50,
      mpptMinVoltage: 100,
      mpptMaxVoltage: 110,
      mpptCurrent: 10,
    };

    const result = calculatePanelArrangement({
      requiredPVPowerW: 2000,
      selectedPanel: panel,
      inverter: restrictiveInverter,
      currentSafetyFactor: 1.25,
      maxPanelCount: 6,
    });

    expect(
      result.status
    ).toBe("no-valid-arrangement");

    expect(
      result.selectedArrangement
    ).toBeUndefined();

    expect(
      result.errors.length
    ).toBeGreaterThan(0);
  });

  it("throws when required PV power is invalid", () => {
    expect(() =>
      calculatePanelArrangement({
        requiredPVPowerW: 0,
        selectedPanel: panel,
        currentSafetyFactor: 1.25,
      })
    ).toThrow(
      "Required PV power must be greater than 0 W."
    );
  });

  it("throws when panel specification is missing", () => {
    expect(() =>
      calculatePanelArrangement({
        requiredPVPowerW: 2000,
        selectedPanel: undefined as unknown as PanelSpec,
        currentSafetyFactor: 1.25,
      })
    ).toThrow(
      "Selected panel specification is required."
    );
  });

  it("throws when current safety factor is below 1", () => {
    expect(() =>
      calculatePanelArrangement({
        requiredPVPowerW: 2000,
        selectedPanel: panel,
        currentSafetyFactor: 0.9,
      })
    ).toThrow(
      "Current safety factor must be at least 1.0."
    );
  });

  it("throws when maximum panel count is invalid", () => {
    expect(() =>
      calculatePanelArrangement({
        requiredPVPowerW: 2000,
        selectedPanel: panel,
        currentSafetyFactor: 1.25,
        maxPanelCount: 0,
      })
    ).toThrow(
      "Maximum panel count must be a positive whole number."
    );
  });

  it("throws when maximum panel count is below the minimum required quantity", () => {
    expect(() =>
      calculatePanelArrangement({
        requiredPVPowerW: 3000,
        selectedPanel: panel,
        currentSafetyFactor: 1.25,
        maxPanelCount: 5,
      })
    ).toThrow(
      "Maximum panel count cannot be less than the minimum required panel count."
    );
  });

  it("generates candidates for multiple series configurations", () => {
    const result = calculatePanelArrangement({
      requiredPVPowerW: 2000,
      selectedPanel: panel,
      currentSafetyFactor: 1.25,
      maxPanelCount: 6,
    });

    expect(result.candidates.length).toBeGreaterThan(0);

    const fourPanelTwoSeries =
      result.candidates.find(
        (candidate) =>
          candidate.panelCount === 4 &&
          candidate.panelsInSeries === 2
      );

    expect(
      fourPanelTwoSeries
    ).toBeDefined();
  });

  it("reports a warning when the selected array is oversized", () => {
    const result = calculatePanelArrangement({
      requiredPVPowerW: 1900,
      selectedPanel: panel,
      inverter,
      currentSafetyFactor: 1.25,
      maxPanelCount: 4,
    });

    expect(
      result.selectedArrangement
    ).toBeDefined();

    expect(
      result.warnings.some(
        (warning) =>
          warning.includes(
            "above the calculated PV requirement"
          )
      )
    ).toBe(true);
  });
});