import type {
  ValidationStatus,
} from "@/types/solar";

import type {
  OversizingStatus,
} from "./oversizing";

/* -------------------------------------------------------------------------- */
/* INPUT TYPES                                                                */
/* -------------------------------------------------------------------------- */

export interface InverterValidationInput {
  requiredKVA: number;
  selectedRatedKVA: number;
  totalRunningPowerW: number;
  startingSurgeW: number;
  inverterSurgeW: number;
}

export interface PVValidationInput {
  requiredPVPowerW: number;
  actualPVPowerW: number;
  inverterMaxPVInputW: number;
}

export interface MPPTValidationInput {
  stringVocV: number;
  inverterMaxPVVocV: number;
  stringVmpV: number;
  mpptMinVoltageV: number;
  mpptMaxVoltageV: number;
  arrayIscA: number;
  mpptCurrentA: number;
}

export interface BatteryValidationInput {
  requiredStoredEnergyWh: number;
  actualStoredEnergyWh: number;
  requiredCapacityAh: number;
  actualCapacityAh: number;
  selectedBatteryVoltageV: number;
  inverterSystemVoltageV: number;
}

export interface ChargeControllerValidationInput {
  requiredCurrentA: number;
  selectedControllerCurrentA: number;
}

export interface OversizingValidationInput {
  status: OversizingStatus;
  ilr: number;
}

export interface ProtectionValidationInput {
  status: ValidationStatus;
}

export interface CableValidationInput {
  status: ValidationStatus;
  protectionCoordinationPass: boolean;
}

/* -------------------------------------------------------------------------- */
/* MAIN INPUT                                                                 */
/* -------------------------------------------------------------------------- */

export interface SystemValidationInput {
  inverter: InverterValidationInput;
  pv: PVValidationInput;
  mppt: MPPTValidationInput;
  battery: BatteryValidationInput;
  chargeController: ChargeControllerValidationInput;
  oversizing: OversizingValidationInput;
  protection: ProtectionValidationInput;
  cable: CableValidationInput;
}

/* -------------------------------------------------------------------------- */
/* OUTPUT TYPES                                                               */
/* -------------------------------------------------------------------------- */

export interface ValidationCheck {
  category: string;
  check: string;
  status: ValidationStatus;
  message: string;
}

export interface SystemValidationResult {
  status: ValidationStatus;
  canFinalize: boolean;
  warnings: string[];
  errors: string[];
  checks: ValidationCheck[];
}

/* -------------------------------------------------------------------------- */
/* VALIDATION HELPERS                                                         */
/* -------------------------------------------------------------------------- */

function addCheck(
  checks: ValidationCheck[],
  category: string,
  check: string,
  status: ValidationStatus,
  message: string,
): void {
  checks.push({
    category,
    check,
    status,
    message,
  });
}

/* -------------------------------------------------------------------------- */
/* INPUT VALIDATION                                                           */
/* -------------------------------------------------------------------------- */

function validateNumber(
  value: number,
  fieldName: string,
  allowZero = false,
): void {
  if (!Number.isFinite(value)) {
    throw new Error(
      `${fieldName} must be a valid number.`,
    );
  }

  if (allowZero) {
    if (value < 0) {
      throw new Error(
        `${fieldName} cannot be negative.`,
      );
    }
  } else if (value <= 0) {
    throw new Error(
      `${fieldName} must be greater than 0.`,
    );
  }
}

