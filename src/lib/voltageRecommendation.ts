// src/lib/voltageRecommendation.ts

export interface VoltageOption {
  voltage: number;
  currentA: number;
  cableSizeMm2: number;
  reason: string;
  isPractical: boolean;
}

export interface VoltageRecommendation {
  recommendedVoltage: number;
  reason: string;
  alternatives: VoltageOption[];
  systemCategory: "residential" | "commercial" | "industrial";
  categoryLabel: string;
}

/**
 * Automatically recommend the best system voltage based on load size.
 *
 * Engineering rule of thumb:
 * - Small systems: Lower voltage (12V, 24V) is cost-effective
 * - Medium systems: 48V is industry standard
 * - Large systems: Higher voltage (96V-512V) reduces current and cable size
 *
 * The second parameter is retained for API compatibility with future
 * time-of-day energy analysis. It is currently unused.
 */
export function recommendSystemVoltage(
  totalPowerW: number,
  _dailyEnergyWh: number = 0
): VoltageRecommendation {
  const powerKW = totalPowerW / 1000;

  // Determine system category
  let systemCategory: "residential" | "commercial" | "industrial";
  let categoryLabel: string;

  if (powerKW < 6) {
    systemCategory = "residential";
    categoryLabel = "Residential System";
  } else if (powerKW < 50) {
    systemCategory = "commercial";
    categoryLabel = "Commercial System";
  } else {
    systemCategory = "industrial";
    categoryLabel = "Industrial System";
  }

  // Auto-recommendation logic
  let recommendedVoltage: number;
  let reason: string;

  if (powerKW < 1) {
    recommendedVoltage = 12;
    reason = "Small system (<1kW) - 12V is cost-effective and safe for small DC loads";
  } else if (powerKW < 2.5) {
    recommendedVoltage = 24;
    reason = "Small residential system (1-2.5kW) - 24V balances cost and efficiency";
  } else if (powerKW < 6) {
    recommendedVoltage = 48;
    reason = "Standard residential system (2.5-6kW) - 48V is the industry standard for homes";
  } else if (powerKW < 15) {
    recommendedVoltage = 96;
    reason = "Small commercial system (6-15kW) - 96V reduces current significantly";
  } else if (powerKW < 50) {
    recommendedVoltage = 192;
    reason = "Commercial system (15-50kW) - 192V keeps current manageable and cables practical";
  } else if (powerKW < 150) {
    recommendedVoltage = 384;
    reason = "Industrial system (50-150kW) - 384V is standard for industrial inverters";
  } else {
    recommendedVoltage = 512;
    reason = "Large industrial system (>150kW) - 512V minimizes current and cable size";
  }

  // Calculate all voltage options
  const voltageOptions = [12, 24, 48, 96, 192, 384, 512];
  const alternatives: VoltageOption[] = voltageOptions.map((v) => {
    const current = totalPowerW / v;
    // Approximate cable size (based on ~4A per mm² for copper, derated for Nigeria)
    const cableSize = Math.max(1.5, Math.ceil(current / 4));
    const isPractical = current <= 500;

    return {
      voltage: v,
      currentA: current,
      cableSizeMm2: cableSize,
      reason: getVoltageReason(current),
      isPractical,
    };
  });

  return {
    recommendedVoltage,
    reason,
    alternatives,
    systemCategory,
    categoryLabel,
  };
}

function getVoltageReason(currentA: number): string {
  if (currentA > 1000) return "❌ Impossible - current too high";
  if (currentA > 500) return "❌ Impractical - excessive cable size needed";
  if (currentA > 300) return "⚠️ Very heavy cables required";
  if (currentA > 200) return "⚠️ Heavy cables required";
  if (currentA > 100) return "✅ Manageable current";
  if (currentA > 50) return "✅ Good - low current";
  return "✅ Excellent - very low current";
}