// src/lib/panelMatching.ts
import { PANEL_DATABASE, PanelProduct } from "./panelDatabase";

export interface PanelMatchingResult {
  suggested: PanelProduct | null;
  alternatives: PanelProduct[];
  matchScore: number;
  reason: string;
  allMatches: Array<{
    panel: PanelProduct;
    score: number;
    details: {
      powerMatch: number;
      efficiencyMatch: number;
      voltageMatch: boolean;
      priceMatch: boolean;
      availabilityMatch: boolean;
    };
  }>;
}

export interface PanelMatchingCriteria {
  requiredPVPowerW: number;
  inverter?: {
    maxPVVoc: number;
    mpptMinVoltage: number;
    mpptMaxVoltage: number;
  };
  maxBudget?: number;
  preferredBrands?: string[];
  minEfficiency?: number;
  maxPanelCount?: number;
}

export function findBestPanels(
  criteria: PanelMatchingCriteria,
): PanelMatchingResult {
  let candidates = PANEL_DATABASE;

  // --- Basic filters ---

  // Efficiency floor
  if (criteria.minEfficiency) {
    candidates = candidates.filter(
      (panel) => (panel.efficiency || 0) >= (criteria.minEfficiency || 0),
    );
  }

  // Budget cap
  if (criteria.maxBudget) {
    candidates = candidates.filter(
      (panel) => (panel.priceNGN || Infinity) <= (criteria.maxBudget || Infinity),
    );
  }

  // Inverter voltage limits — hard filter
  if (criteria.inverter) {
    candidates = candidates.filter((panel) => {
      // Max Voc check
      if (panel.voc > criteria.inverter!.maxPVVoc) return false;

      // How many in series can we fit within MPPT range?
      const minSeries = Math.ceil(
        criteria.inverter!.mpptMinVoltage / panel.vmp,
      );
      const maxSeries = Math.floor(
        criteria.inverter!.mpptMaxVoltage / panel.vmp,
      );

      // Need at least 1 viable series count
      return minSeries <= maxSeries && minSeries >= 1;
    });
  }

  // --- Scoring ---
  const scored = candidates.map((panel) => {
    let score = 0;
    const details = {
      powerMatch: 0,
      efficiencyMatch: 0,
      voltageMatch: false,
      priceMatch: false,
      availabilityMatch: false,
    };

    // 1. Power Match (40 points max)
    const panelsNeeded = Math.ceil(criteria.requiredPVPowerW / panel.pmaxW);
    const arrayPower = panelsNeeded * panel.pmaxW;
    const oversizing = arrayPower / criteria.requiredPVPowerW;

    if (oversizing >= 1 && oversizing <= 1.2) {
      score += 40;
      details.powerMatch = 40;
    } else if (oversizing > 1.2 && oversizing <= 1.4) {
      score += 30;
      details.powerMatch = 30;
    } else if (oversizing > 1.4 && oversizing <= 1.6) {
      score += 20;
      details.powerMatch = 20;
    } else if (oversizing > 1.6) {
      score += 10;
      details.powerMatch = 10;
    }

    // 2. Efficiency Match (20 points)
    if (panel.efficiency) {
      if (panel.efficiency >= 21) {
        score += 20;
        details.efficiencyMatch = 20;
      } else if (panel.efficiency >= 20) {
        score += 15;
        details.efficiencyMatch = 15;
      } else if (panel.efficiency >= 19) {
        score += 10;
        details.efficiencyMatch = 10;
      }
    }

    // 3. Voltage Match with Inverter (15 points) + voltage-window bonus/penalty
    if (criteria.inverter) {
      const maxVocCheck = panel.voc <= criteria.inverter.maxPVVoc;

      if (maxVocCheck) {
        score += 15;
        details.voltageMatch = true;
      } else {
        // Voc too high — shouldn't reach here because of the hard filter,
        // but keep this defensively.
        details.voltageMatch = false;
      }

      // ✅ NEW: Voltage-window scoring for small systems
      //
      // For small systems (MPPT floor < 30V — i.e. 12V or 24V inverters),
      // strongly prefer panels whose Vmp sits in the "small-system friendly"
      // band (roughly 1.0× to 1.5× the MPPT floor).
      //
      // This prevents 48V-class panels (Vmp ~40V) from dominating the
      // suggestions on a 12V system, where the MPPT would have to buck
      // 41.5V → ~13V.
      const mpptFloor = criteria.inverter.mpptMinVoltage;

      if (mpptFloor < 30) {
        // Small-system context (12V or 24V)
        if (panel.vmp <= 25) {
          // True 12V/24V panel
          score += 25;
        } else if (panel.vmp <= 40) {
          // Mid-range panel — usable but not ideal
          score -= 5;
        } else {
          // 48V+ class panel on a small system — penalize
          score -= 25;
        }
      } else {
        // Larger system context (48V+ inverters)
        // Prefer Vmp in the mid-range relative to the MPPT floor
        const ratio = panel.vmp / mpptFloor;
        if (ratio >= 1.0 && ratio <= 1.5) {
          score += 20;
        } else if (ratio > 3.0) {
          score -= 15;
        }
      }
    } else {
      // No inverter context — give a neutral voltage score
      score += 15;
      details.voltageMatch = true;
    }

    // 4. Price Match (15 points)
    if (panel.priceNGN) {
      const avgPricePerWatt = 500; // NGN per Watt
      const pricePerWatt = panel.priceNGN / panel.pmaxW;
      if (pricePerWatt <= avgPricePerWatt * 1.1) {
        score += 15;
        details.priceMatch = true;
      } else if (pricePerWatt <= avgPricePerWatt * 1.3) {
        score += 8;
      }
    }

    // 5. Availability (10 points)
    if (panel.availability === "high") {
      score += 10;
      details.availabilityMatch = true;
    } else if (panel.availability === "medium") {
      score += 5;
    }

    return { panel, score, details };
  });

  // --- Sort & pick ---
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  const alternatives = scored.slice(1, 4);

  // --- Human-readable reason ---
  let reason = "";
  if (best && best.score >= 70) {
    reason = `${best.panel.brand} ${best.panel.model} is an excellent match for your system!`;
  } else if (best && best.score >= 50) {
    reason = `${best.panel.brand} ${best.panel.model} is a good match. Consider verifying specifications.`;
  } else if (best && best.score > 0) {
    reason = `${best.panel.brand} ${best.panel.model} may work, but verify all specifications carefully.`;
  } else {
    reason = "No matching panel found. Try adjusting your requirements or consider manual entry.";
  }

  // Add a specific note about oversizing/panel count
  if (best) {
    const panelsNeeded = Math.ceil(
      criteria.requiredPVPowerW / best.panel.pmaxW,
    );
    const arrayPower = panelsNeeded * best.panel.pmaxW;
    const oversizing = arrayPower / criteria.requiredPVPowerW;

    if (oversizing > 1.5) {
      reason += ` You'll need ${panelsNeeded} panels (${arrayPower}W), which is significantly oversized. Consider a higher wattage panel.`;
    } else if (panelsNeeded > 10) {
      reason += ` You'll need ${panelsNeeded} panels. Consider higher wattage panels to reduce count.`;
    }
  }

  return {
    suggested: best ? best.panel : null,
    alternatives: alternatives.map((a) => a.panel),
    matchScore: best ? best.score : 0,
    reason,
    allMatches: scored,
  };
}