function validateInput(
  input: SystemValidationInput,
): void {
  if (!input) {
    throw new Error(
      "System validation input is required.",
    );
  }

  /* Inverter */

  validateNumber(
    input.inverter.requiredKVA,
    "Required inverter kVA",
  );

  validateNumber(
    input.inverter.selectedRatedKVA,
    "Selected inverter rated kVA",
  );

  validateNumber(
    input.inverter.totalRunningPowerW,
    "Total running power",
  );

  validateNumber(
    input.inverter.startingSurgeW,
    "Starting surge power",
    true,
  );

  validateNumber(
    input.inverter.inverterSurgeW,
    "Inverter surge capability",
  );

  /* PV */

  validateNumber(
    input.pv.requiredPVPowerW,
    "Required PV power",
  );

  validateNumber(
    input.pv.actualPVPowerW,
    "Actual PV power",
  );

  validateNumber(
    input.pv.inverterMaxPVInputW,
    "Inverter maximum PV input",
  );

  /* MPPT */

  validateNumber(
    input.mppt.stringVocV,
    "String Voc",
  );

  validateNumber(
    input.mppt.inverterMaxPVVocV,
    "Inverter maximum PV Voc",
  );

  validateNumber(
    input.mppt.stringVmpV,
    "String Vmp",
  );

  validateNumber(
    input.mppt.mpptMinVoltageV,
    "MPPT minimum voltage",
  );

  validateNumber(
    input.mppt.mpptMaxVoltageV,
    "MPPT maximum voltage",
  );

  validateNumber(
    input.mppt.arrayIscA,
    "Array Isc",
  );

  validateNumber(
    input.mppt.mpptCurrentA,
    "MPPT current",
  );

  if (
    input.mppt.mpptMaxVoltageV <
    input.mppt.mpptMinVoltageV
  ) {
    throw new Error(
      "MPPT maximum voltage cannot be less than minimum voltage.",
    );
  }

  /* Battery */

  validateNumber(
    input.battery.requiredStoredEnergyWh,
    "Required stored battery energy",
  );

  validateNumber(
    input.battery.actualStoredEnergyWh,
    "Actual stored battery energy",
  );

  validateNumber(
    input.battery.requiredCapacityAh,
    "Required battery capacity",
  );

  validateNumber(
    input.battery.actualCapacityAh,
    "Actual battery capacity",
  );

  validateNumber(
    input.battery.selectedBatteryVoltageV,
    "Selected battery voltage",
  );

  validateNumber(
    input.battery.inverterSystemVoltageV,
    "Inverter system voltage",
  );

  /* Charge controller */

  validateNumber(
    input.chargeController.requiredCurrentA,
    "Required charge-controller current",
  );

  validateNumber(
    input.chargeController.selectedControllerCurrentA,
    "Selected charge-controller current",
  );

  /* Oversizing */

  validateNumber(
    input.oversizing.ilr,
    "PV ILR",
  );

  /* Cable */

  if (
    typeof input.cable.protectionCoordinationPass !==
    "boolean"
  ) {
    throw new Error(
      "Cable protection coordination status must be true or false.",
    );
  }
}

/* -------------------------------------------------------------------------- */
/* MAIN ENGINE                                                                */
/* -------------------------------------------------------------------------- */

