// src/types/solar.ts

export type InverterType =
  | "hybrid"
  | "standalone";

export type BatteryType =
  | "lithium"
  | "tubular";

export type ChargeControllerType =
  | "pwm"
  | "mppt"
  | "built-in-mppt";

export type ValidationStatus =
  | "pass"
  | "warning"
  | "fail";

export interface LoadItem {
  id: string;
  appliance: string;
  powerW: number;
  quantity: number;
  hoursPerDay: number;
  surgeW?: number;
  critical?: boolean;
}

export interface InverterSpec {
  brand: string;
  model: string;
  type: InverterType;
  ratedKVA: number;
  ratedWatts: number;
  systemVoltage: number;
  maxPVInputW: number;
  maxPVVoc: number;
  mpptMinVoltage: number;
  mpptMaxVoltage: number;
  mpptCurrent: number;              // Current PER tracker
  maxChargingCurrent?: number;
  // ✅ Multiple MPPT support
  mpptCount?: number;               // Number of MPPT trackers (default: 1)
}

export interface PanelSpec {
  brand: string;
  model: string;
  pmaxW: number;
  voc: number;
  vmp: number;
  isc: number;
  imp: number;
  efficiency?: number;
}

export interface BatterySpec {
  brand: string;
  model: string;
  type: BatteryType;
  voltage: number;
  capacityAh?: number;
  capacityKWh?: number;
}

export interface EnergyCalculation {
  dailyLoadEnergyWh: number;
  systemLossEnergyWh: number;
  designEnergyWh: number;
  designEnergyKWh: number;
  peakSunHours: number;
  performanceRatio: number;
  systemLossFactor: number;
  requiredPVPowerW: number;
  requiredPVPowerKW: number;
}

export interface InverterSelectionResult {
  status: ValidationStatus;
  warnings: string[];
  errors: string[];
}

export interface BatterySizingResult {
  batteryType: BatteryType;
  designEnergyWh: number;
  autonomyDays: number;
  batteryDoD: number;
  batteryEfficiency: number;
  systemVoltage: number;
  requiredStoredEnergyWh: number;
  requiredStoredEnergyKWh: number;
  requiredCapacityAh?: number;
  requiredCapacityKWh?: number;
  selectedBattery?: BatterySpec;
  batteriesRequired?: number;
  seriesBatteries?: number;
  parallelStrings?: number;
  totalBatteryCount?: number;
  actualBankVoltage?: number;
  actualBankCapacityAh?: number;
  actualBankCapacityKWh?: number;
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
  // ✅ MPPT distribution
  mpptCount?: number;
  stringsPerMppt?: number;
  currentPerMppt?: number;
}

export interface PanelArrangementResult {
  requiredPVPowerW: number;
  minimumPanelCount: number;
  selectedPanel: PanelSpec;
  selectedArrangement:
    | PanelArrangementCandidate
    | undefined;
  candidates: PanelArrangementCandidate[];
  status:
    | "valid"
    | "no-valid-arrangement";
  warnings: string[];
  errors: string[];
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

// ============================================================
// ✅ NEW: Cable sizing output (from Step 13)
// ============================================================

export interface CableCircuitSizing {
  cableSize: number | null;
  cableCount: number;
  lengthM: number;
  voltageDropPercent: number;
}

export interface CableSizingOutput {
  ac: CableCircuitSizing;
  battery: CableCircuitSizing;
  pv: CableCircuitSizing;
}

// ============================================================
// MAIN DESIGN INTERFACE
// ============================================================

export interface SolarDesign {
  projectName: string;
  loads: LoadItem[];
  peakSunHours: number;
  performanceRatio: number;
  systemLossFactor: number;
  energyCalculation?: EnergyCalculation;
  inverterType?: InverterType;
  powerFactor: number;

  // ✅ Selected system voltage
  systemVoltage: number;

  selectedInverter?: InverterSpec;
  inverterSelectionResult?: InverterSelectionResult;
  selectedPanel?: PanelSpec;
  panelArrangement?: PanelArrangementResult;
  selectedBattery?: BatterySpec;
  batteryType?: BatteryType;
  autonomyDays: number;
  batteryDoD: number;
  batteryEfficiency: number;
  batterySizing?: BatterySizingResult;
  chargeControllerType?: ChargeControllerType;
  chargeControllerSizing?: ChargeControllerSizingResult;

  // ✅ NEW: Cable sizing output (pushed from Step 13)
  cableSizing?: CableSizingOutput;

  // ✅ NEW: Cart total in NGN (pushed from Step 15)
  cartTotal?: number;

  currentStep: number;
  completedSteps: number[];
  warnings: string[];
  errors: string[];
}