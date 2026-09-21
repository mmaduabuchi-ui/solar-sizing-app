// src/store/solarStore.ts
import { create } from "zustand";

import type {
  InverterSpec,
  InverterSelectionResult,
  SolarDesign,
  CableSizingOutput,
} from "@/types/solar";

interface SolarStore {
  design: SolarDesign;

  setProjectName: (value: string) => void;
  setLoads: (loads: SolarDesign["loads"]) => void;
  setPeakSunHours: (value: number) => void;
  setPerformanceRatio: (value: number) => void;
  setSystemLossFactor: (value: number) => void;
  setEnergyCalculation: (result: SolarDesign["energyCalculation"]) => void;
  setPowerFactor: (value: number) => void;

  // ✅ System voltage setter
  setSystemVoltage: (value: number) => void;

  setInverterType: (value: SolarDesign["inverterType"]) => void;
  setSelectedInverter: (inverter: InverterSpec) => void;
  setInverterSelectionResult: (result: InverterSelectionResult | undefined) => void;
  setSelectedPanel: (panel: SolarDesign["selectedPanel"]) => void;
  setPanelArrangement: (result: SolarDesign["panelArrangement"]) => void;
  setSelectedBattery: (battery: SolarDesign["selectedBattery"]) => void;
  setBatteryType: (value: SolarDesign["batteryType"]) => void;
  setBatterySizing: (result: SolarDesign["batterySizing"]) => void;
  setAutonomyDays: (value: number) => void;
  setBatteryDoD: (value: number) => void;
  setBatteryEfficiency: (value: number) => void;
  setChargeControllerType: (value: SolarDesign["chargeControllerType"]) => void;
  setChargeControllerSizing: (result: SolarDesign["chargeControllerSizing"]) => void;

  // ✅ NEW: Cable sizing setter (from Step 13)
  setCableSizing: (result: CableSizingOutput | undefined) => void;

  // ✅ NEW: Cart total setter (from Step 15)
  setCartTotal: (total: number) => void;

  setCurrentStep: (step: number) => void;
  completeStep: (step: number) => void;
  setWarnings: (warnings: string[]) => void;
  setErrors: (errors: string[]) => void;
  resetDesign: () => void;

  // Navigation
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  canGoNext: () => boolean;
  canGoBack: () => boolean;
}

const DEFAULT_DESIGN: SolarDesign = {
  projectName: "",
  loads: [],
  peakSunHours: 4,
  performanceRatio: 0.65,
  systemLossFactor: 0,
  energyCalculation: undefined,
  inverterType: undefined,
  powerFactor: 0.8,
  systemVoltage: 48,  // Default 48V, auto-updates after Step 3
  selectedInverter: undefined,
  inverterSelectionResult: undefined,
  selectedPanel: undefined,
  panelArrangement: undefined,
  selectedBattery: undefined,
  batteryType: undefined,
  autonomyDays: 1,
  batteryDoD: 0.8,
  batteryEfficiency: 0.8,
  batterySizing: undefined,
  chargeControllerType: undefined,
  chargeControllerSizing: undefined,

  // ✅ NEW
  cableSizing: undefined,
  cartTotal: undefined,

  currentStep: 1,
  completedSteps: [],
  warnings: [],
  errors: [],
};

