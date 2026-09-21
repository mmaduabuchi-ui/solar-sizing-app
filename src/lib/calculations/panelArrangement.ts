// src/lib/calculations/panelArrangement.ts
import type {
  InverterSpec,
  PanelSpec,
} from "@/types/solar";

export interface PanelArrangementInput {
  requiredPVPowerW: number;
  selectedPanel: PanelSpec;
  inverter?: InverterSpec;
  maxPanelCount?: number;
  currentSafetyFactor: number;
}

export interface PanelArrangementCandidate {
  panelCount: number;
  panelsInSeries: number;
  parallelStrings: number;
  arrayPowerW: number;
  oversizingRatio: number;
  oversizingPercent: number;
  stringVocV: number;
  stringVmpV: number;
  arrayIscA: number;
  arrayImpA: number;
  valid: boolean;
  reasons: string[];
  // ✅ NEW: MPPT distribution
  mpptCount?: number;
  stringsPerMppt?: number;
  currentPerMppt?: number;
}

export interface PanelArrangementResult {
  requiredPVPowerW: number;
  minimumPanelCount: number;
  selectedPanel: PanelSpec;
  selectedArrangement: PanelArrangementCandidate | undefined;
  candidates: PanelArrangementCandidate[];
  status: "valid" | "no-valid-arrangement";
  warnings: string[];
  errors: string[];
}

function validateInput(input: PanelArrangementInput): void {
  if (
    !Number.isFinite(input.requiredPVPowerW) ||
    input.requiredPVPowerW <= 0
  ) {
    throw new Error("Required PV power must be greater than 0 W.");
  }

  if (!input.selectedPanel) {
    throw new Error("Selected panel specification is required.");
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
      (value) => !Number.isFinite(value) || value <= 0
    )
  ) {
    throw new Error(
      "Panel electrical specifications must be greater than 0."
    );
  }

  if (
    !Number.isFinite(input.currentSafetyFactor) ||
    input.currentSafetyFactor < 1
  ) {
    throw new Error(
      "Current safety factor must be at least 1.0."
    );
  }

  if (
    input.maxPanelCount !== undefined &&
    (!Number.isInteger(input.maxPanelCount) ||
      input.maxPanelCount <= 0)
  ) {
    throw new Error(
      "Maximum panel count must be a positive whole number."
    );
  }

  if (input.inverter) {
    const inverterValues = [
      input.inverter.ratedKVA,
      input.inverter.ratedWatts,
      input.inverter.systemVoltage,
      input.inverter.maxPVInputW,
      input.inverter.maxPVVoc,
      input.inverter.mpptMinVoltage,
      input.inverter.mpptMaxVoltage,
      input.inverter.mpptCurrent,
    ];

    if (
      inverterValues.some(
        (value) => !Number.isFinite(value) || value <= 0
      )
    ) {
      throw new Error(
        "Inverter electrical specifications must be greater than 0."
      );
    }

    if (
      input.inverter.mpptMinVoltage >
      input.inverter.mpptMaxVoltage
    ) {
      throw new Error(
        "Inverter MPPT minimum voltage cannot exceed maximum voltage."
      );
    }
  }
}

function evaluateCandidate(
  panelCount: number,
  panelsInSeries: number,
  input: PanelArrangementInput
): PanelArrangementCandidate {
  const panel = input.selectedPanel;
  const inverter = input.inverter;

  const parallelStrings = panelCount / panelsInSeries;

  const arrayPowerW = panelCount * panel.pmaxW;

  const oversizingRatio = arrayPowerW / input.requiredPVPowerW;

  const oversizingPercent = (oversizingRatio - 1) * 100;

  const stringVocV = panelsInSeries * panel.voc;

  const stringVmpV = panelsInSeries * panel.vmp;

  const arrayIscA = parallelStrings * panel.isc;

  const arrayImpA = parallelStrings * panel.imp;

  const reasons: string[] = [];

  let valid = true;

  // ✅ NEW: MPPT distribution
  let mpptCount = 1;
  let stringsPerMppt = parallelStrings;
  let currentPerMppt = arrayIscA;

  if (inverter) {
    // Get MPPT count (default 1 if not specified)
    mpptCount = inverter.mpptCount || 1;

    // Calculate distribution
    stringsPerMppt = parallelStrings / mpptCount;
    currentPerMppt = arrayIscA / mpptCount;

    // Total MPPT current capacity
    const totalMpptCurrent = inverter.mpptCurrent * mpptCount;

    // Check 1: Max PV Input Power
    if (arrayPowerW > inverter.maxPVInputW) {
      valid = false;
      reasons.push(
        `Array power ${arrayPowerW} W exceeds inverter maximum PV input of ${inverter.maxPVInputW} W.`
      );
    }

    // Check 2: Max PV Voc
    if (stringVocV > inverter.maxPVVoc) {
      valid = false;
      reasons.push(
        `String Voc ${stringVocV} V exceeds inverter maximum PV Voc of ${inverter.maxPVVoc} V.`
      );
    }

    // Check 3: MPPT Min Voltage
    if (stringVmpV < inverter.mpptMinVoltage) {
      valid = false;
      reasons.push(
        `String Vmp ${stringVmpV} V is below inverter MPPT minimum voltage of ${inverter.mpptMinVoltage} V.`
      );
    }

    // Check 4: MPPT Max Voltage
    if (stringVmpV > inverter.mpptMaxVoltage) {
      valid = false;
      reasons.push(
        `String Vmp ${stringVmpV} V exceeds inverter MPPT maximum voltage of ${inverter.mpptMaxVoltage} V.`
      );
    }

    // Check 5: Total MPPT Current
    const protectedArrayIscA = arrayIscA * input.currentSafetyFactor;

    if (protectedArrayIscA > totalMpptCurrent) {
      valid = false;
      reasons.push(
        `Array Isc with safety factor ${protectedArrayIscA.toFixed(
          2
        )} A exceeds total MPPT current capacity of ${totalMpptCurrent} A (${mpptCount} × ${inverter.mpptCurrent}A).`
      );
    }

    // Warning: Uneven distribution
    if (parallelStrings % mpptCount !== 0 && valid) {
      reasons.push(
        `Note: ${parallelStrings} strings cannot be evenly distributed across ${mpptCount} MPPT trackers (${stringsPerMppt.toFixed(1)} per tracker).`
      );
    }
  }

  return {
    panelCount,
    panelsInSeries,
    parallelStrings,
    arrayPowerW,
    oversizingRatio,
    oversizingPercent,
    stringVocV,
    stringVmpV,
    arrayIscA,
    arrayImpA,
    valid,
    reasons,
    mpptCount,
    stringsPerMppt,
    currentPerMppt,
  };
}

