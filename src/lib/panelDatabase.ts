// src/lib/panelDatabase.ts
export interface PanelProduct {
  brand: string;
  model: string;
  pmaxW: number;
  voc: number;
  vmp: number;
  isc: number;
  imp: number;
  efficiency?: number;
  dimensions?: string;
  weight?: string;
  priceNGN?: number;
  availability?: "high" | "medium" | "low";
  warranty?: string;
  description?: string;
}

export const PANEL_DATABASE: PanelProduct[] = [
  // ============================================================
  // SMALL PANELS — ideal for 12V / 24V systems
  // ============================================================
  {
    brand: "Renogy",
    model: "RNG-100D",
    pmaxW: 100,
    voc: 22.3,
    vmp: 18.6,
    isc: 5.86,
    imp: 5.38,
    efficiency: 15.4,
    dimensions: "1062 x 531 x 35mm",
    weight: "6.5kg",
    priceNGN: 85000,
    availability: "high",
    warranty: "25 years",
    description: "Classic 100W mono panel — perfect for 12V systems",
  },
  {
    brand: "Renogy",
    model: "RNG-150D",
    pmaxW: 150,
    voc: 22.6,
    vmp: 18.9,
    isc: 8.78,
    imp: 7.94,
    efficiency: 16.0,
    dimensions: "1465 x 662 x 35mm",
    weight: "9.6kg",
    priceNGN: 125000,
    availability: "high",
    warranty: "25 years",
    description: "150W mono panel for larger 12V or smaller 24V systems",
  },
  {
    brand: "Renogy",
    model: "RNG-200D",
    pmaxW: 200,
    voc: 22.9,
    vmp: 19.2,
    isc: 11.6,
    imp: 10.42,
    efficiency: 17.0,
    dimensions: "1491 x 794 x 35mm",
    weight: "12.5kg",
    priceNGN: 165000,
    availability: "high",
    warranty: "25 years",
    description: "200W panel — ideal for 24V systems",
  },
  {
    brand: "Jinko",
    model: "JKM250M-60",
    pmaxW: 250,
    voc: 37.4,
    vmp: 30.9,
    isc: 8.74,
    imp: 8.09,
    efficiency: 18.2,
    dimensions: "1650 x 992 x 35mm",
    weight: "18.5kg",
    priceNGN: 145000,
    availability: "medium",
    warranty: "25 years",
    description: "250W panel — good value for smaller hybrid systems",
  },
  {
    brand: "Canadian Solar",
    model: "CS3U-280P",
    pmaxW: 280,
    voc: 38.5,
    vmp: 31.8,
    isc: 9.68,
    imp: 8.81,
    efficiency: 17.1,
    dimensions: "1650 x 992 x 35mm",
    weight: "18.2kg",
    priceNGN: 165000,
    availability: "medium",
    warranty: "25 years",
    description: "280W poly panel for 24V residential systems",
  },

  // ============================================================
  // MID-SIZE PANELS — for 24V / 48V systems
  // ============================================================
  {
    brand: "Jinko",
    model: "JKM440N-54HL4",
    pmaxW: 440,
    voc: 37.2,
    vmp: 31.3,
    isc: 13.5,
    imp: 12.8,
    efficiency: 20.5,
    dimensions: "1722 x 1134 x 30mm",
    weight: "22.5kg",
    priceNGN: 220000,
    availability: "high",
    warranty: "25 years",
    description: "Popular 440W panel, excellent performance in Nigerian conditions",
  },
  {
    brand: "Longi",
    model: "LR5-54HTH-430M",
    pmaxW: 430,
    voc: 37.1,
    vmp: 31.1,
    isc: 13.6,
    imp: 12.9,
    efficiency: 20.2,
    dimensions: "1722 x 1134 x 30mm",
    weight: "22.0kg",
    priceNGN: 210000,
    availability: "high",
    warranty: "25 years",
    description: "Reliable 430W panel, good value for money",
  },
  {
    brand: "Canadian Solar",
    model: "CS3W-445P",
    pmaxW: 445,
    voc: 37.8,
    vmp: 31.6,
    isc: 13.7,
    imp: 13.0,
    efficiency: 20.1,
    dimensions: "1722 x 1134 x 30mm",
    weight: "22.3kg",
    priceNGN: 215000,
    availability: "high",
    warranty: "25 years",
    description: "Reliable 445W panel with good performance",
  },
  {
    brand: "Trina Solar",
    model: "TSM-430NEG9R.28",
    pmaxW: 430,
    voc: 37.5,
    vmp: 31.5,
    isc: 13.8,
    imp: 13.1,
    efficiency: 21.0,
    dimensions: "1722 x 1134 x 30mm",
    weight: "22.0kg",
    priceNGN: 218000,
    availability: "medium",
    warranty: "25 years",
    description: "Quality 430W panel with good efficiency",
  },
  {
    brand: "JA Solar",
    model: "JAM54S30-440MR",
    pmaxW: 440,
    voc: 37.3,
    vmp: 31.4,
    isc: 13.6,
    imp: 12.9,
    efficiency: 20.3,
    dimensions: "1722 x 1134 x 30mm",
    weight: "22.1kg",
    priceNGN: 212000,
    availability: "high",
    warranty: "25 years",
    description: "Popular 440W panel, good value option",
  },
  {
    brand: "Sunking",
    model: "SK-450M",
    pmaxW: 450,
    voc: 40.2,
    vmp: 33.5,
    isc: 14.0,
    imp: 13.4,
    efficiency: 20.0,
    dimensions: "1722 x 1134 x 30mm",
    weight: "22.0kg",
    priceNGN: 200000,
    availability: "high",
    warranty: "20 years",
    description: "Value-for-money panel, popular in Nigerian market",
  },

  // ============================================================
  // HIGH-POWER PANELS — for 48V+ systems
  // ============================================================
  {
    brand: "Jinko",
    model: "JKM500N-72HL4",
    pmaxW: 500,
    voc: 49.2,
    vmp: 41.5,
    isc: 13.4,
    imp: 12.7,
    efficiency: 21.4,
    dimensions: "2278 x 1134 x 30mm",
    weight: "28.5kg",
    priceNGN: 260000,
    availability: "high",
    warranty: "25 years",
    description: "High-power panel, ideal for larger residential systems",
  },
  {
    brand: "Longi",
    model: "LR5-72HTH-545M",
    pmaxW: 545,
    voc: 49.5,
    vmp: 41.8,
    isc: 14.1,
    imp: 13.4,
    efficiency: 21.3,
    dimensions: "2278 x 1134 x 30mm",
    weight: "28.2kg",
    priceNGN: 275000,
    availability: "high",
    warranty: "25 years",
    description: "Popular 545W panel with excellent efficiency",
  },
  {
    brand: "JA Solar",
    model: "JAM72S30-545MR",
    pmaxW: 545,
    voc: 49.4,
    vmp: 41.6,
    isc: 14.0,
    imp: 13.3,
    efficiency: 21.1,
    dimensions: "2278 x 1134 x 30mm",
    weight: "28.0kg",
    priceNGN: 268000,
    availability: "high",
    warranty: "25 years",
    description: "Reliable 545W panel with competitive pricing",
  },
];

// Helper functions
export function getPanelsByBrand(brand: string): PanelProduct[] {
  return PANEL_DATABASE.filter(
    (panel) => panel.brand.toLowerCase() === brand.toLowerCase(),
  );
}

export function getPanelsByPowerRange(minW: number, maxW: number): PanelProduct[] {
  return PANEL_DATABASE.filter(
    (panel) => panel.pmaxW >= minW && panel.pmaxW <= maxW,
  );
}

export function getPanelsByEfficiency(minEfficiency: number): PanelProduct[] {
  return PANEL_DATABASE.filter(
    (panel) => (panel.efficiency || 0) >= minEfficiency,
  );
}