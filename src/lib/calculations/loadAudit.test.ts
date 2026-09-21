import { describe, expect, it } from "vitest";
import { calculateLoadAudit } from "./loadAudit";
import type { LoadItem } from "@/types/solar";

describe("Load Audit", () => {
  it("calculates the Skyrun deep freezer example correctly", () => {
    const loads: LoadItem[] = [
      {
        id: "freezer-1",
        appliance: "Skyrun Deep Freezer",
        powerW: 220,
        quantity: 1,
        hoursPerDay: 24,
        critical: true,
      },
    ];

    const result = calculateLoadAudit(loads);

    expect(result.totalRunningPowerW).toBe(220);
    expect(result.totalDailyEnergyWh).toBe(5280);
  });

  it("calculates multiple appliances correctly", () => {
    const loads: LoadItem[] = [
      {
        id: "load-1",
        appliance: "Freezer",
        powerW: 220,
        quantity: 1,
        hoursPerDay: 24,
      },
      {
        id: "load-2",
        appliance: "TV",
        powerW: 100,
        quantity: 2,
        hoursPerDay: 5,
      },
    ];

    const result = calculateLoadAudit(loads);

    expect(result.totalRunningPowerW).toBe(420);
    expect(result.totalDailyEnergyWh).toBe(6280);
  });

  it("rejects operating hours greater than 24", () => {
    const loads: LoadItem[] = [
      {
        id: "invalid-1",
        appliance: "Invalid Appliance",
        powerW: 100,
        quantity: 1,
        hoursPerDay: 25,
      },
    ];

    expect(() => calculateLoadAudit(loads)).toThrow();
  });

  it("rejects zero watt appliances", () => {
    const loads: LoadItem[] = [
      {
        id: "invalid-2",
        appliance: "Invalid Appliance",
        powerW: 0,
        quantity: 1,
        hoursPerDay: 5,
      },
    ];

    expect(() => calculateLoadAudit(loads)).toThrow();
  });
});