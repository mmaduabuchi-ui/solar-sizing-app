// src/lib/calculations/chargeController.ts
import type {
  ChargeControllerType,
  InverterSpec,
  PanelSpec,
} from "@/types/solar";

export interface ChargeControllerSizingInput {
  controllerType: ChargeControllerType;

  systemVoltage: number;
  panelCount: number;
  panelsInSeries: number;
  selectedPanel: PanelSpec;

  selectedInverter?: InverterSpec;

  safetyFactor: number;
  vocSafetyFactor: number;
}

export interface ChargeControllerSizingResult {
  controllerType: ChargeControllerType;

  systemVoltage: number;

  panelCount: number;
  panelsInSeries: number;
  parallelStrings: number;

  arrayPowerW: number;

  stringVocV: number;
  stringVmpV: number;

  arrayIscA: number;
  arrayImpA: number;

  requiredControllerCurrentA: number;
  requiredControllerVoltageV: number;

  // ✅ Multiple MPPT controller support
  mpptCount?: number;
  totalMpptCurrentA?: number;
  currentPerMpptA?: number;

  inverterPVLimitPass?: boolean;
  inverterMPPTVoltagePass?: boolean;
  inverterMPPTCurrentPass?: boolean;
  inverterPVVocPass?: boolean;

  warnings: string[];
  errors: string[];
}

function validateInput(
  input: ChargeControllerSizingInput
): void {
  if (
    input.controllerType !== "pwm" &&
    input.controllerType !== "mppt" &&
    input.controllerType !== "built-in-mppt"
  ) {
    throw new Error(
      "Invalid charge controller type."
    );
  }

  if (
    !Number.isFinite(input.systemVoltage) ||
    input.systemVoltage <= 0
  ) {
    throw new Error(
      "System voltage must be greater than 0 V."
    );
  }

  if (
    !Number.isInteger(input.panelCount) ||
    input.panelCount <= 0
  ) {
    throw new Error(
      "Panel count must be a positive whole number."
    );
  }

  if (
    !Number.isInteger(input.panelsInSeries) ||
    input.panelsInSeries <= 0
  ) {
    throw new Error(
      "Panels in series must be a positive whole number."
    );
  }

  if (
    input.panelCount % input.panelsInSeries !== 0
  ) {
    throw new Error(
      "Panel count must divide evenly into the selected series configuration."
    );
  }

  if (!input.selectedPanel) {
    throw new Error(
      "Panel specification is required."
    );
  }

  const panelValues = [
    input.selectedPanel.pmaxW,
    input.selectedPanel.voc,
    input.selectedPanel.vmp,
    input.selectedPanel.isc,
    input.selectedPanel.imp,
  ];

  if (
    panelValues.some(
      (value) =>
        !Number.isFinite(value) ||
        value <= 0
    )
  ) {
    throw new Error(
      "Panel electrical specifications must be greater than 0."
    );
  }

  if (
    !Number.isFinite(input.safetyFactor) ||
    input.safetyFactor < 1
  ) {
    throw new Error(
      "Current safety factor must be at least 1.0."
    );
  }

  if (
    !Number.isFinite(input.vocSafetyFactor) ||
    input.vocSafetyFactor < 1
  ) {
    throw new Error(
      "Voc safety factor must be at least 1.0."
    );
  }

  if (
    input.controllerType === "built-in-mppt" &&
    !input.selectedInverter
  ) {
    throw new Error(
      "A selected inverter is required for a built-in MPPT controller."
    );
  }
}

