// src/lib/controllerDatabase.ts
export interface ControllerProduct {
  brand: string;
  model: string;
  type: "pwm" | "mppt" | "built-in-mppt";
  currentA: number;
  voltageV: number;
  priceNGN?: number;
  availability?: "high" | "medium" | "low";
  description?: string;
}

export const CONTROLLER_DATABASE: ControllerProduct[] = [
  // ========================================
  // MPPT Controllers
  // ========================================
  {
    brand: "Victron",
    model: "SmartSolar 100/20",
    type: "mppt",
    currentA: 20,
    voltageV: 100,
    priceNGN: 350000,
    availability: "high",
    description: "Premium MPPT for small to medium systems"
  },
  {
    brand: "Victron",
    model: "SmartSolar 150/35",
    type: "mppt",
    currentA: 35,
    voltageV: 150,
    priceNGN: 550000,
    availability: "high",
    description: "High-end MPPT for medium systems"
  },
  {
    brand: "Victron",
    model: "SmartSolar 150/70",
    type: "mppt",
    currentA: 70,
    voltageV: 150,
    priceNGN: 850000,
    availability: "medium",
    description: "Large MPPT for commercial systems"
  },
  {
    brand: "Epever",
    model: "Tracer 4210AN",
    type: "mppt",
    currentA: 40,
    voltageV: 150,
    priceNGN: 250000,
    availability: "high",
    description: "Popular MPPT for Nigerian residential systems"
  },
  {
    brand: "Epever",
    model: "Tracer 6415AN",
    type: "mppt",
    currentA: 60,
    voltageV: 150,
    priceNGN: 380000,
    availability: "medium",
    description: "Large MPPT for commercial systems"
  },
  {
    brand: "Outback",
    model: "Flexmax 60",
    type: "mppt",
    currentA: 60,
    voltageV: 150,
    priceNGN: 450000,
    availability: "medium",
    description: "Professional-grade MPPT"
  },
  {
    brand: "Sungrow",
    model: "MPPT 50A",
    type: "mppt",
    currentA: 50,
    voltageV: 150,
    priceNGN: 280000,
    availability: "medium",
    description: "Reliable MPPT for residential systems"
  },

  // ========================================
  // PWM Controllers
  // ========================================
  {
    brand: "Epever",
    model: "LS2024B",
    type: "pwm",
    currentA: 20,
    voltageV: 24,
    priceNGN: 80000,
    availability: "high",
    description: "Budget PWM for small systems"
  },
  {
    brand: "Epever",
    model: "LS3024B",
    type: "pwm",
    currentA: 30,
    voltageV: 24,
    priceNGN: 120000,
    availability: "high",
    description: "PWM for medium small systems"
  },
  {
    brand: "Morningstar",
    model: "SunKeeper 20A",
    type: "pwm",
    currentA: 20,
    voltageV: 24,
    priceNGN: 100000,
    availability: "medium",
    description: "Reliable PWM for small systems"
  },
  {
    brand: "Steca",
    model: "Solsum 20A",
    type: "pwm",
    currentA: 20,
    voltageV: 24,
    priceNGN: 90000,
    availability: "medium",
    description: "European PWM for small systems"
  },
];