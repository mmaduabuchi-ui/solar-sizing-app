import type { ValidationStatus } from "@/types/solar";

export interface ProtectionSizingInput {
  // AC side
  inverterRatedVA: number;
  acVoltage: number;
  acProtectionFactor: number;

  // Battery side
  inverterPowerW: number;
  batteryVoltage: number;
  inverterEfficiency: number;
  batteryProtectionFactor: number;

  // PV side
  panelIscA: number;
  parallelStrings: number;
  pvProtectionFactor: number;

  // Available standard breaker ratings
  standardBreakerRatingsA: number[];

  // Optional equipment limitations
  acBreakerMaximumA?: number;
  batteryBreakerMaximumA?: number;
  pvBreakerMaximumA?: number;
}

export interface ProtectionCircuitResult {
  requiredCurrentA: number;
  protectedCurrentA: number;
  recommendedBreakerA: number | null;
  warnings: string[];
  errors: string[];
}

export interface ProtectionSizingResult {
  ac: ProtectionCircuitResult;
  battery: ProtectionCircuitResult;
  pv: ProtectionCircuitResult;
  status: ValidationStatus;
  warnings: string[];
  errors: string[];
}

function validatePositive(
  value: number,
  fieldName: string,
): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} must be greater than 0.`);
  }
}

function validateFactor(
  value: number,
  fieldName: string,
): void {
  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`${fieldName} must be at least 1.0.`);
  }
}

function validateInput(
  input: ProtectionSizingInput,
): void {
  validatePositive(input.inverterRatedVA, "Inverter rated VA");
  validatePositive(input.acVoltage, "AC voltage");

  validateFactor(
    input.acProtectionFactor,
    "AC protection factor",
  );

  validatePositive(input.inverterPowerW, "Inverter power");
  validatePositive(input.batteryVoltage, "Battery voltage");

  if (
    !Number.isFinite(input.inverterEfficiency) ||
    input.inverterEfficiency <= 0 ||
    input.inverterEfficiency > 1
  ) {
    throw new Error(
      "Inverter efficiency must be greater than 0 and no greater than 1.",
    );
  }

  validateFactor(
    input.batteryProtectionFactor,
    "Battery protection factor",
  );

  validatePositive(input.panelIscA, "Panel Isc");
  validatePositive(
    input.parallelStrings,
    "Parallel strings",
  );

  if (!Number.isInteger(input.parallelStrings)) {
    throw new Error(
      "Parallel strings must be a whole number.",
    );
  }

  validateFactor(
    input.pvProtectionFactor,
    "PV protection factor",
  );

  if (
    !Array.isArray(input.standardBreakerRatingsA) ||
    input.standardBreakerRatingsA.length === 0
  ) {
    throw new Error(
      "At least one standard breaker rating is required.",
    );
  }

  for (const rating of input.standardBreakerRatingsA) {
    validatePositive(rating, "Breaker rating");
  }

  if (
    input.acBreakerMaximumA !== undefined
  ) {
    validatePositive(
      input.acBreakerMaximumA,
      "AC breaker maximum",
    );
  }

  if (
    input.batteryBreakerMaximumA !== undefined
  ) {
    validatePositive(
      input.batteryBreakerMaximumA,
      "Battery breaker maximum",
    );
  }

  if (
    input.pvBreakerMaximumA !== undefined
  ) {
    validatePositive(
      input.pvBreakerMaximumA,
      "PV breaker maximum",
    );
  }
}

function selectStandardBreaker(
  requiredCurrentA: number,
  ratings: number[],
): number | null {
  const sortedRatings = [...ratings].sort(
    (a, b) => a - b,
  );

  return (
    sortedRatings.find(
      (rating) => rating >= requiredCurrentA,
    ) ?? null
  );
}

function createCircuitResult(
  requiredCurrentA: number,
  protectionFactor: number,
  ratings: number[],
  maximumBreakerA: number | undefined,
  circuitName: string,
): ProtectionCircuitResult {
  const protectedCurrentA =
    requiredCurrentA * protectionFactor;

  const recommendedBreakerA =
    selectStandardBreaker(
      protectedCurrentA,
      ratings,
    );

  const warnings: string[] = [];
  const errors: string[] = [];

  if (recommendedBreakerA === null) {
    errors.push(
      `No available standard breaker rating can protect the calculated ${circuitName} current of ${protectedCurrentA.toFixed(2)} A.`,
    );
  }

  if (
    maximumBreakerA !== undefined &&
    recommendedBreakerA !== null &&
    recommendedBreakerA > maximumBreakerA
  ) {
    warnings.push(
      `Recommended ${circuitName} breaker of ${recommendedBreakerA} A exceeds the supplied equipment maximum of ${maximumBreakerA} A.`,
    );
  }

  return {
    requiredCurrentA,
    protectedCurrentA,
    recommendedBreakerA,
    warnings,
    errors,
  };
}

export function calculateProtection(
  input: ProtectionSizingInput,
): ProtectionSizingResult {
  validateInput(input);

  /*
   * AC inverter output current
   *
   * I = VA / V
   */
  const acRequiredCurrentA =
    input.inverterRatedVA / input.acVoltage;

  /*
   * Battery current
   *
   * I = P / (V × efficiency)
   */
  const batteryRequiredCurrentA =
    input.inverterPowerW /
    (input.batteryVoltage *
      input.inverterEfficiency);

  /*
   * PV array short-circuit current
   *
   * Array Isc = panel Isc × parallel strings
   */
  const pvRequiredCurrentA =
    input.panelIscA *
    input.parallelStrings;

  const ac = createCircuitResult(
    acRequiredCurrentA,
    input.acProtectionFactor,
    input.standardBreakerRatingsA,
    input.acBreakerMaximumA,
    "AC",
  );

  const battery = createCircuitResult(
    batteryRequiredCurrentA,
    input.batteryProtectionFactor,
    input.standardBreakerRatingsA,
    input.batteryBreakerMaximumA,
    "battery",
  );

  const pv = createCircuitResult(
    pvRequiredCurrentA,
    input.pvProtectionFactor,
    input.standardBreakerRatingsA,
    input.pvBreakerMaximumA,
    "PV",
  );

  const warnings = [
    ...ac.warnings,
    ...battery.warnings,
    ...pv.warnings,
  ];

  const errors = [
    ...ac.errors,
    ...battery.errors,
    ...pv.errors,
  ];

  let status: ValidationStatus;

  if (errors.length > 0) {
    status = "fail";
  } else if (warnings.length > 0) {
    status = "warning";
  } else {
    status = "pass";
  }

  return {
    ac,
    battery,
    pv,
    status,
    warnings,
    errors,
  };
}