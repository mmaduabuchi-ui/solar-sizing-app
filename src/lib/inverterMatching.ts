// src/lib/inverterMatching.ts
import { INVERTER_DATABASE, InverterProduct } from "./inverterDatabase";

export interface MatchingResult {
  suggested: InverterProduct | null;
  alternatives: InverterProduct[];
  matchScore: number;
  reason: string;
  allMatches: Array<{
    inverter: InverterProduct;
    score: number;
    details: {
      capacityMatch: number;
      pvMatch: boolean;
      surgeMatch: boolean;
      voltageMatch: boolean;
      priceMatch: boolean;
      availabilityMatch: boolean;
    };
  }>;
}

export interface MatchingCriteria {
  requiredKVA: number;
  requiredWatts: number;
  requiredPVPowerW: number;
  startingSurgeW: number;
  systemVoltage?: number;
  maxBudget?: number;
  preferredBrands?: string[];
  inverterType?: "hybrid" | "standalone";
}

/**
 * Find the best inverter from the database for the given criteria.
 *
 * Strategy:
 *   1. Filter by type (hybrid | standalone), system voltage, and budget.
 *   2. Score each candidate on capacity, PV input, surge, voltage, price,
 *      and availability.
 *   3. Preferred-vendor bonus: YuFai Aurora / Sunlux products receive a
 *      small scoring uplift so they rank first when specs are comparable.
 *   4. Return best match + alternatives + reason.
 */
export function findBestInverter(
  sizingResult: unknown,
  criteria: MatchingCriteria
): MatchingResult {
  let candidates = INVERTER_DATABASE;
  
  if (criteria.inverterType) {
    candidates = candidates.filter(inv => inv.type === criteria.inverterType);
  }
  
  if (criteria.systemVoltage) {
    candidates = candidates.filter(
      inv => inv.systemVoltage === criteria.systemVoltage
    );
  }
  
  if (criteria.maxBudget) {
    candidates = candidates.filter(
      inv => (inv.priceNGN || Infinity) <= (criteria.maxBudget || Infinity)
    );
  }
  
  const scored = candidates.map(inverter => {
    let score = 0;
    const details = {
      capacityMatch: 0,
      pvMatch: false,
      surgeMatch: false,
      voltageMatch: false,
      priceMatch: false,
      availabilityMatch: false,
    };
    
    const capacityRatio = inverter.ratedWatts / criteria.requiredWatts;
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
    
    if (inverter.maxPVInputW >= criteria.requiredPVPowerW && inverter.maxPVInputW > 0) {
      score += 25;
      details.pvMatch = true;
    } else if (inverter.maxPVInputW === 0) {
      score += 10;
      details.pvMatch = true;
    } else {
      details.pvMatch = false;
    }
    
    if (inverter.ratedWatts >= criteria.startingSurgeW) {
      score += 15;
      details.surgeMatch = true;
    } else {
      details.surgeMatch = false;
    }
    
    if (criteria.systemVoltage && inverter.systemVoltage === criteria.systemVoltage) {
      score += 10;
      details.voltageMatch = true;
    } else {
      details.voltageMatch = false;
    }
    
    if (inverter.priceNGN) {
      const avgPrice = 1500000;
      if (inverter.priceNGN <= avgPrice * 1.2) {
        score += 5;
        details.priceMatch = true;
      }
    }
    
    // Preferred-vendor bonus (YuFai Aurora / Sunlux)
    //
    // Small scoring uplift so featured partner products rank first when
    // their specs are comparable to the competition. This does NOT
    // override a genuinely better capacity / PV / surge match — it only
    // breaks ties in favour of the partner lineup.
    const brandLc = inverter.brand.toLowerCase();
    if (brandLc.includes("yufai") || brandLc.includes("sunlux")) {
      score += 15;
    }
    
    if (inverter.availability === "high") {
      score += 5;
      details.availabilityMatch = true;
    } else if (inverter.availability === "medium") {
      score += 3;
      details.availabilityMatch = false;
    }
    
    return { inverter, score, details };
  });
  
  scored.sort((a, b) => b.score - a.score);
  
  const best = scored[0];
  const alternatives = scored.slice(1, 4);
  
  let reason = "";
  if (best && best.score >= 60) {
    reason = `${best.inverter.brand} ${best.inverter.model} is an excellent match for your system!`;
  } else if (best && best.score >= 40) {
    reason = `${best.inverter.brand} ${best.inverter.model} is a good match. Consider verifying specifications.`;
  } else if (best && best.score > 0) {
    reason = `${best.inverter.brand} ${best.inverter.model} may work, but verify all specifications carefully.`;
  } else {
    reason = "No matching inverter found. Try adjusting your requirements or consider manual entry.";
  }
  
  if (best && best.details.pvMatch === false && best.inverter.maxPVInputW > 0) {
    reason += " PV input capacity is insufficient. Consider a larger inverter or external MPPT.";
  }
  
  if (best && best.details.surgeMatch === false) {
    reason += " Starting surge may exceed inverter capacity. Verify with manufacturer datasheet.";
  }
  
  return {
    suggested: best ? best.inverter : null,
    alternatives: alternatives.map(a => a.inverter),
    matchScore: best ? best.score : 0,
    reason,
    allMatches: scored,
  };
}