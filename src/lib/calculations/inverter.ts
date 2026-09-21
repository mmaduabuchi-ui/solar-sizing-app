import type { LoadAuditResult } from "./loadAudit";

export interface InverterSizingInput {
  loadAudit: LoadAuditResult;

  /**
   * Continuous-load design margin.
   * Example: 1.25 = 25% additional operating headroom.
   *
   * This is NOT the inverter surge rating.
   */
  workingMargin: number;

  /**
   * Load power factor used to convert watts to apparent power.
   */
  powerFactor: number;
}

export interface InverterSizingResult {
  totalRunningPowerW: number;

  /**
   * Continuous operating requirement after design margin.
   */
  workingLoadW: number;

  /**
   * Apparent power required for the continuous load.
   */
  requiredVABasedOnRunningLoad: number;

  /**
   * Continuous inverter requirement in kVA.
   */
  requiredKVA: number;

  /**
   * Starting/surge requirement reported by the load audit.
   *
   * This is NOT increased by the 25% working margin.
   */
  startingSurgeW: number;

  /**
   * Indicates whether a genuine surge value is available.
   *
   * If surge was not supplied by the load data, the load-audit
   * layer may use the running power as a placeholder. Therefore
   * this flag prevents the application from treating that value
   * as a confirmed manufacturer/measured starting surge.
   */
  surgeDataAvailable: boolean;

  powerFactor: number;
  workingMargin: number;
}

function validateInput(input: InverterSizingInput): void {
  if (!input.loadAudit) {
    throw new Error("Load audit result is required.");
  }

  if (
    !Number.isFinite(input.loadAudit.totalRunningPowerW) ||
    input.loadAudit.totalRunningPowerW <= 0
  ) {
    throw new Error(
      "Total running power must be greater than 0 W."
    );
  }

  if (
    !Number.isFinite(input.loadAudit.totalSurgePowerW) ||
    input.loadAudit.totalSurgePowerW < 0
  ) {
    throw new Error(
      "Total surge power cannot be negative."
    );
  }

  if (
    !Number.isFinite(input.workingMargin) ||
    input.workingMargin < 1
  ) {
    throw new Error(
      "Working margin must be at least 1.0."
    );
  }

  if (
    !Number.isFinite(input.powerFactor) ||
    input.powerFactor <= 0 ||
    input.powerFactor > 1
  ) {
    throw new Error(
      "Power factor must be greater than 0 and no greater than 1."
    );
  }
}

export function calculateInverterSizing(
  input: InverterSizingInput
): InverterSizingResult {
  validateInput(input);

  const totalRunningPowerW =
    input.loadAudit.totalRunningPowerW;

  /*
   * 25% design margin is applied ONLY to the continuous
   * running load.
   *
   * It must not be interpreted as inverter surge capacity.
   */
  const workingLoadW =
    totalRunningPowerW * input.workingMargin;

  /*
   * Apparent power requirement:
   *
   * VA = W / Power Factor
   */
  const requiredVABasedOnRunningLoad =
    workingLoadW / input.powerFactor;

  const requiredKVA =
    requiredVABasedOnRunningLoad / 1000;

  /*
   * Starting/surge requirement remains independent of
   * the continuous-load design margin.
   */
  const startingSurgeW =
    input.loadAudit.totalSurgePowerW;

  /*
   * A confirmed surge value must be greater than the
   * normal running load.
   */
  const surgeDataAvailable =
    startingSurgeW > totalRunningPowerW;

  return {
    totalRunningPowerW,
    workingLoadW,
    requiredVABasedOnRunningLoad,
    requiredKVA,
    startingSurgeW,
    surgeDataAvailable,
    powerFactor: input.powerFactor,
    workingMargin: input.workingMargin,
  };
}