import type { ValidationStatus } from "@/types/solar";

export interface CableSizingInput {
  currentA: number;
  systemVoltageV: number;
  oneWayLengthM: number;
  resistivityOhmMm2PerM: number;
  maximumVoltageDropPercent: number;

  cableSizesMm2: number[];
  cableAmpacitiesA: Record<string, number>;

  protectionDeviceA?: number;
}

export interface CableSizingResult {
  currentA: number;
  systemVoltageV: number;
  oneWayLengthM: number;
  totalCircuitLengthM: number;

  resistivityOhmMm2PerM: number;
  maximumVoltageDropPercent: number;
  maximumVoltageDropV: number;

  voltageDropV: number;
  voltageDropPercent: number;

  minimumCableSizeByVoltageDropMm2: number | null;
  minimumCableSizeByAmpacityMm2: number | null;
  recommendedCableSizeMm2: number | null;

  recommendedCableAmpacityA: number | null;
  protectionDeviceA: number | null;
  protectionCoordinationPass: boolean;

  warnings: string[];
  errors: string[];
  status: ValidationStatus;
}

/**
 * Validate cable sizing inputs.
 */
function validateInput(input: CableSizingInput): void {
  if (!Number.isFinite(input.currentA) || input.currentA <= 0) {
    throw new Error("Current must be greater than 0 A.");
  }

  if (
    !Number.isFinite(input.systemVoltageV) ||
    input.systemVoltageV <= 0
  ) {
    throw new Error("System voltage must be greater than 0 V.");
  }

  if (
    !Number.isFinite(input.oneWayLengthM) ||
    input.oneWayLengthM <= 0
  ) {
    throw new Error("Cable length must be greater than 0 m.");
  }

  if (
    !Number.isFinite(input.resistivityOhmMm2PerM) ||
    input.resistivityOhmMm2PerM <= 0
  ) {
    throw new Error(
      "Conductor resistivity must be greater than 0.",
    );
  }

  if (
    !Number.isFinite(input.maximumVoltageDropPercent) ||
    input.maximumVoltageDropPercent <= 0 ||
    input.maximumVoltageDropPercent > 100
  ) {
    throw new Error(
      "Maximum voltage drop percentage must be greater than 0 and no greater than 100.",
    );
  }

  if (
    !Array.isArray(input.cableSizesMm2) ||
    input.cableSizesMm2.length === 0
  ) {
    throw new Error(
      "At least one cable size is required.",
    );
  }

  for (const size of input.cableSizesMm2) {
    if (!Number.isFinite(size) || size <= 0) {
      throw new Error(
        "Every cable size must be greater than 0 mm².",
      );
    }
  }

  for (const size of input.cableSizesMm2) {
    const ampacity = input.cableAmpacitiesA[String(size)];

    if (
      ampacity === undefined ||
      !Number.isFinite(ampacity) ||
      ampacity <= 0
    ) {
      throw new Error(
        `A valid ampacity is required for cable size ${size} mm².`,
      );
    }
  }

  if (
    input.protectionDeviceA !== undefined &&
    (!Number.isFinite(input.protectionDeviceA) ||
      input.protectionDeviceA <= 0)
  ) {
    throw new Error(
      "Protection device rating must be greater than 0 A.",
    );
  }
}

/**
 * Calculate the conductor area required to satisfy
 * the maximum permitted voltage drop.
 *
 * Vd = 2 × L × I × ρ / A
 *
 * Therefore:
 *
 * A = 2 × L × I × ρ / Vd
 */
function calculateRequiredAreaForVoltageDrop(
  currentA: number,
  oneWayLengthM: number,
  resistivityOhmMm2PerM: number,
  maximumVoltageDropV: number,
): number {
  return (
    (2 *
      oneWayLengthM *
      currentA *
      resistivityOhmMm2PerM) /
    maximumVoltageDropV
  );
}

/**
 * Select the smallest available cable size
 * satisfying the voltage-drop requirement.
 */
function selectCableByVoltageDrop(
  requiredAreaMm2: number,
  cableSizesMm2: number[],
): number | null {
  const sortedSizes = [...cableSizesMm2].sort(
    (a, b) => a - b,
  );

  return (
    sortedSizes.find(
      (size) => size >= requiredAreaMm2,
    ) ?? null
  );
}

/**
 * Select the smallest available cable size
 * whose ampacity can carry the design current.
 */
function selectCableByAmpacity(
  currentA: number,
  cableSizesMm2: number[],
  cableAmpacitiesA: Record<string, number>,
): number | null {
  const sortedSizes = [...cableSizesMm2].sort(
    (a, b) => a - b,
  );

  return (
    sortedSizes.find(
      (size) =>
        cableAmpacitiesA[String(size)] >= currentA,
    ) ?? null
  );
}

/**
 * Both voltage-drop and ampacity requirements
 * must be satisfied.
 *
 * Therefore the final cable is the larger
 * of the two required cable sizes.
 */
function selectFinalCableSize(
  voltageDropSizeMm2: number | null,
  ampacitySizeMm2: number | null,
): number | null {
  if (
    voltageDropSizeMm2 === null ||
    ampacitySizeMm2 === null
  ) {
    return null;
  }

  return Math.max(
    voltageDropSizeMm2,
    ampacitySizeMm2,
  );
}

/**
 * Main cable sizing calculation engine.
 */
