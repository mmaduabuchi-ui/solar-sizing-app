// src/lib/calculations/oversizing.ts

export interface OversizingInput {
  requiredPVPowerW: number;
  actualPVPowerW: number;
  inverterRatedPowerW: number;
  minILR: number;
  maxILR: number;
}

export type OversizingStatus =
  | "undersized"
  | "below-preferred"
  | "acceptable"
  | "above-preferred"
  | "excessive";

export interface OversizingResult {
  requiredPVPowerW: number;
  actualPVPowerW: number;
  inverterRatedPowerW: number;
  ilr: number;
  oversizingPercent: number;
  status: OversizingStatus;
  warnings: string[];
  errors: string[];
}

function validateInput(input: OversizingInput): void {
  if (
    !Number.isFinite(input.requiredPVPowerW) ||
    input.requiredPVPowerW <= 0
  ) {
    throw new Error("Required PV power must be greater than 0 W.");
  }

  if (
    !Number.isFinite(input.actualPVPowerW) ||
    input.actualPVPowerW <= 0
  ) {
    throw new Error("Actual PV power must be greater than 0 W.");
  }

  if (
    !Number.isFinite(input.inverterRatedPowerW) ||
    input.inverterRatedPowerW <= 0
  ) {
    throw new Error("Inverter rated power must be greater than 0 W.");
  }

  if (
    !Number.isFinite(input.minILR) ||
    input.minILR <= 0
  ) {
    throw new Error("Minimum ILR must be greater than 0.");
  }

  if (
    !Number.isFinite(input.maxILR) ||
    input.maxILR <= 0
  ) {
    throw new Error("Maximum ILR must be greater than 0.");
  }

  if (input.maxILR < input.minILR) {
    throw new Error("Maximum ILR cannot be less than minimum ILR.");
  }
}

export function calculateOversizing(
  input: OversizingInput
): OversizingResult {
  validateInput(input);

  const {
    requiredPVPowerW,
    actualPVPowerW,
    inverterRatedPowerW,
    minILR,
    maxILR,
  } = input;

  const ilr = actualPVPowerW / inverterRatedPowerW;

  const oversizingPercent =
    ((actualPVPowerW / requiredPVPowerW) - 1) * 100;

  const warnings: string[] = [];
  const errors: string[] = [];

  let status: OversizingStatus;

  // ✅ Nigeria-aware thresholds
  const NIGERIA_IDEAL_MAX = 1.5; // Nigeria's cloudy regions benefit from higher ILR
  const CLIPPING_LIMIT = 1.8;    // Above this, clipping losses become significant

  if (actualPVPowerW < requiredPVPowerW) {
    status = "undersized";
    errors.push(
      `Actual PV power ${actualPVPowerW} W is below the required PV power of ${requiredPVPowerW} W.`
    );
  } else if (ilr < minILR) {
    status = "below-preferred";
    warnings.push(
      `PV array ILR of ${ilr.toFixed(2)} is below the preferred minimum ILR of ${minILR.toFixed(2)}.`
    );
  } else if (ilr <= maxILR) {
    // Standard ideal range (1.2-1.3)
    status = "acceptable";
  } else if (ilr <= NIGERIA_IDEAL_MAX) {
    // ✅ Nigeria-acceptable range (1.3-1.5)
    status = "acceptable";
    warnings.push(
      `PV array ILR of ${ilr.toFixed(2)} is above the standard preferred maximum of ${maxILR.toFixed(2)} but within Nigeria's optimal range (1.3-1.5) for cloudy regions.`
    );
  } else if (ilr <= CLIPPING_LIMIT) {
    // Above Nigeria's ideal — warning only
    status = "above-preferred";
    warnings.push(
      `PV array ILR of ${ilr.toFixed(2)} exceeds Nigeria's recommended maximum of ${NIGERIA_IDEAL_MAX.toFixed(2)}. This may cause clipping during peak sun hours.`
    );
  } else {
    // Excessive — error
    status = "excessive";
    errors.push(
      `PV array ILR of ${ilr.toFixed(2)} is excessively high and exceeds the allowable design range.`
    );
  }

  return {
    requiredPVPowerW,
    actualPVPowerW,
    inverterRatedPowerW,
    ilr,
    oversizingPercent,
    status,
    warnings,
    errors,
  };
}