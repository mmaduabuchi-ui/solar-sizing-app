// src/lib/batteryDatabase.ts
export interface BatteryProduct {
  brand: string;
  model: string;
  type: "lithium" | "tubular";
  voltage: number;
  capacityAh?: number;
  capacityKWh?: number;
  priceNGN?: number;
  availability?: "high" | "medium" | "low";
  description?: string;
  warranty?: string;
  cycleLife?: number;
}

// Real batteries available in Nigerian market
export const BATTERY_DATABASE: BatteryProduct[] = [
  // ============================================================
  // SUNLUX / YUFAI AURORA — featured partner lineup
  //
  // Verified from aurorabattery.com product catalog:
  //   - YF-LFP-15KWH   : 51.2V, 15kWh, 300Ah, ≥8000 cycles
  //   - YF-WLFP-8.7KWH : 51.2V, 8.7kWh, 6000 cycles @ 90% DOD
  //   - YF-LFP-256100  : 25.6V, 2.56kWh, 100Ah, ≥6000 cycles
  //   - YF-LFP-12845   : 12.8V, 576Wh, 45Ah, >5000 cycles
  //
  // ⚠️ PRICES ARE PLACEHOLDERS — update with Aurora's current
  //    NGN pricing before production use.
  // ============================================================
  {
    brand: "Sunlux",
    model: "YF-LFP-15KWH (300Ah)",
    type: "lithium",
    voltage: 48,
    capacityAh: 300,
    capacityKWh: 15,
    priceNGN: 4200000,           // ⚠️ placeholder — confirm with Aurora
    availability: "high",
    warranty: "6 years",
    cycleLife: 8000,
    description:
      "Sunlux 15kWh LiFePO4 wall-mount — 51.2V nominal, BMS compatible with Growatt, Deye, Victron.",
  },
  {
    brand: "Sunlux",
    model: "YF-WLFP-8.7KWH",
    type: "lithium",
    voltage: 48,
    capacityAh: 170,
    capacityKWh: 8.7,
    priceNGN: 2600000,           // ⚠️ placeholder — confirm with Aurora
    availability: "high",
    warranty: "6 years",
    cycleLife: 6000,
    description:
      "Sunlux 8.7kWh LiFePO4 wall-mount — 51.2V nominal, 100A continuous.",
  },
  {
    brand: "Sunlux",
    model: "YF-LFP-256100 (2.56kWh)",
    type: "lithium",
    voltage: 24,
    capacityAh: 100,
    capacityKWh: 2.56,
    priceNGN: 750000,            // ⚠️ placeholder — confirm with Aurora
    availability: "medium",
    warranty: "3 years",
    cycleLife: 6000,
    description:
      "Sunlux 2.56kWh LiFePO4 — 25.6V, 100A, compact wall-mount for smaller systems.",
  },
  {
    brand: "Sunlux",
    model: "YF-LFP-12845 (45Ah)",
    type: "lithium",
    voltage: 12,
    capacityAh: 45,
    capacityKWh: 0.576,
    priceNGN: 220000,            // ⚠️ placeholder — confirm with Aurora
    availability: "medium",
    warranty: "3 years",
    cycleLife: 5000,
    description:
      "Sunlux 576Wh LiFePO4 — 12.8V, compact module for 12V/24V/48V banks.",
  },

  // ============================================================
  // 12V LITHIUM — usable for 12V, 24V, 48V banks (series combos)
  // ============================================================
  {
    brand: "Renogy",
    model: "Smart Lithium 12V 100Ah",
    type: "lithium",
    voltage: 12,
    capacityAh: 100,
    capacityKWh: 1.28,
    priceNGN: 350000,
    availability: "high",
    warranty: "5 years",
    cycleLife: 4000,
    description:
      "Compact 12V lithium — perfect for small off-grid systems (12V/24V/48V banks)",
  },
  {
    brand: "LiTime",
    model: "12V 100Ah LiFePO4",
    type: "lithium",
    voltage: 12,
    capacityAh: 100,
    capacityKWh: 1.28,
    priceNGN: 320000,
    availability: "medium",
    warranty: "5 years",
    cycleLife: 4000,
    description: "Popular budget 12V lithium battery",
  },

  // ============================================================
  // 24V LITHIUM — for 24V / 48V banks
  // ============================================================
  {
    brand: "Renogy",
    model: "Smart Lithium 24V 50Ah",
    type: "lithium",
    voltage: 24,
    capacityAh: 50,
    capacityKWh: 1.28,
    priceNGN: 480000,
    availability: "medium",
    warranty: "5 years",
    cycleLife: 4000,
    description: "24V lithium for small-to-mid residential systems",
  },
  {
    brand: "LiTime",
    model: "24V 100Ah LiFePO4",
    type: "lithium",
    voltage: 24,
    capacityAh: 100,
    capacityKWh: 2.56,
    priceNGN: 720000,
    availability: "medium",
    warranty: "5 years",
    cycleLife: 4000,
    description: "24V lithium with larger capacity",
  },

  // ============================================================
  // 48V LITHIUM — premium lineup
  // ============================================================
  {
    brand: "Pylontech",
    model: "US2000C",
    type: "lithium",
    voltage: 48,
    capacityKWh: 2.4,
    capacityAh: 50,
    priceNGN: 650000,
    availability: "high",
    warranty: "10 years",
    cycleLife: 6000,
    description:
      "Most popular lithium battery in Nigeria. Reliable and widely available.",
  },
  {
    brand: "Pylontech",
    model: "US3000C",
    type: "lithium",
    voltage: 48,
    capacityKWh: 3.5,
    capacityAh: 74,
    priceNGN: 950000,
    availability: "high",
    warranty: "10 years",
    cycleLife: 6000,
    description:
      "Higher capacity Pylontech battery for larger systems.",
  },
  {
    brand: "Pylontech",
    model: "US5000",
    type: "lithium",
    voltage: 48,
    capacityKWh: 4.8,
    capacityAh: 100,
    priceNGN: 1350000,
    availability: "medium",
    warranty: "10 years",
    cycleLife: 6000,
    description:
      "High-capacity lithium battery for commercial systems.",
  },
  {
    brand: "Dyness",
    model: "B3",
    type: "lithium",
    voltage: 48,
    capacityKWh: 3.0,
    capacityAh: 62.5,
    priceNGN: 850000,
    availability: "medium",
    warranty: "8 years",
    cycleLife: 5000,
    description:
      "Competitive lithium battery with good price-to-performance ratio.",
  },
  {
    brand: "Dyness",
    model: "B5",
    type: "lithium",
    voltage: 48,
    capacityKWh: 5.0,
    capacityAh: 104,
    priceNGN: 1200000,
    availability: "medium",
    warranty: "8 years",
    cycleLife: 5000,
    description:
      "High-capacity lithium battery for larger installations.",
  },
  {
    brand: "Growatt",
    model: "ARES 5.1",
    type: "lithium",
    voltage: 48,
    capacityKWh: 5.1,
    capacityAh: 106,
    priceNGN: 1250000,
    availability: "medium",
    warranty: "8 years",
    cycleLife: 4500,
    description:
      "Growatt lithium battery designed for compatibility with their inverters.",
  },
  {
    brand: "Sungrow",
    model: "SBR096",
    type: "lithium",
    voltage: 48,
    capacityKWh: 9.6,
    capacityAh: 200,
    priceNGN: 2200000,
    availability: "low",
    warranty: "10 years",
    cycleLife: 6000,
    description:
      "Large capacity lithium battery for commercial systems.",
  },

  // ============================================================
  // 12V TUBULAR — the primary Nigerian market choice
  // ============================================================
  {
    brand: "Luminous",
    model: "RC 18000",
    type: "tubular",
    voltage: 12,
    capacityAh: 150,
    capacityKWh: 1.8,
    priceNGN: 280000,
    availability: "high",
    warranty: "3 years",
    cycleLife: 1500,
    description:
      "Entry-level 12V tubular for small systems — widely available in Nigeria",
  },
  {
    brand: "Exide",
    model: "IT500 (12V 150Ah)",
    type: "tubular",
    voltage: 12,
    capacityAh: 150,
    capacityKWh: 1.8,
    priceNGN: 310000,
    availability: "high",
    warranty: "3 years",
    cycleLife: 1400,
    description: "Reliable 12V tubular with good cycle life",
  },
  {
    brand: "Luminous",
    model: "RC 25000",
    type: "tubular",
    voltage: 12,
    capacityAh: 200,
    capacityKWh: 2.4,
    priceNGN: 350000,
    availability: "high",
    warranty: "3 years",
    cycleLife: 1500,
    description:
      "Popular 200Ah tubular battery for residential systems",
  },
  {
    brand: "Exide",
    model: "IT500 (12V 200Ah)",
    type: "tubular",
    voltage: 12,
    capacityAh: 200,
    capacityKWh: 2.4,
    priceNGN: 380000,
    availability: "high",
    warranty: "3 years",
    cycleLife: 1400,
    description: "Premium tubular battery with high reliability",
  },
  {
    brand: "Exide",
    model: "IT700 (12V 260Ah)",
    type: "tubular",
    voltage: 12,
    capacityAh: 260,
    capacityKWh: 3.12,
    priceNGN: 450000,
    availability: "medium",
    warranty: "3 years",
    cycleLife: 1400,
    description: "High-capacity tubular for demanding applications",
  },
  {
    brand: "Koyo",
    model: "KST 200",
    type: "tubular",
    voltage: 12,
    capacityAh: 200,
    capacityKWh: 2.4,
    priceNGN: 320000,
    availability: "high",
    warranty: "3 years",
    cycleLife: 1200,
    description:
      "Value-for-money tubular battery for residential use",
  },
  {
    brand: "Koyo",
    model: "KST 260",
    type: "tubular",
    voltage: 12,
    capacityAh: 260,
    capacityKWh: 3.12,
    priceNGN: 400000,
    availability: "medium",
    warranty: "3 years",
    cycleLife: 1200,
    description: "Higher capacity tubular battery",
  },
  {
    brand: "Fusion",
    model: "FST 200",
    type: "tubular",
    voltage: 12,
    capacityAh: 200,
    capacityKWh: 2.4,
    priceNGN: 340000,
    availability: "medium",
    warranty: "3 years",
    cycleLife: 1300,
    description:
      "Reliable tubular battery with good price point",
  },
  {
    brand: "Orient",
    model: "OT 200",
    type: "tubular",
    voltage: 12,
    capacityAh: 200,
    capacityKWh: 2.4,
    priceNGN: 310000,
    availability: "high",
    warranty: "2 years",
    cycleLife: 1100,
    description:
      "Budget-friendly tubular battery for small systems",
  },
];