export function calculateChargeControllerSizing(
  input: ChargeControllerSizingInput
): ChargeControllerSizingResult {
  validateInput(input);

  const panel = input.selectedPanel;

  /*
   * Number of parallel PV strings:
   *
   * Parallel strings =
   * Total number of panels / Panels in series
   */
  const parallelStrings =
    input.panelCount /
    input.panelsInSeries;

  /*
   * Total PV array power:
   *
   * Array Power =
   * Number of Panels × Panel Rated Power
   */
  const arrayPowerW =
    input.panelCount *
    panel.pmaxW;

  /*
   * PV string voltage:
   *
   * String Voc =
   * Panels in Series × Panel Voc
   *
   * String Vmp =
   * Panels in Series × Panel Vmp
   */
  const stringVocV =
    input.panelsInSeries *
    panel.voc;

  const stringVmpV =
    input.panelsInSeries *
    panel.vmp;

  /*
   * PV array current:
   *
   * Array Isc =
   * Parallel Strings × Panel Isc
   *
   * Array Imp =
   * Parallel Strings × Panel Imp
   */
  const arrayIscA =
    parallelStrings *
    panel.isc;

  const arrayImpA =
    parallelStrings *
    panel.imp;

  /*
   * Required controller current:
   *
   * Controller Current =
   * Array Power / Battery Voltage
   *
   * Then apply the selected safety factor.
   */
  const requiredControllerCurrentA =
    (arrayPowerW /
      input.systemVoltage) *
    input.safetyFactor;

  /*
   * Required controller voltage rating:
   *
   * Required Voltage =
   * String Voc × Voc Safety Factor
   */
  const requiredControllerVoltageV =
    stringVocV *
    input.vocSafetyFactor;

  const warnings: string[] = [];
  const errors: string[] = [];

  let inverterPVLimitPass:
    | boolean
    | undefined;

  let inverterMPPTVoltagePass:
    | boolean
    | undefined;

  let inverterMPPTCurrentPass:
    | boolean
    | undefined;

  let inverterPVVocPass:
    | boolean
    | undefined;

  // ✅ MPPT distribution info
  let mpptCount: number | undefined;
  let totalMpptCurrentA: number | undefined;
  let currentPerMpptA: number | undefined;

  /*
   * HYBRID INVERTER
   *
   * The charge controller is the inverter's
   * built-in MPPT.
   *
   * Therefore the PV array must satisfy:
   *
   * 1. Maximum PV input power
   * 2. MPPT operating voltage
   * 3. Total MPPT current (all trackers)
   * 4. Maximum PV open-circuit voltage
   */
  if (
    input.controllerType ===
    "built-in-mppt"
  ) {
    const inverter =
      input.selectedInverter!;

    // ✅ Get MPPT count (default 1 if not specified)
    mpptCount = inverter.mpptCount || 1;

    // ✅ Total MPPT current capacity across all trackers
    totalMpptCurrentA =
      inverter.mpptCurrent * mpptCount;

    // ✅ Current per MPPT tracker
    currentPerMpptA =
      (arrayIscA * input.safetyFactor) / mpptCount;

    inverterPVLimitPass =
      arrayPowerW <=
      inverter.maxPVInputW;

    inverterMPPTVoltagePass =
      stringVmpV >=
        inverter.mpptMinVoltage &&
      stringVmpV <=
        inverter.mpptMaxVoltage;

    // ✅ FIXED: Compare against TOTAL MPPT current
    inverterMPPTCurrentPass =
      arrayIscA *
        input.safetyFactor <=
      totalMpptCurrentA;

    inverterPVVocPass =
      stringVocV <=
      inverter.maxPVVoc;

    if (!inverterPVLimitPass) {
      errors.push(
        `PV array power ${arrayPowerW.toFixed(0)} W exceeds inverter maximum PV input of ${inverter.maxPVInputW} W.`
      );
    }

    if (!inverterMPPTVoltagePass) {
      errors.push(
        `PV string Vmp ${stringVmpV.toFixed(1)} V is outside the inverter MPPT operating range of ${inverter.mpptMinVoltage}-${inverter.mpptMaxVoltage} V.`
      );
    }

    if (!inverterMPPTCurrentPass) {
      errors.push(
        `PV array Isc with safety factor (${(arrayIscA * input.safetyFactor).toFixed(1)} A) exceeds total inverter MPPT current capacity (${totalMpptCurrentA} A = ${mpptCount} × ${inverter.mpptCurrent} A).`
      );
    }

    if (!inverterPVVocPass) {
      errors.push(
        `PV string Voc ${stringVocV.toFixed(1)} V exceeds the inverter maximum PV Voc of ${inverter.maxPVVoc} V.`
      );
    }

    // ✅ Add MPPT distribution warning if uneven
    if (
      inverterMPPTCurrentPass &&
      mpptCount > 1 &&
      parallelStrings % mpptCount !== 0
    ) {
      warnings.push(
        `${parallelStrings} strings cannot be evenly distributed across ${mpptCount} MPPT trackers (${(parallelStrings / mpptCount).toFixed(1)} per tracker). Asymmetric distribution is allowed.`
      );
    }

    // ✅ Info: Show current per MPPT
    if (inverterMPPTCurrentPass && currentPerMpptA) {
      warnings.push(
        `Current per MPPT tracker: ${currentPerMpptA.toFixed(1)} A (limit: ${inverter.mpptCurrent} A per tracker).`
      );
    }
  }

  /*
   * EXTERNAL MPPT CONTROLLER
   *
   * MPPT is generally appropriate when PV
   * operating voltage is sufficiently above
   * the battery-bank voltage.
   */
  if (
    input.controllerType === "mppt"
  ) {
    if (
      stringVmpV <=
      input.systemVoltage
    ) {
      warnings.push(
        "PV string Vmp is not significantly higher than the battery-bank voltage. Verify MPPT suitability."
      );
    }
  }

  /*
   * PWM CONTROLLER
   */
  if (
    input.controllerType === "pwm"
  ) {
    if (
      stringVmpV >
      input.systemVoltage * 1.5
    ) {
      warnings.push(
        "PV string Vmp is substantially higher than the battery-bank voltage. MPPT should normally be considered instead of PWM."
      );
    }
  }

  return {
    controllerType:
      input.controllerType,

    systemVoltage:
      input.systemVoltage,

    panelCount:
      input.panelCount,

    panelsInSeries:
      input.panelsInSeries,

    parallelStrings,

    arrayPowerW,

    stringVocV,
    stringVmpV,

    arrayIscA,
    arrayImpA,

    requiredControllerCurrentA,
    requiredControllerVoltageV,

    // ✅ MPPT distribution info
    mpptCount,
    totalMpptCurrentA,
    currentPerMpptA,

    inverterPVLimitPass,
    inverterMPPTVoltagePass,
    inverterMPPTCurrentPass,
    inverterPVVocPass,

    warnings,
    errors,
  };
}