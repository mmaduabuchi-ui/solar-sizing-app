import type {
  InverterSpec,
  InverterType,
  PanelSpec,
} from "@/types/solar";

export interface InverterSelectionInput {
  inverter: InverterSpec;
  inverterType: InverterType;
  requiredInverterKVA: number;
  requiredInverterWatts: number;
  startingSurgeW: number;
  surgeDataAvailable: boolean;
  requiredPVPowerW: number;
  panel?: PanelSpec;
  numberOfPanels?: number;
}

export interface InverterSelectionResult {
  status: "pass" | "warning" | "fail";

  inverter: InverterSpec;

  requiredInverterKVA: number;
  selectedInverterKVA: number;

  requiredInverterWatts: number;
  selectedInverterWatts: number;

  startingSurgeW: number;
  surgeDataAvailable: boolean;

  requiredPVPowerW: number;
  selectedMaxPVInputW: number;

  warnings: string[];
  errors: string[];

  checks: {
    inverterCapacity: boolean;
    pvPower: boolean;
    systemVoltage: boolean;
    surge: boolean;
    mpptVoltage: boolean;
    mpptCurrent: boolean;
  };
}

function validateInput(
  input: InverterSelectionInput
): void {
  if (!input.inverter) {
    throw new Error(
      "An inverter specification is required."
    );
  }

  if (
    !Number.isFinite(input.requiredInverterKVA) ||
    input.requiredInverterKVA <= 0
  ) {
    throw new Error(
      "Required inverter capacity must be greater than 0 kVA."
    );
  }

  if (
    !Number.isFinite(input.requiredInverterWatts) ||
    input.requiredInverterWatts <= 0
  ) {
    throw new Error(
      "Required inverter power must be greater than 0 W."
    );
  }

  if (
    !Number.isFinite(input.startingSurgeW) ||
    input.startingSurgeW < 0
  ) {
    throw new Error(
      "Starting surge power cannot be negative."
    );
  }

  if (
    !Number.isFinite(input.requiredPVPowerW) ||
    input.requiredPVPowerW <= 0
  ) {
    throw new Error(
      "Required PV power must be greater than 0 W."
    );
  }

  const inverter = input.inverter;

  if (!inverter.brand.trim()) {
    throw new Error(
      "Inverter brand is required."
    );
  }

  if (!inverter.model.trim()) {
    throw new Error(
      "Inverter model is required."
    );
  }

  if (
    !Number.isFinite(inverter.ratedKVA) ||
    inverter.ratedKVA <= 0
  ) {
    throw new Error(
      "Inverter rated kVA must be greater than 0."
    );
  }

  if (
    !Number.isFinite(inverter.ratedWatts) ||
    inverter.ratedWatts <= 0
  ) {
    throw new Error(
      "Inverter rated watts must be greater than 0 W."
    );
  }

  if (
    !Number.isFinite(inverter.systemVoltage) ||
    inverter.systemVoltage <= 0
  ) {
    throw new Error(
      "Inverter system voltage must be greater than 0 V."
    );
  }

  if (
    !Number.isFinite(inverter.maxPVInputW) ||
    inverter.maxPVInputW <= 0
  ) {
    throw new Error(
      "Maximum PV input power must be greater than 0 W."
    );
  }

  if (
    !Number.isFinite(inverter.maxPVVoc) ||
    inverter.maxPVVoc <= 0
  ) {
    throw new Error(
      "Maximum PV Voc must be greater than 0 V."
    );
  }

  if (
    !Number.isFinite(inverter.mpptMinVoltage) ||
    inverter.mpptMinVoltage < 0
  ) {
    throw new Error(
      "MPPT minimum voltage cannot be negative."
    );
  }

  if (
    !Number.isFinite(inverter.mpptMaxVoltage) ||
    inverter.mpptMaxVoltage <= inverter.mpptMinVoltage
  ) {
    throw new Error(
      "MPPT maximum voltage must be greater than MPPT minimum voltage."
    );
  }

  if (
    !Number.isFinite(inverter.mpptCurrent) ||
    inverter.mpptCurrent <= 0
  ) {
    throw new Error(
      "MPPT current must be greater than 0 A."
    );
  }
}

