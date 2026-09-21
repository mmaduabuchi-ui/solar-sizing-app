"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Sun,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useSolarStore } from "@/store/solarStore";
import { calculatePVSizing } from "@/lib/calculations/pvSizing";
import type { PVSizingResult } from "@/lib/calculations/pvSizing";

export default function Step4PanelSizing() {
  const {
    design,
    setCurrentStep,
    completeStep,
    setWarnings,
    setErrors,
  } = useSolarStore();

  const [calculation, setCalculation] =
    useState<PVSizingResult | null>(
      null
    );

  const [calculationError, setCalculationError] =
    useState("");

  /*
   * Step 4 must use the stored Step 2 energy result.
   *
   * We intentionally do not recalculate energy here.
   */
  const energyCalculation =
    design.energyCalculation;

  /*
   * Automatically calculate PV sizing when a valid
   * Step 2 result is available.
   */
  const initialCalculation =
    useMemo<PVSizingResult | null>(() => {
      if (!energyCalculation) {
        return null;
      }

      try {
        return calculatePVSizing({
          energyCalculation,
        });
      } catch {
        return null;
      }
    }, [energyCalculation]);

  const activeCalculation =
    calculation ?? initialCalculation;

  function handleCalculate() {
    setCalculationError("");
    setWarnings([]);
    setErrors([]);
    setCalculation(null);

    if (!energyCalculation) {
      const message =
        "A valid energy calculation is required before PV sizing.";

      setCalculationError(message);
      setErrors([message]);
      return;
    }

    try {
      const result = calculatePVSizing({
        energyCalculation,
      });

      setCalculation(result);

      setWarnings([]);
      setErrors([]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "PV sizing calculation failed.";

      setCalculationError(message);
      setErrors([message]);
    }
  }

  function handleBack() {
    setCurrentStep(3);
  }

  function handleContinue() {
    if (!activeCalculation) {
      const message =
        "Complete the PV sizing calculation before continuing.";

      setCalculationError(message);
      setErrors([message]);
      return;
    }

    completeStep(4);
    setCurrentStep(5);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Sun className="h-6 w-6" />

          <h2 className="text-2xl font-bold">
            Step 4: PV / Panel Sizing
          </h2>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          Determine the minimum photovoltaic generation capacity
          required to meet the calculated daily energy demand.
        </p>
      </div>

      {/* Methodology */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="space-y-2 text-sm">
              <p className="font-medium">
                PV sizing methodology
              </p>

              <p className="text-muted-foreground">
                The required PV capacity is calculated from the
                design energy, Peak Sun Hours, and Performance Ratio.
              </p>

              <p className="text-muted-foreground">
                This step does not select the number or arrangement
                of physical panels. Those decisions will be handled
                in the later panel-selection and panel-arrangement
                stages.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dependency status */}
      <Card>
        <CardHeader>
          <CardTitle>Step 2 Input Verification</CardTitle>
        </CardHeader>

        <CardContent>
          {!energyCalculation ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-5 w-5" />

                Energy calculation unavailable
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                Complete Step 2 before calculating the required PV
                capacity.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Design Energy
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {energyCalculation.designEnergyKWh.toFixed(2)} kWh/day
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Peak Sun Hours
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {energyCalculation.peakSunHours.toFixed(2)} h/day
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Performance Ratio
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {(
                    energyCalculation.performanceRatio * 100
                  ).toFixed(1)}
                  %
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calculate button */}
      <Card>
        <CardHeader>
          <CardTitle>PV Capacity Calculation</CardTitle>
        </CardHeader>

        <CardContent>
          <Button
            type="button"
            onClick={handleCalculate}
            disabled={!energyCalculation}
            className="w-full md:w-auto"
          >
            <Sun className="mr-2 h-4 w-4" />
            Calculate Required PV Capacity
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

      {/* Results */}
      {activeCalculation && (
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              PV Sizing Result
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Main result */}
            <div className="rounded-xl border p-6 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Minimum Required PV Capacity
              </p>

              <p className="mt-2 text-4xl font-bold">
                {activeCalculation.requiredPVPowerKW.toFixed(2)} kWp
              </p>

              <p className="mt-2 text-sm text-muted-foreground">
                {activeCalculation.requiredPVPowerW.toFixed(1)} W
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
                        Design energy
                      </td>

                      <td className="p-3 text-right font-medium">
                        {activeCalculation.designEnergyWh.toLocaleString(
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
                        Peak Sun Hours
                      </td>

                      <td className="p-3 text-right font-medium">
                        {activeCalculation.peakSunHours.toFixed(2)} h/day
                      </td>
                    </tr>

                    <tr className="border-b">
                      <td className="p-3 text-muted-foreground">
                        Performance Ratio
                      </td>

                      <td className="p-3 text-right font-medium">
                        {(
                          activeCalculation.performanceRatio * 100
                        ).toFixed(1)}
                        %
                      </td>
                    </tr>

                    <tr>
                      <td className="p-3 font-medium">
                        Required PV power
                      </td>

                      <td className="p-3 text-right font-bold">
                        {activeCalculation.requiredPVPowerW.toFixed(1)} W
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Formula explanation */}
            <div className="rounded-lg bg-muted/50 p-4 text-sm">
              <p className="font-medium">
                Engineering interpretation
              </p>

              <p className="mt-1 text-muted-foreground">
                The calculated PV capacity represents the minimum
                generation capacity required under the selected
                solar resource and performance assumptions. The final
                physical panel array may be larger after considering
                available panel ratings, inverter PV limits, string
                voltage, MPPT limits, current limits, and array
                oversizing requirements.
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
          Back to Inverter Sizing
        </Button>

        <Button
          type="button"
          onClick={handleContinue}
          disabled={!activeCalculation}
        >
          Continue to Inverter Selection
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}