function candidateScore(
  candidate: PanelArrangementCandidate,
  requiredPVPowerW: number
): number {
  const excessPower = Math.max(
    0,
    candidate.arrayPowerW - requiredPVPowerW
  );

  return excessPower * 1000 + candidate.panelCount;
}

export function calculatePanelArrangement(
  input: PanelArrangementInput
): PanelArrangementResult {
  validateInput(input);

  const panel = input.selectedPanel;

  const minimumPanelCount = Math.ceil(
    input.requiredPVPowerW / panel.pmaxW
  );

  // ✅ Dynamic max panel count for industrial systems
  const defaultMaxPanelCount = Math.max(
    minimumPanelCount + 12,
    minimumPanelCount + Math.ceil(minimumPanelCount * 0.2),
    minimumPanelCount + 100
  );

  const maxPanelCount =
    input.maxPanelCount ?? defaultMaxPanelCount;

  if (maxPanelCount < minimumPanelCount) {
    throw new Error(
      "Maximum panel count cannot be less than the minimum required panel count."
    );
  }

  // ✅ Performance optimization
  const maxSeriesToSearch = Math.min(
    Math.floor(1500 / panel.voc) + 2,
    30
  );

  const candidates: PanelArrangementCandidate[] = [];

  for (
    let panelCount = minimumPanelCount;
    panelCount <= maxPanelCount;
    panelCount++
  ) {
    for (
      let panelsInSeries = 1;
      panelsInSeries <= Math.min(panelCount, maxSeriesToSearch);
      panelsInSeries++
    ) {
      if (panelCount % panelsInSeries !== 0) {
        continue;
      }

      const candidate = evaluateCandidate(
        panelCount,
        panelsInSeries,
        input
      );

      candidates.push(candidate);
    }
  }

  const validCandidates = candidates.filter(
    (candidate) =>
      candidate.valid &&
      candidate.arrayPowerW >= input.requiredPVPowerW
  );

  if (validCandidates.length === 0) {
    return {
      requiredPVPowerW: input.requiredPVPowerW,
      minimumPanelCount,
      selectedPanel: panel,
      selectedArrangement: undefined,
      candidates,
      status: "no-valid-arrangement",
      warnings: [
        "No electrically valid panel arrangement was found within the permitted search range.",
      ],
      errors: [
        "The selected panel and inverter specifications cannot currently produce a valid PV array configuration.",
      ],
    };
  }

  const selectedArrangement = validCandidates.reduce(
    (best, candidate) =>
      candidateScore(candidate, input.requiredPVPowerW) <
      candidateScore(best, input.requiredPVPowerW)
        ? candidate
        : best
  );

  const warnings: string[] = [];

  if (selectedArrangement.oversizingRatio > 1) {
    warnings.push(
      `Selected PV array is ${selectedArrangement.oversizingPercent.toFixed(
        1
      )}% above the calculated PV requirement.`
    );
  }

  if (selectedArrangement.panelCount > minimumPanelCount) {
    warnings.push(
      `The minimum panel quantity of ${minimumPanelCount} could not produce a valid electrical arrangement, so ${selectedArrangement.panelCount} panels were selected.`
    );
  }

  return {
    requiredPVPowerW: input.requiredPVPowerW,
    minimumPanelCount,
    selectedPanel: panel,
    selectedArrangement,
    candidates,
    status: "valid",
    warnings,
    errors: [],
  };
}