export function calculateCableSizing(
  input: CableSizingInput,
): CableSizingResult {
  validateInput(input);

  const {
    currentA,
    systemVoltageV,
    oneWayLengthM,
    resistivityOhmMm2PerM,
    maximumVoltageDropPercent,
    cableSizesMm2,
    cableAmpacitiesA,
    protectionDeviceA,
  } = input;

  /*
   * Two-conductor circuit:
   *
   * outgoing conductor + return conductor
   *
   * Total circuit length = 2 × one-way length
   */
  const totalCircuitLengthM =
    2 * oneWayLengthM;

  /*
   * Convert allowable voltage-drop percentage
   * into volts.
   */
  const maximumVoltageDropV =
    systemVoltageV *
    (maximumVoltageDropPercent / 100);

  /*
   * Theoretical conductor area required
   * based on voltage drop.
   */
  const requiredAreaMm2 =
    calculateRequiredAreaForVoltageDrop(
      currentA,
      oneWayLengthM,
      resistivityOhmMm2PerM,
      maximumVoltageDropV,
    );

  /*
   * Smallest standard cable satisfying
   * voltage-drop requirement.
   */
  const minimumCableSizeByVoltageDropMm2 =
    selectCableByVoltageDrop(
      requiredAreaMm2,
      cableSizesMm2,
    );

  /*
   * Smallest standard cable satisfying
   * ampacity requirement.
   */
  const minimumCableSizeByAmpacityMm2 =
    selectCableByAmpacity(
      currentA,
      cableSizesMm2,
      cableAmpacitiesA,
    );

  /*
   * Final cable must satisfy BOTH requirements.
   */
  const recommendedCableSizeMm2 =
    selectFinalCableSize(
      minimumCableSizeByVoltageDropMm2,
      minimumCableSizeByAmpacityMm2,
    );

  /*
   * Get ampacity of the final selected cable.
   */
  const recommendedCableAmpacityA =
    recommendedCableSizeMm2 !== null
      ? cableAmpacitiesA[
          String(recommendedCableSizeMm2)
        ]
      : null;

  /*
   * Normalize optional protection-device value.
   *
   * This converts undefined → null so the result
   * always conforms to CableSizingResult.
   */
  const normalizedProtectionDeviceA =
    protectionDeviceA ?? null;

  /*
   * Protection coordination.
   *
   * The cable ampacity must be at least equal
   * to the protection-device rating.
   */
  let protectionCoordinationPass = true;

  if (
    normalizedProtectionDeviceA !== null &&
    recommendedCableAmpacityA !== null
  ) {
    protectionCoordinationPass =
      recommendedCableAmpacityA >=
      normalizedProtectionDeviceA;
  }

  const warnings: string[] = [];
  const errors: string[] = [];

  /*
   * Identify which engineering constraint
   * determines the final cable size.
   */
  if (
    minimumCableSizeByVoltageDropMm2 !== null &&
    minimumCableSizeByAmpacityMm2 !== null &&
    minimumCableSizeByVoltageDropMm2 !==
      minimumCableSizeByAmpacityMm2
  ) {
    const governingRequirement =
      minimumCableSizeByVoltageDropMm2 >
      minimumCableSizeByAmpacityMm2
        ? "voltage drop"
        : "ampacity";

    warnings.push(
      `Cable selection is governed by ${governingRequirement}.`,
    );
  }

  /*
   * No available cable can satisfy both
   * requirements.
   */
  if (recommendedCableSizeMm2 === null) {
    errors.push(
      "No available cable size satisfies both voltage-drop and ampacity requirements.",
    );
  }

  /*
   * Protection coordination failure.
   */
  if (
    normalizedProtectionDeviceA !== null &&
    recommendedCableAmpacityA !== null &&
    !protectionCoordinationPass
  ) {
    errors.push(
      `Recommended cable ampacity of ${recommendedCableAmpacityA} A is below the protection device rating of ${normalizedProtectionDeviceA} A.`,
    );
  }

  /*
   * Calculate actual voltage drop using
   * the recommended cable.
   */
  let voltageDropV = 0;
  let voltageDropPercent = 0;

  if (recommendedCableSizeMm2 !== null) {
    voltageDropV =
      (2 *
        oneWayLengthM *
        currentA *
        resistivityOhmMm2PerM) /
      recommendedCableSizeMm2;

    voltageDropPercent =
      (voltageDropV / systemVoltageV) * 100;

    /*
     * Final voltage-drop verification.
     */
    if (
      voltageDropPercent >
      maximumVoltageDropPercent
    ) {
      errors.push(
        `Recommended cable produces ${voltageDropPercent.toFixed(
          2,
        )}% voltage drop, exceeding the maximum permitted ${maximumVoltageDropPercent.toFixed(
          2,
        )}%.`,
      );
    }
  }

  /*
   * Determine final validation status.
   */
  let status: ValidationStatus;

  if (errors.length > 0) {
    status = "fail";
  } else if (warnings.length > 0) {
    status = "warning";
  } else {
    status = "pass";
  }

  return {
    currentA,
    systemVoltageV,
    oneWayLengthM,
    totalCircuitLengthM,

    resistivityOhmMm2PerM,
    maximumVoltageDropPercent,
    maximumVoltageDropV,

    voltageDropV,
    voltageDropPercent,

    minimumCableSizeByVoltageDropMm2,
    minimumCableSizeByAmpacityMm2,
    recommendedCableSizeMm2,

    recommendedCableAmpacityA,
    protectionDeviceA: normalizedProtectionDeviceA,
    protectionCoordinationPass,

    warnings,
    errors,
    status,
  };
}