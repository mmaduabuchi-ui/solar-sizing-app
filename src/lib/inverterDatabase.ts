// src/lib/inverterDatabase.ts
export interface InverterProduct {
  brand: string;
  model: string;
  type: "hybrid" | "standalone";
  ratedKVA: number;
  ratedWatts: number;
  systemVoltage: number;
  maxPVInputW: number;
  maxPVVoc: number;
  mpptMinVoltage: number;
  mpptMaxVoltage: number;
  mpptCurrent: number;
  maxChargingCurrent?: number;
  priceNGN?: number;
  availability?: "high" | "medium" | "low";
  description?: string;
}

export const INVERTER_DATABASE: InverterProduct[] = [
  // ============================================================
  // YUFAI AURORA / SUNLUX — featured partner lineup
  //
  // ⚠️ SPECS MARKED "pending datasheet" ARE TYPICAL 48V-HYBRID
  //    VALUES USED FOR THE DEMO. Replace with the real numbers
  //    from the manufacturer datasheet before production use.
  //
  // Placeholder provenance:
  //   - 5kW:  confirmed 5kW / 48VDC from YuFai Aurora reseller
  //           listings; MPPT/PV parameters are typical of a 5kW
  //           48V hybrid (Deye/Growatt class).
  //   - 11kW: confirmed 11kW / 48VDC / 22kVA peak from YuFai
  //           Aurora product page; MPPT/PV parameters are typical
  //           of an 11kW 48V hybrid.
  // ============================================================
  {
    brand: "YuFai Aurora",
    model: "YF-FS-WM 6348 (5kW Hybrid)",
    type: "hybrid",
    ratedKVA: 5,
    ratedWatts: 5000,
    systemVoltage: 48,
    maxPVInputW: 6500,           // ⚠️ pending datasheet
    maxPVVoc: 500,               // ⚠️ pending datasheet
    mpptMinVoltage: 120,         // ⚠️ pending datasheet
    mpptMaxVoltage: 450,         // ⚠️ pending datasheet
    mpptCurrent: 80,             // ⚠️ pending datasheet
    maxChargingCurrent: 100,     // ⚠️ pending datasheet
    priceNGN: 1250000,
    availability: "high",
    description:
      "YuFai Aurora 5kW hybrid — 48V, MPPT, compatible with LiFePO4 banks. Full datasheet pending.",
  },
  {
    brand: "YuFai Aurora",
    model: "Aurora 11kW Hybrid",
    type: "hybrid",
    ratedKVA: 11,
    ratedWatts: 11000,
    systemVoltage: 48,
    maxPVInputW: 14300,          // ⚠️ pending datasheet
    maxPVVoc: 500,               // ⚠️ pending datasheet
    mpptMinVoltage: 150,         // ⚠️ pending datasheet
    mpptMaxVoltage: 450,         // ⚠️ pending datasheet
    mpptCurrent: 80,             // ⚠️ pending datasheet
    maxChargingCurrent: 200,     // ⚠️ pending datasheet
    priceNGN: 2500000,
    availability: "medium",
    description:
      "YuFai Aurora 11kW hybrid — 48VDC, peak 22kVA, smart lithium charging. Full datasheet pending.",
  },

  // ============================================================
  // 12V SYSTEMS (small residential — up to ~600W)
  // ============================================================
  {
    brand: "Epever",
    model: "UPower 500W 12V",
    type: "hybrid",
    ratedKVA: 0.5,
    ratedWatts: 500,
    systemVoltage: 12,
    maxPVInputW: 700,
    maxPVVoc: 100,
    mpptMinVoltage: 15,
    mpptMaxVoltage: 90,
    mpptCurrent: 30,
    maxChargingCurrent: 20,
    priceNGN: 220000,
    availability: "high",
    description: "Compact 12V hybrid inverter for small homes and cabins",
  },
  {
    brand: "Victron",
    model: "MultiPlus 12/500/20",
    type: "standalone",
    ratedKVA: 0.5,
    ratedWatts: 500,
    systemVoltage: 12,
    maxPVInputW: 0,
    maxPVVoc: 0,
    mpptMinVoltage: 0,
    mpptMaxVoltage: 0,
    mpptCurrent: 0,
    maxChargingCurrent: 20,
    priceNGN: 450000,
    availability: "medium",
    description: "Premium 12V standalone inverter — requires external MPPT",
  },
  {
    brand: "Growatt",
    model: "SPF 1000TL 12V",
    type: "hybrid",
    ratedKVA: 1,
    ratedWatts: 1000,
    systemVoltage: 12,
    maxPVInputW: 1500,
    maxPVVoc: 145,
    mpptMinVoltage: 30,
    mpptMaxVoltage: 120,
    mpptCurrent: 50,
    maxChargingCurrent: 60,
    priceNGN: 420000,
    availability: "medium",
    description: "Entry-level 12V hybrid for small off-grid homes",
  },

  // ============================================================
  // 24V SYSTEMS (small-to-mid residential — up to ~2.5 kW)
  // ============================================================
  {
    brand: "Epever",
    model: "UPower 1000W 24V",
    type: "hybrid",
    ratedKVA: 1,
    ratedWatts: 1000,
    systemVoltage: 24,
    maxPVInputW: 1400,
    maxPVVoc: 145,
    mpptMinVoltage: 30,
    mpptMaxVoltage: 120,
    mpptCurrent: 40,
    maxChargingCurrent: 30,
    priceNGN: 340000,
    availability: "high",
    description: "Popular 24V hybrid inverter for small residential systems",
  },
  {
    brand: "Growatt",
    model: "SPF 3000TL HVM",
    type: "hybrid",
    ratedKVA: 3,
    ratedWatts: 3000,
    systemVoltage: 24,
    maxPVInputW: 4000,
    maxPVVoc: 145,
    mpptMinVoltage: 30,
    mpptMaxVoltage: 120,
    mpptCurrent: 60,
    maxChargingCurrent: 80,
    priceNGN: 750000,
    availability: "high",
    description: "Affordable 24V hybrid inverter for smaller systems",
  },
  {
    brand: "Victron",
    model: "MultiPlus 24/1200/25",
    type: "standalone",
    ratedKVA: 1.2,
    ratedWatts: 1200,
    systemVoltage: 24,
    maxPVInputW: 0,
    maxPVVoc: 0,
    mpptMinVoltage: 0,
    mpptMaxVoltage: 0,
    mpptCurrent: 0,
    maxChargingCurrent: 25,
    priceNGN: 680000,
    availability: "medium",
    description: "Premium 24V standalone inverter — requires external MPPT",
  },

  // ============================================================
  // 48V SYSTEMS (residential / small commercial)
  // ============================================================
  {
    brand: "Deye",
    model: "SUN-3K-SG03LP1",
    type: "hybrid",
    ratedKVA: 3,
    ratedWatts: 3000,
    systemVoltage: 48,
    maxPVInputW: 4000,
    maxPVVoc: 500,
    mpptMinVoltage: 150,
    mpptMaxVoltage: 425,
    mpptCurrent: 60,
    maxChargingCurrent: 80,
    priceNGN: 850000,
    availability: "high",
    description: "Single-phase hybrid inverter, ideal for small residential systems",
  },
  {
    brand: "Deye",
    model: "SUN-5K-SG03LP1",
    type: "hybrid",
    ratedKVA: 5,
    ratedWatts: 5000,
    systemVoltage: 48,
    maxPVInputW: 6500,
    maxPVVoc: 500,
    mpptMinVoltage: 150,
    mpptMaxVoltage: 425,
    mpptCurrent: 80,
    maxChargingCurrent: 100,
    priceNGN: 1200000,
    availability: "high",
    description: "Most popular hybrid inverter for Nigerian homes",
  },
  {
    brand: "Deye",
    model: "SUN-8K-SG03LP1",
    type: "hybrid",
    ratedKVA: 8,
    ratedWatts: 8000,
    systemVoltage: 48,
    maxPVInputW: 10400,
    maxPVVoc: 500,
    mpptMinVoltage: 150,
    mpptMaxVoltage: 425,
    mpptCurrent: 80,
    maxChargingCurrent: 150,
    priceNGN: 1800000,
    availability: "medium",
    description: "Large residential or small commercial system",
  },
  {
    brand: "Growatt",
    model: "SPF 5000TL HVM",
    type: "hybrid",
    ratedKVA: 5,
    ratedWatts: 5000,
    systemVoltage: 48,
    maxPVInputW: 6500,
    maxPVVoc: 145,
    mpptMinVoltage: 30,
    mpptMaxVoltage: 120,
    mpptCurrent: 80,
    maxChargingCurrent: 100,
    priceNGN: 1100000,
    availability: "high",
    description: "Popular 48V hybrid inverter for residential use",
  },
  {
    brand: "Growatt",
    model: "SPF 6000T DVM",
    type: "hybrid",
    ratedKVA: 6,
    ratedWatts: 6000,
    systemVoltage: 48,
    maxPVInputW: 7000,
    maxPVVoc: 145,
    mpptMinVoltage: 30,
    mpptMaxVoltage: 120,
    mpptCurrent: 80,
    maxChargingCurrent: 120,
    priceNGN: 1300000,
    availability: "medium",
    description: "Higher capacity hybrid inverter",
  },
  {
    brand: "Sungrow",
    model: "SH3K6",
    type: "hybrid",
    ratedKVA: 3.6,
    ratedWatts: 3600,
    systemVoltage: 48,
    maxPVInputW: 4680,
    maxPVVoc: 600,
    mpptMinVoltage: 150,
    mpptMaxVoltage: 550,
    mpptCurrent: 60,
    maxChargingCurrent: 80,
    priceNGN: 950000,
    availability: "medium",
    description: "Premium hybrid inverter with wide MPPT range",
  },
  {
    brand: "Sungrow",
    model: "SH5K",
    type: "hybrid",
    ratedKVA: 5,
    ratedWatts: 5000,
    systemVoltage: 48,
    maxPVInputW: 6500,
    maxPVVoc: 600,
    mpptMinVoltage: 150,
    mpptMaxVoltage: 550,
    mpptCurrent: 80,
    maxChargingCurrent: 100,
    priceNGN: 1400000,
    availability: "medium",
    description: "High-quality hybrid inverter with wide operating range",
  },
  {
    brand: "GoodWe",
    model: "GW3000-BP",
    type: "hybrid",
    ratedKVA: 3,
    ratedWatts: 3000,
    systemVoltage: 48,
    maxPVInputW: 3900,
    maxPVVoc: 550,
    mpptMinVoltage: 120,
    mpptMaxVoltage: 450,
    mpptCurrent: 60,
    maxChargingCurrent: 80,
    priceNGN: 880000,
    availability: "medium",
    description: "Compact hybrid inverter with wide MPPT range",
  },
  {
    brand: "GoodWe",
    model: "GW5000-BP",
    type: "hybrid",
    ratedKVA: 5,
    ratedWatts: 5000,
    systemVoltage: 48,
    maxPVInputW: 6500,
    maxPVVoc: 550,
    mpptMinVoltage: 120,
    mpptMaxVoltage: 450,
    mpptCurrent: 80,
    maxChargingCurrent: 100,
    priceNGN: 1250000,
    availability: "medium",
    description: "Reliable hybrid inverter with good support network",
  },
  {
    brand: "Sofar Solar",
    model: "HYD 3000",
    type: "hybrid",
    ratedKVA: 3,
    ratedWatts: 3000,
    systemVoltage: 48,
    maxPVInputW: 3900,
    maxPVVoc: 550,
    mpptMinVoltage: 120,
    mpptMaxVoltage: 450,
    mpptCurrent: 60,
    maxChargingCurrent: 80,
    priceNGN: 820000,
    availability: "medium",
    description: "Value-for-money hybrid inverter",
  },
  {
    brand: "Sofar Solar",
    model: "HYD 5000",
    type: "hybrid",
    ratedKVA: 5,
    ratedWatts: 5000,
    systemVoltage: 48,
    maxPVInputW: 6500,
    maxPVVoc: 550,
    mpptMinVoltage: 120,
    mpptMaxVoltage: 450,
    mpptCurrent: 80,
    maxChargingCurrent: 100,
    priceNGN: 1150000,
    availability: "medium",
    description: "Cost-effective hybrid inverter for residential use",
  },
  {
    brand: "Victron",
    model: "MultiPlus 48/3000/35",
    type: "standalone",
    ratedKVA: 3,
    ratedWatts: 3000,
    systemVoltage: 48,
    maxPVInputW: 0,
    maxPVVoc: 0,
    mpptMinVoltage: 0,
    mpptMaxVoltage: 0,
    mpptCurrent: 0,
    maxChargingCurrent: 35,
    priceNGN: 1200000,
    availability: "medium",
    description: "Premium 48V standalone inverter — requires external MPPT",
  },

  // ============================================================
  // HIGHER VOLTAGE (industrial / commercial, kept for reference)
  // ============================================================
  {
    brand: "Deye",
    model: "SUN-12K-SG04LP1",
    type: "hybrid",
    ratedKVA: 12,
    ratedWatts: 12000,
    systemVoltage: 48,
    maxPVInputW: 15600,
    maxPVVoc: 500,
    mpptMinVoltage: 200,
    mpptMaxVoltage: 425,
    mpptCurrent: 80,
    maxChargingCurrent: 200,
    priceNGN: 2500000,
    availability: "medium",
    description: "Commercial-grade hybrid inverter",
  },
];