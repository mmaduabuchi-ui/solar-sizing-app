// src/lib/controllerMatching.ts
import { CONTROLLER_DATABASE, ControllerProduct } from "./controllerDatabase";

export interface ControllerMatchingResult {
  suggested: ControllerProduct | null;
  alternatives: ControllerProduct[];
  matchScore: number;
  reason: string;
  allMatches: Array<{
    controller: ControllerProduct;
    score: number;
    details: {
      currentMatch: boolean;
      voltageMatch: boolean;
      typeMatch: boolean;
      priceMatch: boolean;
      availabilityMatch: boolean;
    };
  }>;
}

export interface ControllerMatchingCriteria {
  requiredCurrentA: number;
  requiredVoltageV: number;
  systemVoltage: number;
  arrayPowerW: number;
  maxBudget?: number;
}

export function findBestController(
  criteria: ControllerMatchingCriteria
): ControllerMatchingResult {
  let candidates = CONTROLLER_DATABASE;
  
  // Determine recommended type based on system size
  const recommendedType = criteria.arrayPowerW <= 300 ? "pwm" : "mppt";
  
  // Filter by type based on system size
  candidates = candidates.filter(
    controller => controller.type === recommendedType
  );
  
  // Filter by budget
  if (criteria.maxBudget) {
    candidates = candidates.filter(
      controller => (controller.priceNGN || Infinity) <= (criteria.maxBudget || Infinity)
    );
  }
  
  // Score each candidate
  const scored = candidates.map(controller => {
    let score = 0;
    const details = {
      currentMatch: false,
      voltageMatch: false,
      typeMatch: false,
      priceMatch: false,
      availabilityMatch: false,
    };
    
    // 1. Current Rating Match (35 points)
    if (controller.currentA >= criteria.requiredCurrentA) {
      score += 35;
      details.currentMatch = true;
    } else if (controller.currentA >= criteria.requiredCurrentA * 0.8) {
      score += 20;
      details.currentMatch = false;
    }
    
    // 2. Voltage Rating Match (25 points)
    if (controller.voltageV >= criteria.requiredVoltageV) {
      score += 25;
      details.voltageMatch = true;
    } else if (controller.voltageV >= criteria.requiredVoltageV * 0.8) {
      score += 15;
      details.voltageMatch = false;
    }
    
    // 3. Type Match (15 points)
    if (controller.type === recommendedType) {
      score += 15;
      details.typeMatch = true;
    } else {
      details.typeMatch = false;
    }
    
    // 4. Price Match (15 points)
    if (controller.priceNGN) {
      const avgPrice = recommendedType === "pwm" ? 100000 : 350000;
      if (controller.priceNGN <= avgPrice * 1.2) {
        score += 15;
        details.priceMatch = true;
      } else if (controller.priceNGN <= avgPrice * 1.5) {
        score += 8;
        details.priceMatch = false;
      }
    }
    
    // 5. Availability (10 points)
    if (controller.availability === "high") {
      score += 10;
      details.availabilityMatch = true;
    } else if (controller.availability === "medium") {
      score += 5;
      details.availabilityMatch = false;
    }
    
    return { controller, score, details };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  const best = scored[0];
  const alternatives = scored.slice(1, 3);
  
  let reason = "";
  if (best && best.score >= 70) {
    reason = `${best.controller.brand} ${best.controller.model} is an excellent match for your ${criteria.arrayPowerW}W system!`;
  } else if (best && best.score >= 50) {
    reason = `${best.controller.brand} ${best.controller.model} is a good match for your system.`;
  } else if (best && best.score > 0) {
    reason = `${best.controller.brand} ${best.controller.model} may work, but verify specifications carefully.`;
  } else {
    reason = `No ${recommendedType.toUpperCase()} controllers found. Try adjusting your requirements.`;
  }
  
  // Add sizing recommendation
  if (best && best.controller.currentA < criteria.requiredCurrentA) {
    reason += ` Required current is ${criteria.requiredCurrentA.toFixed(1)}A, but this controller is rated for ${best.controller.currentA}A. Consider a larger controller.`;
  }
  
  return {
    suggested: best ? best.controller : null,
    alternatives: alternatives.map(a => a.controller),
    matchScore: best ? best.score : 0,
    reason,
    allMatches: scored,
  };
}