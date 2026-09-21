import { describe, expect, it } from "vitest";

import {
  calculateSystemValidation,
  type SystemValidationInput,
} from "./validation";

/* -------------------------------------------------------------------------- */
/* VALID BASE INPUT                                                           */
/* -------------------------------------------------------------------------- */

const validInput: SystemValidationInput = {
  inverter: {
    requiredKVA: 2.75,
    selectedRatedKVA: 3,
    totalRunningPowerW: 2200,
    startingSurgeW: 5000,
    inverterSurgeW: 6000,
  },

  pv: {
    requiredPVPowerW: 2500,
    actualPVPowerW: 3000,
    inverterMaxPVInputW: 3000,
  },

  mppt: {
    stringVocV: 99,
    inverterMaxPVVocV: 145,
    stringVmpV: 82.4,
    mpptMinVoltageV: 30,
    mpptMaxVoltageV: 120,
    arrayIscA: 25.8,
    mpptCurrentA: 60,
  },

  battery: {
    requiredStoredEnergyWh: 10000,
    actualStoredEnergyWh: 10560,
    requiredCapacityAh: 416.67,
    actualCapacityAh: 440,
    selectedBatteryVoltageV: 24,
    inverterSystemVoltageV: 24,
  },

  chargeController: {
    requiredCurrentA: 156.25,
    selectedControllerCurrentA: 200,
  },

  oversizing: {
    status: "acceptable",
    ilr: 1.0,
  },

  protection: {
    status: "pass",
  },

  cable: {
    status: "pass",
    protectionCoordinationPass: true,
  },
};

/* -------------------------------------------------------------------------- */
/* HELPER                                                                     */
/* -------------------------------------------------------------------------- */

function cloneInput(): SystemValidationInput {
  return structuredClone(validInput);
}

/* -------------------------------------------------------------------------- */
/* TEST SUITE                                                                 */
/* -------------------------------------------------------------------------- */

