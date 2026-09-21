// src/lib/batteryMatching.ts
import { BATTERY_DATABASE, BatteryProduct } from "./batteryDatabase";

export interface BatteryMatchingResult {
  suggested: BatteryProduct | null;
  alternatives: BatteryProduct[];
  matchScore: number;
  reason: string;
  allMatches: Array<{
    battery: BatteryProduct;
    score: number;
    details: {
      capacityMatch: number;
      voltageMatch: boolean;
      typeMatch: boolean;
      priceMatch: boolean;
      availabilityMatch: boolean;
      warrantyMatch: boolean;
    };
  }>;
}

export interface BatteryMatchingCriteria {
  batteryType: "lithium" | "tubular";
  systemVoltage: number;
  requiredCapacityKWh: number;
  requiredCapacityAh: number;
  maxBudget?: number;
  preferredBrands?: string[];
  minWarrantyYears?: number;
  minCycleLife?: number;
}

/**
 * Find the best battery from the database for the given criteria.
 *
 * Strategy:
 *   1. Filter by battery type (lithium | tubular).
 *   2. Filter by voltage that CAN form the system voltage:
 *      - Single battery voltage ≤ system voltage
 *      - systemVoltage must be an integer multiple of battery voltage
 *      - e.g. 12V battery → valid for 12V, 24V, 48V banks
 *        24V battery → valid for 24V, 48V banks
 *        48V battery → valid for 48V banks only
 *   3. Score remaining candidates on capacity, price, availability, warranty.
 *   4. Preferred-vendor bonus: Sunlux / YuFai Aurora products receive a
 *      small scoring uplift so they rank first when specs are comparable.
 *   5. Return best match + alternatives + reasons.
 */
export function findBestBattery(
  criteria: BatteryMatchingCriteria,
): BatteryMatchingResult {
  // --- Step 1: type filter ---
  let candidates = BATTERY_DATABASE.filter(
    (b) => b.type === criteria.batteryType,
  );

  // --- Step 2: voltage compatibility filter (allows series combinations) ---
  if (criteria.systemVoltage && criteria.systemVoltage > 0) {
    candidates = candidates.filter((b) => {
      if (!b.voltage || b.voltage <= 0) return false;
      if (b.voltage > criteria.systemVoltage) return false;
      return criteria.systemVoltage % b.voltage === 0;
    });
  }

  // --- Optional filters ---
  if (criteria.maxBudget) {
    candidates = candidates.filter(
      (b) => (b.priceNGN || Infinity) <= (criteria.maxBudget || Infinity),
    );
  }

  if (criteria.minWarrantyYears) {
    candidates = candidates.filter((b) => {
      const years = parseInt(b.warranty?.match(/\d+/)?.[0] || "0", 10);
      return years >= (criteria.minWarrantyYears || 0);
    });
  }

  if (criteria.minCycleLife) {
    candidates = candidates.filter(
      (b) => (b.cycleLife || 0) >= (criteria.minCycleLife || 0),
    );
  }

  // --- Step 3: score each candidate ---
  const scored = candidates.map((battery) => {
    let score = 0;
    const details = {
      capacityMatch: 0,
      voltageMatch: false,
      typeMatch: false,
      priceMatch: false,
      availabilityMatch: false,
      warrantyMatch: false,
    };

    // 1. Capacity Match (40 points max)
    //    - lithium: compare kWh
    //    - tubular: compare Ah
    let capacityRatio = 0;
    if (criteria.batteryType === "lithium") {
      if (criteria.requiredCapacityKWh > 0 && battery.capacityKWh) {
        capacityRatio = battery.capacityKWh / criteria.requiredCapacityKWh;
      }
    } else {
      if (criteria.requiredCapacityAh > 0 && battery.capacityAh) {
        capacityRatio = battery.capacityAh / criteria.requiredCapacityAh;
      }
    }

    if (capacityRatio >= 1 && capacityRatio <= 1.3) {
      score += 40;
      details.capacityMatch = 40;
    } else if (capacityRatio > 1.3 && capacityRatio <= 1.5) {
      score += 30;
      details.capacityMatch = 30;
    } else if (capacityRatio >= 0.8 && capacityRatio < 1) {
      score += 20;
      details.capacityMatch = 20;
    } else if (capacityRatio > 1.5) {
      score += 10;
      details.capacityMatch = 10;
    }

    // 2. Voltage Match (15 points direct, 10 for series-compatible)
    if (battery.voltage === criteria.systemVoltage) {
      score += 15;
      details.voltageMatch = true;
    } else if (
      battery.voltage &&
      criteria.systemVoltage % battery.voltage === 0
    ) {
      score += 10;
      details.voltageMatch = true;
    }

    // 3. Type Match (10 points)
    if (battery.type === criteria.batteryType) {
      score += 10;
      details.typeMatch = true;
    }

    // 4. Price Match (15 points)
    if (battery.priceNGN) {
      const avgPrice =
        criteria.batteryType === "lithium" ? 1_000_000 : 350_000;
      if (battery.priceNGN <= avgPrice * 1.2) {
        score += 15;
        details.priceMatch = true;
      } else if (battery.priceNGN <= avgPrice * 1.5) {
        score += 8;
      }
    }

    // 4b. Preferred-vendor bonus (Sunlux / YuFai Aurora)
    //
    // Small scoring uplift so featured partner products rank first
    // when their specs are comparable to the competition. This does
    // NOT override a genuinely better capacity/voltage match — it only
    // breaks ties in favour of the partner lineup.
    const brandLc = battery.brand.toLowerCase();
    if (brandLc.includes("sunlux") || brandLc.includes("yufai")) {
      score += 15;
    }

    // 5. Availability (10 points)
    if (battery.availability === "high") {
      score += 10;
      details.availabilityMatch = true;
    } else if (battery.availability === "medium") {
      score += 5;
    }

    // 6. Warranty (10 points)
    if (battery.warranty) {
      const years = parseInt(battery.warranty.match(/\d+/)?.[0] || "0", 10);
      if (years >= 8) {
        score += 10;
        details.warrantyMatch = true;
      } else if (years >= 5) {
        score += 5;
      }
    }

    return { battery, score, details };
  });

  // --- Step 4: sort and build result ---
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  const alternatives = scored.slice(1, 4);

  let reason = "";
  if (!best) {
    reason = `No matching ${criteria.batteryType} battery found for a ${criteria.systemVoltage}V system. Try Manual Entry.`;
  } else if (best.score >= 60) {
    reason = `${best.battery.brand} ${best.battery.model} is an excellent match for your system.`;
  } else if (best.score >= 40) {
    reason = `${best.battery.brand} ${best.battery.model} is a good match. Verify specifications.`;
  } else if (best.score > 0) {
    reason = `${best.battery.brand} ${best.battery.model} may work, but verify specifications carefully.`;
  } else {
    reason = "No strong match. Consider manual entry.";
  }

  if (
    best &&
    best.details.capacityMatch > 0 &&
    best.details.capacityMatch < 30
  ) {
    reason += " Consider a battery with closer capacity matching.";
  }

  return {
    suggested: best ? best.battery : null,
    alternatives: alternatives.map((a) => a.battery),
    matchScore: best ? best.score : 0,
    reason,
    allMatches: scored,
  };
}