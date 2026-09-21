"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useSolarStore } from "@/store/solarStore";
import {
  calculateLoadAudit,
  type LoadAuditResult,
} from "@/lib/calculations/loadAudit";
import {
  calculateEnergy,
  type EnergyCalculationResult,
} from "@/lib/calculations/energy";

export default function Step2EnergyCalculation() {
  const {
    design,
    setPeakSunHours,
    setPerformanceRatio,
    setSystemLossFactor,
    setEnergyCalculation,
    setCurrentStep,
    completeStep,
    setWarnings,
    setErrors,
  } = useSolarStore();

  const [calculationError, setCalculationError] = useState("");
  const [hasCalculated, setHasCalculated] = useState(
    Boolean(design.energyCalculation)
  );

  /*
   * Recalculate the load audit from the loads stored in the central store.
   * Step 2 therefore always works from the latest Step 1 data.
   */
  const loadAudit = useMemo<LoadAuditResult | null>(() => {
    try {
      if (!design.loads.length) {
        return null;
      }

      return calculateLoadAudit(design.loads);
    } catch {
      return null;
    }
  }, [design.loads]);

  const previousCalculation = design.energyCalculation;

  const [peakSunHoursInput, setPeakSunHoursInput] = useState(
    String(design.peakSunHours)
  );

  const [performanceRatioInput, setPerformanceRatioInput] = useState(
    String(design.performanceRatio * 100)
  );

  const [systemLossInput, setSystemLossInput] = useState(
    String(design.systemLossFactor * 100)
  );

  function handleCalculate() {
    setCalculationError("");
    setWarnings([]);
    setErrors([]);

    if (!loadAudit) {
      const message =
        "A valid load audit is required before energy calculation.";

      setCalculationError(message);
      setErrors([message]);
      setHasCalculated(false);
      return;
    }

    const peakSunHours = Number(peakSunHoursInput);
    const performanceRatioPercent = Number(performanceRatioInput);
    const systemLossPercent = Number(systemLossInput);

    if (
      !Number.isFinite(peakSunHours) ||
      peakSunHours <= 0
    ) {
      const message =
        "Peak Sun Hours must be greater than 0.";

      setCalculationError(message);
      setErrors([message]);
      setHasCalculated(false);
      return;
    }

    if (
      !Number.isFinite(performanceRatioPercent) ||
      performanceRatioPercent <= 0 ||
      performanceRatioPercent > 100
    ) {
      const message =
        "Performance Ratio must be greater than 0% and no greater than 100%.";

      setCalculationError(message);
      setErrors([message]);
      setHasCalculated(false);
      return;
    }

    if (
      !Number.isFinite(systemLossPercent) ||
      systemLossPercent < 0 ||
      systemLossPercent >= 100
    ) {
      const message =
        "Additional system loss must be between 0% and less than 100%.";

      setCalculationError(message);
      setErrors([message]);
      setHasCalculated(false);
      return;
    }

    try {
      const performanceRatio =
        performanceRatioPercent / 100;

      const systemLossFactor =
        systemLossPercent / 100;

      const result: EnergyCalculationResult =
        calculateEnergy({
          loadAudit,
          systemLossFactor,
          peakSunHours,
          performanceRatio,
        });

      setPeakSunHours(peakSunHours);
      setPerformanceRatio(performanceRatio);
      setSystemLossFactor(systemLossFactor);
      setEnergyCalculation(result);

      setWarnings([]);
      setErrors([]);
      setHasCalculated(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Energy calculation failed.";

      setCalculationError(message);
      setErrors([message]);
      setHasCalculated(false);
    }
  }

  function handleBack() {
    setCurrentStep(1);
  }

  function handleContinue() {
    if (!hasCalculated || !design.energyCalculation) {
      const message =
        "Complete and validate the energy calculation before continuing.";

      setCalculationError(message);
      setErrors([message]);
      return;
    }

    completeStep(2);
    setCurrentStep(3);
  }

  const calculation = previousCalculation;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6" />
          <h2 className="text-2xl font-bold">
            Step 2: Energy Calculation
          </h2>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          Convert the audited load into the daily design energy
          requirement and calculate the required PV generation capacity.
        </p>
      </div>

      {/* Methodology notice */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="space-y-1 text-sm">
              <p className="font-medium">
                Engineering calculation method
              </p>

              <p className="text-muted-foreground">
                The system calculates daily load energy first, then applies
                any explicitly entered additional system losses. The
                Performance Ratio is then used with Peak Sun Hours to
                determine the required PV capacity.
              </p>

              <p className="text-muted-foreground">
                Keep additional system loss at <strong>0%</strong> when
                normal PV-system losses are already represented by the
                Performance Ratio. This prevents double counting.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Load audit summary */}
      <Card>
        <CardHeader>
          <CardTitle>Load Audit Summary</CardTitle>
        </CardHeader>

        <CardContent>
          {!loadAudit ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-5 w-5" />
                No valid load audit available
              </div>

              <p className="mt-1 text-muted-foreground">
                Return to Step 1 and enter at least one valid appliance.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Appliances
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {loadAudit.loads.length}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Total Running Power
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {loadAudit.totalRunningPowerW.toLocaleString()} W
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Daily Load Energy
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {loadAudit.totalDailyEnergyWh.toLocaleString()} Wh/day
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calculation inputs */}
      <Card>
        <CardHeader>
          <CardTitle>Energy Design Parameters</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-3">
            {/* Peak Sun Hours */}
            <div className="space-y-2">
              <Label htmlFor="peak-sun-hours">
                Peak Sun Hours
              </Label>

              <Input
                id="peak-sun-hours"
                type="number"
                min="0.1"
                step="0.1"
                value={peakSunHoursInput}
                onChange={(event) =>
                  setPeakSunHoursInput(event.target.value)
                }
              />

              <p className="text-xs text-muted-foreground">
                Default: 4 hours/day
              </p>
            </div>

            {/* Performance Ratio */}
            <div className="space-y-2">
              <Label htmlFor="performance-ratio">
                Performance Ratio (%)
              </Label>

              <Input
                id="performance-ratio"
                type="number"
                min="1"
                max="100"
                step="1"
                value={performanceRatioInput}
                onChange={(event) =>
                  setPerformanceRatioInput(event.target.value)
                }
              />

              <p className="text-xs text-muted-foreground">
                Default: 65%
              </p>
            </div>

            {/* Additional system losses */}
            <div className="space-y-2">
              <Label htmlFor="system-loss">
                Additional System Loss (%)
              </Label>

              <Input
                id="system-loss"
                type="number"
                min="0"
                max="99"
                step="1"
                value={systemLossInput}
                onChange={(event) =>
                  setSystemLossInput(event.target.value)
                }
              />

              <p className="text-xs text-muted-foreground">
                Default: 0%
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleCalculate}
            disabled={!loadAudit}
            className="w-full md:w-auto"
          >
            <Zap className="mr-2 h-4 w-4" />
            Calculate Energy Requirement
          </Button>
        </CardContent>
      </Card>

      {/* Error */}
      {calculationError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />

              <div>
                <p className="font-medium">
                  Calculation Error
                </p>

                <p className="mt-1 text-sm">
                  {calculationError}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculation results */}
      {calculation && hasCalculated && (
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Energy Calculation Result
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Main result */}
            <div className="rounded-xl border p-6 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Required PV Power
              </p>

              <p className="mt-2 text-4xl font-bold">
                {calculation.requiredPVPowerKW.toFixed(2)} kWp
              </p>

              <p className="mt-2 text-sm text-muted-foreground">
                {calculation.requiredPVPowerW.toFixed(1)} W
              </p>
            </div>

            {/* Breakdown */}
            <div>
              <h3 className="mb-3 font-semibold">
                Calculation Breakdown
              </h3>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3 text-muted-foreground">
                        Daily load energy
                      </td>

                      <td className="p-3 text-right font-medium">
                        {calculation.dailyLoadEnergyWh.toLocaleString(
                          undefined,
                          {
                            maximumFractionDigits: 2,
                          }
                        )}{" "}
                        Wh/day
                      </td>
                    </tr>

                    <tr className="border-b">
                      <td className="p-3 text-muted-foreground">
                        Additional system losses
                      </td>

                      <td className="p-3 text-right font-medium">
                        {calculation.systemLossEnergyWh.toLocaleString(
                          undefined,
                          {
                            maximumFractionDigits: 2,
                          }
                        )}{" "}
                        Wh/day
                      </td>
                    </tr>

                    <tr className="border-b">
                      <td className="p-3 text-muted-foreground">
                        Design energy
                      </td>

                      <td className="p-3 text-right font-semibold">
                        {calculation.designEnergyWh.toLocaleString(
                          undefined,
                          {
                            maximumFractionDigits: 2,
                          }
                        )}{" "}
                        Wh/day
                      </td>
                    </tr>

                    <tr className="border-b">
                      <td className="p-3 text-muted-foreground">
                        Design energy
                      </td>

                      <td className="p-3 text-right font-semibold">
                        {calculation.designEnergyKWh.toFixed(2)} kWh/day
                      </td>
                    </tr>

                    <tr className="border-b">
                      <td className="p-3 text-muted-foreground">
                        Peak Sun Hours
                      </td>

                      <td className="p-3 text-right font-medium">
                        {calculation.peakSunHours.toFixed(2)} h/day
                      </td>
                    </tr>

                    <tr className="border-b">
                      <td className="p-3 text-muted-foreground">
                        Performance Ratio
                      </td>

                      <td className="p-3 text-right font-medium">
                        {(calculation.performanceRatio * 100).toFixed(1)}%
                      </td>
                    </tr>

                    <tr>
                      <td className="p-3 text-muted-foreground">
                        Additional system loss
                      </td>

                      <td className="p-3 text-right font-medium">
                        {(calculation.systemLossFactor * 100).toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Formula explanation */}
            <div className="rounded-lg bg-muted/50 p-4 text-sm">
              <p className="font-medium">
                PV sizing basis
              </p>

              <p className="mt-1 text-muted-foreground">
                Design energy is divided by Peak Sun Hours and the
                Performance Ratio to determine the minimum PV generation
                capacity required for the calculated daily demand.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Load Audit
        </Button>

        <Button
          type="button"
          onClick={handleContinue}
          disabled={!hasCalculated || !design.energyCalculation}
        >
          Continue to Inverter Sizing
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}