export function calculateSystemValidation(
  input: SystemValidationInput,
): SystemValidationResult {
  validateInput(input);

  const warnings: string[] = [];
  const errors: string[] = [];
  const checks: ValidationCheck[] = [];

  /* ======================================================================== */
  /* 1. INVERTER VALIDATION                                                   */
  /* ======================================================================== */

  if (
    input.inverter.selectedRatedKVA >=
    input.inverter.requiredKVA
  ) {
    addCheck(
      checks,
      "Inverter",
      "Rated capacity",
      "pass",
      `Selected inverter capacity of ${input.inverter.selectedRatedKVA.toFixed(
        2,
      )} kVA meets the required ${input.inverter.requiredKVA.toFixed(
        2,
      )} kVA.`,
    );
  } else {
    const message =
      `Selected inverter capacity of ${input.inverter.selectedRatedKVA.toFixed(
        2,
      )} kVA is below the required ${input.inverter.requiredKVA.toFixed(
        2,
      )} kVA.`;

    errors.push(message);

    addCheck(
      checks,
      "Inverter",
      "Rated capacity",
      "fail",
      message,
    );
  }

  if (
    input.inverter.inverterSurgeW >=
    input.inverter.startingSurgeW
  ) {
    addCheck(
      checks,
      "Inverter",
      "Surge capability",
      "pass",
      `Inverter surge capability of ${input.inverter.inverterSurgeW.toFixed(
        0,
      )} W meets the starting surge requirement of ${input.inverter.startingSurgeW.toFixed(
        0,
      )} W.`,
    );
  } else {
    const message =
      `Inverter surge capability of ${input.inverter.inverterSurgeW.toFixed(
        0,
      )} W is below the starting surge requirement of ${input.inverter.startingSurgeW.toFixed(
        0,
      )} W.`;

    errors.push(message);

    addCheck(
      checks,
      "Inverter",
      "Surge capability",
      "fail",
      message,
    );
  }

  /* ======================================================================== */
  /* 2. PV POWER VALIDATION                                                   */
  /* ======================================================================== */

  if (
    input.pv.actualPVPowerW >=
    input.pv.requiredPVPowerW
  ) {
    addCheck(
      checks,
      "PV Array",
      "Required PV power",
      "pass",
      `Actual PV power of ${input.pv.actualPVPowerW.toFixed(
        0,
      )} W meets the required ${input.pv.requiredPVPowerW.toFixed(
        0,
      )} W.`,
    );
  } else {
    const message =
      `Actual PV power of ${input.pv.actualPVPowerW.toFixed(
        0,
      )} W is below the required ${input.pv.requiredPVPowerW.toFixed(
        0,
      )} W.`;

    errors.push(message);

    addCheck(
      checks,
      "PV Array",
      "Required PV power",
      "fail",
      message,
    );
  }

  if (
    input.pv.actualPVPowerW <=
    input.pv.inverterMaxPVInputW
  ) {
    addCheck(
      checks,
      "PV Array",
      "Inverter PV power limit",
      "pass",
      `PV array power of ${input.pv.actualPVPowerW.toFixed(
        0,
      )} W is within the inverter maximum PV input of ${input.pv.inverterMaxPVInputW.toFixed(
        0,
      )} W.`,
    );
  } else {
    const message =
      `PV array power of ${input.pv.actualPVPowerW.toFixed(
        0,
      )} W exceeds the inverter maximum PV input of ${input.pv.inverterMaxPVInputW.toFixed(
        0,
      )} W.`;

    errors.push(message);

    addCheck(
      checks,
      "PV Array",
      "Inverter PV power limit",
      "fail",
      message,
    );
  }

  /* ======================================================================== */
  /* 3. MPPT / PV ELECTRICAL VALIDATION                                      */
  /* ======================================================================== */

  if (
    input.mppt.stringVocV <=
    input.mppt.inverterMaxPVVocV
  ) {
    addCheck(
      checks,
      "MPPT",
      "Maximum PV Voc",
      "pass",
      `String Voc of ${input.mppt.stringVocV.toFixed(
        2,
      )} V is within the inverter maximum PV Voc of ${input.mppt.inverterMaxPVVocV.toFixed(
        2,
      )} V.`,
    );
  } else {
    const message =
      `String Voc of ${input.mppt.stringVocV.toFixed(
        2,
      )} V exceeds the inverter maximum PV Voc of ${input.mppt.inverterMaxPVVocV.toFixed(
        2,
      )} V.`;

    errors.push(message);

    addCheck(
      checks,
      "MPPT",
      "Maximum PV Voc",
      "fail",
      message,
    );
  }

  if (
    input.mppt.stringVmpV >=
      input.mppt.mpptMinVoltageV &&
    input.mppt.stringVmpV <=
      input.mppt.mpptMaxVoltageV
  ) {
    addCheck(
      checks,
      "MPPT",
      "MPPT operating voltage",
      "pass",
      `String Vmp of ${input.mppt.stringVmpV.toFixed(
        2,
      )} V is within the MPPT operating range of ${input.mppt.mpptMinVoltageV.toFixed(
        2,
      )}–${input.mppt.mpptMaxVoltageV.toFixed(
        2,
      )} V.`,
    );
  } else {
    const message =
      `String Vmp of ${input.mppt.stringVmpV.toFixed(
        2,
      )} V is outside the MPPT operating range of ${input.mppt.mpptMinVoltageV.toFixed(
        2,
      )}–${input.mppt.mpptMaxVoltageV.toFixed(
        2,
      )} V.`;

    errors.push(message);

    addCheck(
      checks,
      "MPPT",
      "MPPT operating voltage",
      "fail",
      message,
    );
  }

  if (
    input.mppt.arrayIscA <=
    input.mppt.mpptCurrentA
  ) {
    addCheck(
      checks,
      "MPPT",
      "PV current",
      "pass",
      `PV array Isc of ${input.mppt.arrayIscA.toFixed(
        2,
      )} A is within the MPPT current limit of ${input.mppt.mpptCurrentA.toFixed(
        2,
      )} A.`,
    );
  } else {
    const message =
      `PV array Isc of ${input.mppt.arrayIscA.toFixed(
        2,
      )} A exceeds the MPPT current limit of ${input.mppt.mpptCurrentA.toFixed(
        2,
      )} A.`;

    errors.push(message);

    addCheck(
      checks,
      "MPPT",
      "PV current",
      "fail",
      message,
    );
  }

  /* ======================================================================== */
  /* 4. BATTERY VALIDATION                                                    */
  /* ======================================================================== */

  if (
    input.battery.actualStoredEnergyWh >=
    input.battery.requiredStoredEnergyWh
  ) {
    addCheck(
      checks,
      "Battery",
      "Stored energy",
      "pass",
      `Actual stored energy of ${input.battery.actualStoredEnergyWh.toFixed(
        0,
      )} Wh meets the required ${input.battery.requiredStoredEnergyWh.toFixed(
        0,
      )} Wh.`,
    );
  } else {
    const message =
      `Actual stored energy of ${input.battery.actualStoredEnergyWh.toFixed(
        0,
      )} Wh is below the required ${input.battery.requiredStoredEnergyWh.toFixed(
        0,
      )} Wh.`;

    errors.push(message);

    addCheck(
      checks,
      "Battery",
      "Stored energy",
      "fail",
      message,
    );
  }

  if (
    input.battery.actualCapacityAh >=
    input.battery.requiredCapacityAh
  ) {
    addCheck(
      checks,
      "Battery",
      "Capacity",
      "pass",
      `Actual battery capacity of ${input.battery.actualCapacityAh.toFixed(
        2,
      )} Ah meets the required ${input.battery.requiredCapacityAh.toFixed(
        2,
      )} Ah.`,
    );
  } else {
    const message =
      `Actual battery capacity of ${input.battery.actualCapacityAh.toFixed(
        2,
      )} Ah is below the required ${input.battery.requiredCapacityAh.toFixed(
        2,
      )} Ah.`;

    errors.push(message);

    addCheck(
      checks,
      "Battery",
      "Capacity",
      "fail",
      message,
    );
  }

  if (
    input.battery.selectedBatteryVoltageV ===
    input.battery.inverterSystemVoltageV
  ) {
    addCheck(
      checks,
      "Battery",
      "System voltage compatibility",
      "pass",
      `Battery voltage of ${input.battery.selectedBatteryVoltageV.toFixed(
        0,
      )} V matches the inverter system voltage of ${input.battery.inverterSystemVoltageV.toFixed(
        0,
      )} V.`,
    );
  } else {
    const message =
      `Battery voltage of ${input.battery.selectedBatteryVoltageV.toFixed(
        0,
      )} V does not match the inverter system voltage of ${input.battery.inverterSystemVoltageV.toFixed(
        0,
      )} V.`;

    errors.push(message);

    addCheck(
      checks,
      "Battery",
      "System voltage compatibility",
      "fail",
      message,
    );
  }

  /* ======================================================================== */
  /* 5. CHARGE CONTROLLER                                                     */
  /* ======================================================================== */

  if (
    input.chargeController
      .selectedControllerCurrentA >=
    input.chargeController.requiredCurrentA
  ) {
    addCheck(
      checks,
      "Charge Controller",
      "Current capacity",
      "pass",
      `Charge-controller capacity of ${input.chargeController.selectedControllerCurrentA.toFixed(
        2,
      )} A meets the required ${input.chargeController.requiredCurrentA.toFixed(
        2,
      )} A.`,
    );
  } else {
    const message =
      `Charge-controller capacity of ${input.chargeController.selectedControllerCurrentA.toFixed(
        2,
      )} A is below the required ${input.chargeController.requiredCurrentA.toFixed(
        2,
      )} A.`;

    errors.push(message);

    addCheck(
      checks,
      "Charge Controller",
      "Current capacity",
      "fail",
      message,
    );
  }

  /* ======================================================================== */
  /* 6. ILR / OVERSIZING                                                      */
  /* ======================================================================== */

  if (
    input.oversizing.status ===
    "excessive"
  ) {
    const message =
      `PV ILR of ${input.oversizing.ilr.toFixed(
        2,
      )} is classified as excessive.`;

    errors.push(message);

    addCheck(
      checks,
      "Oversizing",
      "ILR",
      "fail",
      message,
    );
  } else if (
    input.oversizing.status ===
      "above-preferred" ||
    input.oversizing.status ===
      "below-preferred"
  ) {
    const message =
      `PV ILR of ${input.oversizing.ilr.toFixed(
        2,
      )} is outside the preferred design range.`;

    warnings.push(message);

    addCheck(
      checks,
      "Oversizing",
      "ILR",
      "warning",
      message,
    );
  } else if (
    input.oversizing.status ===
    "undersized"
  ) {
    const message =
      `PV ILR of ${input.oversizing.ilr.toFixed(
        2,
      )} indicates an undersized PV array.`;

    errors.push(message);

    addCheck(
      checks,
      "Oversizing",
      "ILR",
      "fail",
      message,
    );
  } else {
    addCheck(
      checks,
      "Oversizing",
      "ILR",
      "pass",
      `PV ILR of ${input.oversizing.ilr.toFixed(
        2,
      )} is within the acceptable design range.`,
    );
  }

  /* ======================================================================== */
  /* 7. PROTECTION                                                            */
  /* ======================================================================== */

  if (
    input.protection.status ===
    "fail"
  ) {
    const message =
      "Protection-system validation failed.";

    errors.push(message);

    addCheck(
      checks,
      "Protection",
      "Protection coordination",
      "fail",
      message,
    );
  } else if (
    input.protection.status ===
    "warning"
  ) {
    const message =
      "Protection-system validation returned a warning.";

    warnings.push(message);

    addCheck(
      checks,
      "Protection",
      "Protection coordination",
      "warning",
      message,
    );
  } else {
    addCheck(
      checks,
      "Protection",
      "Protection coordination",
      "pass",
      "Protection-system validation passed.",
    );
  }

  /* ======================================================================== */
  /* 8. CABLE                                                                 */
  /* ======================================================================== */

  if (
    !input.cable.protectionCoordinationPass
  ) {
    const message =
      "Cable protection coordination failed.";

    errors.push(message);

    addCheck(
      checks,
      "Cable",
      "Protection coordination",
      "fail",
      message,
    );
  } else if (
    input.cable.status ===
    "fail"
  ) {
    const message =
      "Cable sizing validation failed.";

    errors.push(message);

    addCheck(
      checks,
      "Cable",
      "Cable sizing",
      "fail",
      message,
    );
  } else if (
    input.cable.status ===
    "warning"
  ) {
    const message =
      "Cable sizing validation returned a warning.";

    warnings.push(message);

    addCheck(
      checks,
      "Cable",
      "Cable sizing",
      "warning",
      message,
    );
  } else {
    addCheck(
      checks,
      "Cable",
      "Cable sizing",
      "pass",
      "Cable sizing and protection coordination passed.",
    );
  }

  /* ======================================================================== */
  /* FINAL SYSTEM STATUS                                                      */
  /* ======================================================================== */

  let status: ValidationStatus;

  if (errors.length > 0) {
    status = "fail";
  } else if (warnings.length > 0) {
    status = "warning";
  } else {
    status = "pass";
  }

  /*
   * Critical rule:
   *
   * A design may only be finalized when there are
   * NO critical errors.
   *
   * Warnings do not automatically block finalization.
   */
  const canFinalize =
    errors.length === 0;

  return {
    status,
    canFinalize,
    warnings,
    errors,
    checks,
  };
}