describe("calculateSystemValidation", () => {
  /* ------------------------------------------------------------------------ */
  /* 1. VALID COMPLETE SYSTEM                                                */
  /* ------------------------------------------------------------------------ */

  it("passes a valid complete system", () => {
    const result = calculateSystemValidation(validInput);

    expect(result.status).toBe("pass");
    expect(result.canFinalize).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  /* ------------------------------------------------------------------------ */
  /* 2. INVERTER KVA TOO SMALL                                                */
  /* ------------------------------------------------------------------------ */

  it("fails when selected inverter rated kVA is too small", () => {
    const input = cloneInput();

    input.inverter.selectedRatedKVA = 2;

    const result = calculateSystemValidation(input);

    expect(result.status).toBe("fail");
    expect(result.canFinalize).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /* ------------------------------------------------------------------------ */
  /* 3. SURGE CAPABILITY                                                      */
  /* ------------------------------------------------------------------------ */

  it("fails when inverter surge capability is insufficient", () => {
    const input = cloneInput();

    input.inverter.inverterSurgeW = 4000;

    const result = calculateSystemValidation(input);

    expect(result.status).toBe("fail");
    expect(result.canFinalize).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /* ------------------------------------------------------------------------ */
  /* 4. PV BELOW REQUIREMENT                                                  */
  /* ------------------------------------------------------------------------ */

  it("fails when actual PV power is below required PV power", () => {
    const input = cloneInput();

    input.pv.actualPVPowerW = 2000;

    const result = calculateSystemValidation(input);

    expect(result.status).toBe("fail");
    expect(result.canFinalize).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /* ------------------------------------------------------------------------ */
  /* 5. PV EXCEEDS INVERTER MAXIMUM                                           */
  /* ------------------------------------------------------------------------ */

  it("fails when actual PV power exceeds inverter maximum PV input", () => {
    const input = cloneInput();

    input.pv.actualPVPowerW = 3500;

    const result = calculateSystemValidation(input);

    expect(result.status).toBe("fail");
    expect(result.canFinalize).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /* ------------------------------------------------------------------------ */
  /* 6. VOC TOO HIGH                                                          */
  /* ------------------------------------------------------------------------ */

  it("fails when string Voc exceeds inverter maximum PV Voc", () => {
    const input = cloneInput();

    input.mppt.stringVocV = 150;

    const result = calculateSystemValidation(input);

    expect(result.status).toBe("fail");
    expect(result.canFinalize).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /* ------------------------------------------------------------------------ */
  /* 7. VMP BELOW MPPT RANGE                                                  */
  /* ------------------------------------------------------------------------ */

  it("fails when string Vmp is below MPPT minimum voltage", () => {
    const input = cloneInput();

    input.mppt.stringVmpV = 20;

    const result = calculateSystemValidation(input);

    expect(result.status).toBe("fail");
    expect(result.canFinalize).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /* ------------------------------------------------------------------------ */
  /* 8. VMP ABOVE MPPT RANGE                                                  */
  /* ------------------------------------------------------------------------ */

  it("fails when string Vmp is above MPPT maximum voltage", () => {
    const input = cloneInput();

    input.mppt.stringVmpV = 130;

    const result = calculateSystemValidation(input);

    expect(result.status).toBe("fail");
    expect(result.canFinalize).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /* ------------------------------------------------------------------------ */
  /* 9. MPPT CURRENT                                                           */
  /* ------------------------------------------------------------------------ */

  it("fails when PV array current exceeds MPPT current", () => {
    const input = cloneInput();

    input.mppt.arrayIscA = 70;

    const result = calculateSystemValidation(input);

    expect(result.status).toBe("fail");
    expect(result.canFinalize).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /* ------------------------------------------------------------------------ */
  /* 10. BATTERY STORED ENERGY                                                */
  /* ------------------------------------------------------------------------ */

  it("fails when actual battery stored energy is below required energy", () => {
    const input = cloneInput();

    input.battery.actualStoredEnergyWh = 9000;

    const result = calculateSystemValidation(input);

    expect(result.status).toBe("fail");
    expect(result.canFinalize).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /* ------------------------------------------------------------------------ */
  /* 11. BATTERY VOLTAGE                                                      */
  /* ------------------------------------------------------------------------ */

  it("fails when battery voltage does not match inverter system voltage", () => {
    const input = cloneInput();

    input.battery.selectedBatteryVoltageV = 48;

    const result = calculateSystemValidation(input);

    expect(result.status).toBe("fail");
    expect(result.canFinalize).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /* ------------------------------------------------------------------------ */
  /* 12. BATTERY CAPACITY                                                     */
  /* ------------------------------------------------------------------------ */

  it("fails when actual battery Ah capacity is below required capacity", () => {
    const input = cloneInput();

    input.battery.actualCapacityAh = 350;

    const result = calculateSystemValidation(input);

    expect(result.status).toBe("fail");
    expect(result.canFinalize).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /* ------------------------------------------------------------------------ */
  /* 13. CHARGE CONTROLLER CURRENT                                            */
  /* ------------------------------------------------------------------------ */

  it("fails when charge controller current is insufficient", () => {
    const input = cloneInput();

    input.chargeController.selectedControllerCurrentA = 100;

    const result = calculateSystemValidation(input);

    expect(result.status).toBe("fail");
    expect(result.canFinalize).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /* ------------------------------------------------------------------------ */
  /* 14. EXCESSIVE OVERSIZING                                                 */
  /* ------------------------------------------------------------------------ */

  it("fails when PV oversizing is excessive", () => {
    const input = cloneInput();

    input.oversizing.status = "excessive";

    const result = calculateSystemValidation(input);

    expect(result.status).toBe("fail");
    expect(result.canFinalize).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /* ------------------------------------------------------------------------ */
  /* 15. ABOVE-PREFERRED OVERSIZING                                            */
  /* ------------------------------------------------------------------------ */

  it("returns warning but allows finalization for above-preferred oversizing", () => {
    const input = cloneInput();

    input.oversizing.status = "above-preferred";

    const result = calculateSystemValidation(input);

    expect(result.status).toBe("warning");
    expect(result.canFinalize).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

  /* ------------------------------------------------------------------------ */
  /* 16. PROTECTION FAILURE                                                   */
  /* ------------------------------------------------------------------------ */

  it("fails when protection validation fails", () => {
    const input = cloneInput();

    input.protection.status = "fail";

    const result = calculateSystemValidation(input);

    expect(result.status).toBe("fail");
    expect(result.canFinalize).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /* ------------------------------------------------------------------------ */
  /* 17. CABLE PROTECTION COORDINATION                                        */
  /* ------------------------------------------------------------------------ */

  it("fails when cable protection coordination fails", () => {
    const input = cloneInput();

    input.cable.protectionCoordinationPass = false;

    const result = calculateSystemValidation(input);

    expect(result.status).toBe("fail");
    expect(result.canFinalize).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /* ------------------------------------------------------------------------ */
  /* 18. CABLE WARNING                                                        */
  /* ------------------------------------------------------------------------ */

  it("returns warning but allows finalization when cable has a warning", () => {
    const input = cloneInput();

    input.cable.status = "warning";

    const result = calculateSystemValidation(input);

    expect(result.status).toBe("warning");
    expect(result.canFinalize).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

  /* ------------------------------------------------------------------------ */
  /* 19. MULTIPLE CRITICAL ERRORS                                             */
  /* ------------------------------------------------------------------------ */

  it("blocks finalization when multiple critical errors exist", () => {
    const input = cloneInput();

    input.inverter.selectedRatedKVA = 2;
    input.pv.actualPVPowerW = 1500;
    input.mppt.stringVocV = 160;
    input.battery.selectedBatteryVoltageV = 48;
    input.chargeController.selectedControllerCurrentA = 100;
    input.protection.status = "fail";
    input.cable.protectionCoordinationPass = false;

    const result = calculateSystemValidation(input);

    expect(result.status).toBe("fail");
    expect(result.canFinalize).toBe(false);

    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  /* ------------------------------------------------------------------------ */
  /* RESULT STRUCTURE                                                         */
  /* ------------------------------------------------------------------------ */

  it("returns the expected validation result structure", () => {
    const result = calculateSystemValidation(validInput);

    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("canFinalize");
    expect(result).toHaveProperty("warnings");
    expect(result).toHaveProperty("errors");
    expect(result).toHaveProperty("checks");

    expect(Array.isArray(result.warnings)).toBe(true);
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.checks)).toBe(true);
  });
});