export const useSolarStore = create<SolarStore>((set, get) => ({
  design: DEFAULT_DESIGN,

  setProjectName: (value) =>
    set((state) => ({
      design: { ...state.design, projectName: value },
    })),

  setLoads: (loads) =>
    set((state) => ({
      design: {
        ...state.design,
        loads,
        energyCalculation: undefined,
        inverterSelectionResult: undefined,
        panelArrangement: undefined,
        batterySizing: undefined,
        chargeControllerSizing: undefined,
        // ✅ Reset downstream when loads change
        cableSizing: undefined,
        cartTotal: undefined,
      },
    })),

  setPeakSunHours: (value) =>
    set((state) => ({
      design: {
        ...state.design,
        peakSunHours: value,
        energyCalculation: undefined,
        panelArrangement: undefined,
        batterySizing: undefined,
        chargeControllerSizing: undefined,
        cableSizing: undefined,
        cartTotal: undefined,
      },
    })),

  setPerformanceRatio: (value) =>
    set((state) => ({
      design: {
        ...state.design,
        performanceRatio: value,
        energyCalculation: undefined,
        panelArrangement: undefined,
        batterySizing: undefined,
        chargeControllerSizing: undefined,
        cableSizing: undefined,
        cartTotal: undefined,
      },
    })),

  setSystemLossFactor: (value) =>
    set((state) => ({
      design: {
        ...state.design,
        systemLossFactor: value,
        energyCalculation: undefined,
        panelArrangement: undefined,
        batterySizing: undefined,
        chargeControllerSizing: undefined,
        cableSizing: undefined,
        cartTotal: undefined,
      },
    })),

  setEnergyCalculation: (result) =>
    set((state) => ({
      design: {
        ...state.design,
        energyCalculation: result,
        inverterSelectionResult: undefined,
        panelArrangement: undefined,
        batterySizing: undefined,
        chargeControllerSizing: undefined,
        cableSizing: undefined,
        cartTotal: undefined,
      },
    })),

  setPowerFactor: (value) =>
    set((state) => ({
      design: {
        ...state.design,
        powerFactor: value,
        inverterSelectionResult: undefined,
        panelArrangement: undefined,
        chargeControllerSizing: undefined,
        cableSizing: undefined,
        cartTotal: undefined,
      },
    })),

  // ✅ Only reset dependent selections when voltage ACTUALLY changes
  setSystemVoltage: (value) =>
    set((state) => {
      // Skip reset if voltage hasn't changed
      if (state.design.systemVoltage === value) {
        return state;
      }

      return {
        design: {
          ...state.design,
          systemVoltage: value,
          selectedInverter: undefined,
          inverterSelectionResult: undefined,
          batterySizing: undefined,
          selectedBattery: undefined,
          chargeControllerSizing: undefined,
          panelArrangement: undefined,
          cableSizing: undefined,
          cartTotal: undefined,
        },
      };
    }),

  setInverterType: (value) =>
    set((state) => ({
      design: {
        ...state.design,
        inverterType: value,
        selectedInverter:
          state.design.selectedInverter?.type === value
            ? state.design.selectedInverter
            : undefined,
        inverterSelectionResult: undefined,
        panelArrangement: undefined,
        batterySizing: undefined,
        chargeControllerSizing: undefined,
        cableSizing: undefined,
        cartTotal: undefined,
      },
    })),

  setSelectedInverter: (inverter) =>
    set((state) => ({
      design: {
        ...state.design,
        selectedInverter: inverter,
        inverterType: inverter.type,
        systemVoltage: inverter.systemVoltage, // Sync system voltage with inverter
        inverterSelectionResult: undefined,
        panelArrangement: undefined,
        batterySizing: undefined,
        chargeControllerSizing: undefined,
        cableSizing: undefined,
        cartTotal: undefined,
      },
    })),

  setInverterSelectionResult: (result) =>
    set((state) => ({
      design: {
        ...state.design,
        inverterSelectionResult: result,
      },
    })),

  setSelectedPanel: (panel) =>
    set((state) => ({
      design: {
        ...state.design,
        selectedPanel: panel,
        inverterSelectionResult: undefined,
        panelArrangement: undefined,
        chargeControllerSizing: undefined,
        cableSizing: undefined,
        cartTotal: undefined,
      },
    })),

  setPanelArrangement: (result) =>
    set((state) => ({
      design: {
        ...state.design,
        panelArrangement: result,
        chargeControllerSizing: undefined,
        cableSizing: undefined,
        cartTotal: undefined,
      },
    })),

  setSelectedBattery: (battery) =>
    set((state) => ({
      design: {
        ...state.design,
        selectedBattery: battery,
        cableSizing: undefined,
        cartTotal: undefined,
      },
    })),

  setBatteryType: (value) =>
    set((state) => ({
      design: {
        ...state.design,
        batteryType: value,
        selectedBattery: undefined,
        batterySizing: undefined,
        cableSizing: undefined,
        cartTotal: undefined,
      },
    })),

  setBatterySizing: (result) =>
    set((state) => ({
      design: {
        ...state.design,
        batterySizing: result,
      },
    })),

  setAutonomyDays: (value) =>
    set((state) => ({
      design: {
        ...state.design,
        autonomyDays: value,
        batterySizing: undefined,
      },
    })),

  setBatteryDoD: (value) =>
    set((state) => ({
      design: {
        ...state.design,
        batteryDoD: value,
        batterySizing: undefined,
      },
    })),

  setBatteryEfficiency: (value) =>
    set((state) => ({
      design: {
        ...state.design,
        batteryEfficiency: value,
        batterySizing: undefined,
      },
    })),

  setChargeControllerType: (value) =>
    set((state) => ({
      design: {
        ...state.design,
        chargeControllerType: value,
        chargeControllerSizing: undefined,
      },
    })),

  setChargeControllerSizing: (result) =>
    set((state) => ({
      design: {
        ...state.design,
        chargeControllerSizing: result,
      },
    })),

  // ✅ NEW: cable sizing setter
  setCableSizing: (result) =>
    set((state) => ({
      design: {
        ...state.design,
        cableSizing: result,
      },
    })),

  // ✅ NEW: cart total setter
  setCartTotal: (total) =>
    set((state) => ({
      design: {
        ...state.design,
        cartTotal: total,
      },
    })),

  setCurrentStep: (step) =>
    set((state) => ({
      design: {
        ...state.design,
        currentStep: step,
      },
    })),

  completeStep: (step) =>
    set((state) => ({
      design: {
        ...state.design,
        completedSteps: state.design.completedSteps.includes(step)
          ? state.design.completedSteps
          : [...state.design.completedSteps, step].sort((a, b) => a - b),
      },
    })),

  setWarnings: (warnings) =>
    set((state) => ({
      design: {
        ...state.design,
        warnings,
      },
    })),

  setErrors: (errors) =>
    set((state) => ({
      design: {
        ...state.design,
        errors,
      },
    })),

  resetDesign: () =>
    set({
      design: {
        ...DEFAULT_DESIGN,
        loads: [],
        energyCalculation: undefined,
        selectedInverter: undefined,
        inverterSelectionResult: undefined,
        selectedPanel: undefined,
        panelArrangement: undefined,
        selectedBattery: undefined,
        batterySizing: undefined,
        chargeControllerSizing: undefined,
        cableSizing: undefined,
        cartTotal: undefined,
        completedSteps: [],
        warnings: [],
        errors: [],
        currentStep: 1,
      },
    }),

  goToNextStep: () => {
    const { design, completeStep, setCurrentStep } = get();
    const nextStep = design.currentStep + 1;
    if (nextStep <= 16) {
      if (!design.completedSteps.includes(design.currentStep)) {
        completeStep(design.currentStep);
      }
      setCurrentStep(nextStep);
    }
  },

  goToPreviousStep: () => {
    const { design, setCurrentStep } = get();
    const prevStep = design.currentStep - 1;
    if (prevStep >= 1) {
      setCurrentStep(prevStep);
    }
  },

  canGoNext: () => {
    const { design } = get();
    return design.currentStep < 16;
  },

  canGoBack: () => {
    const { design } = get();
    return design.currentStep > 1;
  },
}));