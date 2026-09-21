// src/config/steps.ts
import type { ComponentType } from "react";
import type { SolarDesign } from "@/types/solar";

// Import all step components
import Step1LoadAudit from "@/components/steps/Step1LoadAudit";
import Step2EnergyCalculation from "@/components/steps/Step2EnergyCalculation";
import Step3InverterSizing from "@/components/steps/Step3InverterSizing";
import Step4PanelSizing from "@/components/steps/Step4PanelSizing";
import Step5InverterSelection from "@/components/steps/Step5InverterSelection";
import Step6BatterySizing from "@/components/steps/Step6BatterySizing";
import Step7BatterySelection from "@/components/steps/Step7BatterySelection";

// Reordered: Panel Selection BEFORE Charge Controller
import Step9PanelQuantity from "@/components/steps/Step9PanelQuantity"; // Now Step 8
import Step10PanelArrangement from "@/components/steps/Step10PanelArrangement"; // Now Step 9
import Step8ChargeController from "@/components/steps/Step8ChargeController"; // Now Step 10

// Remaining steps - make sure these files exist
import Step11Oversizing from "@/components/steps/Step11Oversizing";
import Step12Protection from "@/components/steps/Step12Protection";
import Step13CableSizing from "@/components/steps/Step13CableSizing";
import Step14Validation from "@/components/steps/Step14Validation";
import Step15MarketSearch from "@/components/steps/Step15MarketSearch";
import Step16FinalDesign from "@/components/steps/Step16FinalDesign";

export type StepCategory = 
  | "Load Analysis" 
  | "System Sizing" 
  | "Component Selection" 
  | "Engineering Validation" 
  | "Finalization";

export interface StepConfig {
  id: number;
  title: string;
  subtitle: string;
  component: ComponentType;
  category: StepCategory;
  canProceed?: (design: SolarDesign) => boolean;
  isComplete: (design: SolarDesign) => boolean;
  showWhen?: (design: SolarDesign) => boolean;
}

export const STEPS: StepConfig[] = [
  // Steps 1-7: Load Analysis & System Sizing
  {
    id: 1,
    title: "Load Audit",
    subtitle: "Enter all appliances and their daily usage patterns",
    component: Step1LoadAudit,
    category: "Load Analysis",
    isComplete: (design) => design.completedSteps.includes(1),
    canProceed: (design) => design.loads.length > 0
  },
  {
    id: 2,
    title: "Energy Calculation",
    subtitle: "Calculate daily energy requirements and PV capacity",
    component: Step2EnergyCalculation,
    category: "Load Analysis",
    isComplete: (design) => design.completedSteps.includes(2),
    canProceed: (design) => !!design.energyCalculation
  },
  {
    id: 3,
    title: "Inverter Sizing",
    subtitle: "Determine minimum inverter capacity based on load",
    component: Step3InverterSizing,
    category: "System Sizing",
    isComplete: (design) => design.completedSteps.includes(3),
    canProceed: (design) => !!design.inverterSelectionResult
  },
  {
    id: 4,
    title: "PV Capacity Sizing",
    subtitle: "Calculate required solar array capacity",
    component: Step4PanelSizing,
    category: "System Sizing",
    isComplete: (design) => design.completedSteps.includes(4),
    canProceed: (design) => !!design.energyCalculation
  },
  {
    id: 5,
    title: "Inverter Selection",
    subtitle: "Select and validate a specific inverter model",
    component: Step5InverterSelection,
    category: "System Sizing",
    isComplete: (design) => design.completedSteps.includes(5),
    canProceed: (design) => design.inverterSelectionResult?.status === "pass"
  },
  {
    id: 6,
    title: "Battery Sizing",
    subtitle: "Calculate required battery bank capacity",
    component: Step6BatterySizing,
    category: "System Sizing",
    isComplete: (design) => design.completedSteps.includes(6),
    canProceed: (design) => !!design.batterySizing
  },
  {
    id: 7,
    title: "Battery Selection",
    subtitle: "Select and validate a specific battery model",
    component: Step7BatterySelection,
    category: "System Sizing",
    isComplete: (design) => design.completedSteps.includes(7),
    canProceed: (design) => !!design.selectedBattery
  },
  
  // REORDERED: Panel Selection BEFORE Charge Controller
  {
    id: 8,
    title: "Panel Selection",
    subtitle: "Select solar panels and calculate quantity needed",
    component: Step9PanelQuantity,
    category: "Component Selection",
    isComplete: (design) => design.completedSteps.includes(8),
    canProceed: (design) => !!design.selectedPanel
  },
  {
    id: 9,
    title: "Panel Arrangement",
    subtitle: "Configure series and parallel connections",
    component: Step10PanelArrangement,
    category: "Component Selection",
    isComplete: (design) => design.completedSteps.includes(9),
    canProceed: (design) => !!design.panelArrangement
  },
  {
    id: 10,
    title: "Charge Controller",
    subtitle: "Size the charge controller for your panel array",
    component: Step8ChargeController,
    category: "Component Selection",
    isComplete: (design) => design.completedSteps.includes(10),
    canProceed: (design) => !!design.chargeControllerSizing
  },
  
  // Engineering Validation
  {
    id: 11,
    title: "Oversizing Analysis",
    subtitle: "Review PV array oversizing and ILR",
    component: Step11Oversizing,
    category: "Engineering Validation",
    isComplete: (design) => design.completedSteps.includes(11),
    canProceed: (design) => !!design.panelArrangement
  },
  {
    id: 12,
    title: "Protection Sizing",
    subtitle: "Size circuit breakers and fuses for all circuits",
    component: Step12Protection,
    category: "Engineering Validation",
    isComplete: (design) => design.completedSteps.includes(12),
    canProceed: (design) => !!design.inverterSelectionResult
  },
  {
    id: 13,
    title: "Cable Sizing",
    subtitle: "Calculate cable sizes and voltage drop",
    component: Step13CableSizing,
    category: "Engineering Validation",
    isComplete: (design) => design.completedSteps.includes(13),
    canProceed: (design) => !!design.inverterSelectionResult
  },
  {
    id: 14,
    title: "System Validation",
    subtitle: "Final engineering review of the complete system",
    component: Step14Validation,
    category: "Engineering Validation",
    isComplete: (design) => design.completedSteps.includes(14),
    canProceed: (design) => design.completedSteps.includes(13)
  },
  
  // Finalization
  {
    id: 15,
    title: "Market Search",
    subtitle: "Find available equipment in your region",
    component: Step15MarketSearch,
    category: "Finalization",
    isComplete: (design) => design.completedSteps.includes(15)
  },
  {
    id: 16,
    title: "Final Design",
    subtitle: "Complete system summary, export, and finalize",
    component: Step16FinalDesign,
    category: "Finalization",
    isComplete: (design) => design.completedSteps.includes(16),
    canProceed: (design) => design.completedSteps.includes(14)
  }
];

// ============================================================
// ✅ HELPER FUNCTIONS - MUST BE EXPORTED
// ============================================================
export function getStepById(id: number): StepConfig | undefined {
  return STEPS.find(step => step.id === id);
}

export function getNextIncompleteStep(design: SolarDesign): number | null {
  const next = STEPS.find(step => !step.isComplete(design));
  return next?.id || null;
}

export function isDesignComplete(design: SolarDesign): boolean {
  return STEPS.every(step => step.isComplete(design));
}