export function calculateInverterSelection(
  input: InverterSelectionInput
): InverterSelectionResult {
  validateInput(input);

  const inverter = input.inverter;

  const warnings: string[] = [];
  const errors: string[] = [];

  /*
   * 1. Inverter capacity check
   */
  const inverterCapacityPass =
    inverter.ratedKVA >= input.requiredInverterKVA &&
    inverter.ratedWatts >= input.requiredInverterWatts;

  if (!inverterCapacityPass) {
    errors.push(
      `Selected inverter capacity (${inverter.ratedKVA.toFixed(
        2
      )} kVA / ${inverter.ratedWatts.toFixed(
        0
      )} W) is below the calculated requirement (${input.requiredInverterKVA.toFixed(
        2
      )} kVA / ${input.requiredInverterWatts.toFixed(
        0
      )} W).`
    );
  }

  /*
   * 2. Maximum PV input power check
   */
  const pvPowerPass =
    inverter.maxPVInputW >= input.requiredPVPowerW;

  if (!pvPowerPass) {
    errors.push(
      `Selected inverter maximum PV input (${inverter.maxPVInputW.toFixed(
        0
      )} W) is below the required PV array power (${input.requiredPVPowerW.toFixed(
        0
      )} W).`
    );
  }

  /*
   * 3. Starting surge check
   *
   * We do not automatically assume that the inverter
   * surge rating equals its continuous rating.
   *
   * The actual manufacturer surge specification must
   * be verified before final approval.
   */
  const surgePass = true;

  if (!input.surgeDataAvailable) {
    warnings.push(
      "Confirmed starting-surge data is not available. Verify appliance manufacturer or measured starting surge before final design approval."
    );
  } else {
    warnings.push(
      "Verify the selected inverter manufacturer's rated surge capability against the calculated starting surge."
    );
  }

  /*
   * 4. System voltage validation
   */
  const systemVoltagePass =
    Number.isFinite(inverter.systemVoltage) &&
    inverter.systemVoltage > 0;

  if (!systemVoltagePass) {
    errors.push(
      "Selected inverter has an invalid system voltage."
    );
  }

  /*
   * 5. Initial MPPT voltage validation
   *
   * Complete string-voltage validation is intentionally
   * performed after panel selection and arrangement.
   */
  let mpptVoltagePass = true;

  if (input.panel) {
    const panel = input.panel;

    if (panel.voc > inverter.maxPVVoc) {
      mpptVoltagePass = false;

      errors.push(
        `Panel Voc (${panel.voc.toFixed(
          2
        )} V) exceeds the inverter maximum PV Voc (${inverter.maxPVVoc.toFixed(
          2
        )} V).`
      );
    }

    if (
      panel.vmp < inverter.mpptMinVoltage &&
      input.numberOfPanels === 1
    ) {
      mpptVoltagePass = false;

      errors.push(
        `Panel Vmp (${panel.vmp.toFixed(
          2
        )} V) is below the inverter MPPT minimum voltage (${inverter.mpptMinVoltage.toFixed(
          2
        )} V).`
      );
    }
  }

  /*
   * 6. MPPT current validation
   *
   * Final PV array current depends on the series/
   * parallel arrangement, which is calculated later.
   */
  const mpptCurrentPass = true;

  if (input.panel) {
    warnings.push(
      "Final MPPT current compatibility will be verified after the panel series/parallel arrangement is calculated."
    );
  }

  /*
   * Overall status
   */
  const status =
    errors.length > 0
      ? "fail"
      : warnings.length > 0
        ? "warning"
        : "pass";

  return {
    status,

    inverter,

    requiredInverterKVA:
      input.requiredInverterKVA,

    selectedInverterKVA:
      inverter.ratedKVA,

    requiredInverterWatts:
      input.requiredInverterWatts,

    selectedInverterWatts:
      inverter.ratedWatts,

    startingSurgeW:
      input.startingSurgeW,

    surgeDataAvailable:
      input.surgeDataAvailable,

    requiredPVPowerW:
      input.requiredPVPowerW,

    selectedMaxPVInputW:
      inverter.maxPVInputW,

    warnings,
    errors,

    checks: {
      inverterCapacity:
        inverterCapacityPass,

      pvPower:
        pvPowerPass,

      systemVoltage:
        systemVoltagePass,

      surge:
        surgePass,

      mpptVoltage:
        mpptVoltagePass,

      mpptCurrent:
        mpptCurrentPass,
    },
  };
}