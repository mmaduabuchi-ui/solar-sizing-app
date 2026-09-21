"use client";

import { useMemo, useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Zap,
  Sparkles,
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
import { Badge } from "@/components/ui/badge";

import { useSolarStore } from "@/store/solarStore";
import {
  calculateLoadAudit,
  type LoadAuditResult,
} from "@/lib/calculations/loadAudit";
import {
  calculateInverterSizing,
  type InverterSizingResult,
} from "@/lib/calculations/inverter";
import { recommendSystemVoltage } from "@/lib/voltageRecommendation";

const DEFAULT_WORKING_MARGIN = 1.25;
const DEFAULT_POWER_FACTOR = 0.8;

export default function Step3InverterSizing() {
  const {
    design,
    setPowerFactor,
    setSystemVoltage,
    setCurrentStep,
    completeStep,
    setWarnings,
    setErrors,
  } = useSolarStore();

  const [workingMarginInput, setWorkingMarginInput] = useState(
    String((DEFAULT_WORKING_MARGIN - 1) * 100)
  );

  const [powerFactorInput, setPowerFactorInput] = useState(
    String(design.powerFactor || DEFAULT_POWER_FACTOR)
  );

  const [calculation, setCalculation] =
    useState<InverterSizingResult | null>(null);

  const [calculationError, setCalculationError] =
    useState("");

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

  // ✅ Auto-recommend system voltage based on load size
  const voltageRecommendation = useMemo(() => {
    if (!loadAudit || loadAudit.totalRunningPowerW <= 0) return null;
    return recommendSystemVoltage(loadAudit.totalRunningPowerW, 0);
  }, [loadAudit]);

  // ✅ Auto-apply recommendation when load changes (only if user hasn't already selected inverter)
  useEffect(() => {
    if (
      voltageRecommendation &&
      !design.selectedInverter &&
      loadAudit
    ) {
      // Auto-set to recommended voltage if not manually overridden
      setSystemVoltage(voltageRecommendation.recommendedVoltage);
    }
  }, [voltageRecommendation, design.selectedInverter, loadAudit, setSystemVoltage]);

  function handleCalculate() {
    setCalculationError("");
    setWarnings([]);
    setErrors([]);
    setCalculation(null);

    if (!loadAudit) {
      const message =
        "A valid load audit is required before inverter sizing.";

      setCalculationError(message);
      setErrors([message]);
      return;
    }

    const workingMarginPercent =
      Number(workingMarginInput);

    const powerFactor =
      Number(powerFactorInput);

    if (
      !Number.isFinite(workingMarginPercent) ||
      workingMarginPercent < 0
    ) {
      const message =
        "Working margin must be 0% or greater.";

      setCalculationError(message);
      setErrors([message]);
      return;
    }

    if (
      !Number.isFinite(powerFactor) ||
      powerFactor <= 0 ||
      powerFactor > 1
    ) {
      const message =
        "Power factor must be greater than 0 and no greater than 1.";

      setCalculationError(message);
      setErrors([message]);
      return;
    }

    const workingMargin =
      1 + workingMarginPercent / 100;

    try {
      const result = calculateInverterSizing({
        loadAudit,
        workingMargin,
        powerFactor,
      });

      setPowerFactor(powerFactor);
      setCalculation(result);

      const warnings: string[] = [];

      if (!result.surgeDataAvailable) {
        warnings.push(
          "A confirmed manufacturer/measured starting surge value is not available. The displayed starting surge should not be treated as a verified surge requirement."
        );
      }

      if (result.requiredKVA <= 0) {
        warnings.push(
          "The calculated inverter requirement is invalid."
        );
      }

      setWarnings(warnings);
      setErrors([]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Inverter sizing calculation failed.";

      setCalculationError(message);
      setErrors([message]);
    }
  }

  function handleBack() {
    setCurrentStep(2);
  }

  function handleContinue() {
    if (!calculation) {
      const message =
        "Complete the inverter sizing calculation before continuing.";

      setCalculationError(message);
      setErrors([message]);
      return;
    }

    completeStep(3);
    setCurrentStep(4);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6" />

          <h2 className="text-2xl font-bold">
            Step 3: Inverter Sizing
          </h2>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          Determine the continuous inverter capacity required from
          the audited running load and power factor.
        </p>
      </div>

      {/* Engineering methodology */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="space-y-2 text-sm">
              <p className="font-medium">
                Inverter sizing methodology
              </p>

              <p className="text-muted-foreground">
                The application applies the working margin only to the
                continuous running load. It then converts the resulting
                watts into apparent power using the selected power factor.
              </p>

              <p className="text-muted-foreground">
                The working margin is <strong>not</strong> the inverter's
                surge rating. Starting surge is evaluated separately from
                the load-audit data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Load summary */}
      <Card>
        <CardHeader>
          <CardTitle>Load Audit Summary</CardTitle>
        </CardHeader>

        <CardContent>
          {!loadAudit ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-5 w-5" />

                No valid load audit available
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                Return to Step 1 and enter at least one valid appliance.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
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
                  Reported Starting Surge
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {loadAudit.totalSurgePowerW.toLocaleString()} W
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Number of Loads
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {loadAudit.loads.length}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ NEW: System Voltage Selection */}
      {voltageRecommendation && loadAudit && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              System Voltage Selection
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              AI-recommended based on your {loadAudit.totalRunningPowerW.toLocaleString()}W load.
              You can override if needed.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Recommended badge */}
            <div className="rounded-lg border-2 border-primary/50 bg-primary/5 p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <Badge className="bg-primary mb-2">AI Recommended</Badge>
                  <p className="text-2xl font-bold">
                    {voltageRecommendation.recommendedVoltage}V DC
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {voltageRecommendation.reason}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Current at this voltage</p>
                  <p className="text-3xl font-bold text-primary">
                    {(loadAudit.totalRunningPowerW / voltageRecommendation.recommendedVoltage).toFixed(0)}A
                  </p>
                  <Badge variant="outline" className="mt-1">
                    {voltageRecommendation.categoryLabel}
                  </Badge>
                </div>
              </div>
            </div>

            {/* All voltage options */}
            <div>
              <Label className="mb-3 block font-medium">
                All Voltage Options (click to override)
              </Label>
              <div className="grid gap-2 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
                {voltageRecommendation.alternatives.map((alt) => {
                  const isRecommended = alt.voltage === voltageRecommendation.recommendedVoltage;
                  const isSelected = alt.voltage === design.systemVoltage;

                  return (
                    <button
                      key={alt.voltage}
                      onClick={() => {
                        if (alt.isPractical) {
                          setSystemVoltage(alt.voltage);
                        }
                      }}
                      disabled={!alt.isPractical}
                      className={`relative rounded-lg border p-3 text-center transition ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                          : !alt.isPractical
                            ? "opacity-50 cursor-not-allowed border-red-500/30"
                            : "hover:bg-muted/50"
                      }`}
                    >
                      {isRecommended && (
                        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-xs whitespace-nowrap">
                          Best
                        </Badge>
                      )}
                      <p className="font-bold text-lg">{alt.voltage}V</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {alt.currentA.toFixed(0)}A
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        ~{alt.cableSizeMm2}mm²
                      </p>
                      {isSelected && (
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          Selected
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Warning for impractical selection */}
            {design.systemVoltage < voltageRecommendation.recommendedVoltage * 0.5 && (
              <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
                <div className="flex gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">
                      Why {voltageRecommendation.recommendedVoltage}V is recommended
                    </p>
                    <p className="text-muted-foreground mt-1">
                      At {design.systemVoltage}V, the current is{" "}
                      {(loadAudit.totalRunningPowerW / design.systemVoltage).toFixed(0)}A, which requires very large cables.
                      At {voltageRecommendation.recommendedVoltage}V, current drops to{" "}
                      {(loadAudit.totalRunningPowerW / voltageRecommendation.recommendedVoltage).toFixed(0)}A.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Inputs */}
      <Card>
        <CardHeader>
          <CardTitle>Inverter Design Parameters</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="working-margin">
                Continuous Working Margin (%)
              </Label>

              <Input
                id="working-margin"
                type="number"
                min="0"
                step="1"
                value={workingMarginInput}
                onChange={(event) =>
                  setWorkingMarginInput(event.target.value)
                }
              />

              <p className="text-xs text-muted-foreground">
                Default: 25% additional continuous-load headroom.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="power-factor">
                Power Factor
              </Label>

              <Input
                id="power-factor"
                type="number"
                min="0.01"
                max="1"
                step="0.01"
                value={powerFactorInput}
                onChange={(event) =>
                  setPowerFactorInput(event.target.value)
                }
              />

              <p className="text-xs text-muted-foreground">
                Default: 0.80.
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
            Calculate Inverter Requirement
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
      {calculation && (
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Inverter Sizing Result
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Main recommendation */}
            <div className="rounded-xl border p-6 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Minimum Continuous Inverter Requirement
              </p>

              <p className="mt-2 text-4xl font-bold">
                {calculation.requiredKVA.toFixed(2)} kVA
              </p>

              <p className="mt-2 text-sm text-muted-foreground">
                {calculation.requiredVABasedOnRunningLoad.toFixed(0)} VA
              </p>

              <Badge variant="outline" className="mt-3">
                System Voltage: {design.systemVoltage}V DC
              </Badge>
            </div>

            {/* Detailed calculation */}
            <div>
              <h3 className="mb-3 font-semibold">
                Calculation Breakdown
              </h3>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3 text-muted-foreground">
                        Total running power
                      </td>

                      <td className="p-3 text-right font-medium">
                        {calculation.totalRunningPowerW.toLocaleString()} W
                      </td>
                    </tr>

                    <tr className="border-b">
                      <td className="p-3 text-muted-foreground">
                        Working margin
                      </td>

                      <td className="p-3 text-right font-medium">
                        {(
                          (calculation.workingMargin - 1) *
                          100
                        ).toFixed(0)}
                        %
                      </td>
                    </tr>

                    <tr className="border-b">
                      <td className="p-3 text-muted-foreground">
                        Working load
                      </td>

                      <td className="p-3 text-right font-medium">
                        {calculation.workingLoadW.toFixed(1)} W
                      </td>
                    </tr>

                    <tr className="border-b">
                      <td className="p-3 text-muted-foreground">
                        Power factor
                      </td>

                      <td className="p-3 text-right font-medium">
                        {calculation.powerFactor.toFixed(2)}
                      </td>
                    </tr>

                    <tr className="border-b">
                      <td className="p-3 text-muted-foreground">
                        Required apparent power
                      </td>

                      <td className="p-3 text-right font-semibold">
                        {calculation.requiredVABasedOnRunningLoad.toFixed(
                          1
                        )}{" "}
                        VA
                      </td>
                    </tr>

                    <tr>
                      <td className="p-3 text-muted-foreground">
                        Reported starting surge
                      </td>

                      <td className="p-3 text-right font-semibold">
                        {calculation.startingSurgeW.toLocaleString()} W
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Surge warning */}
            {!calculation.surgeDataAvailable && (
              <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0" />

                  <div>
                    <p className="font-medium">
                      Starting Surge Requires Verification
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      The current surge value is not confirmed as a
                      manufacturer or measured starting surge. Verify
                      motor/compressor starting requirements before
                      selecting the final inverter.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Engineering note */}
            <div className="rounded-lg bg-muted/50 p-4 text-sm">
              <p className="font-medium">
                Important
              </p>

              <p className="mt-1 text-muted-foreground">
                This result establishes the minimum continuous inverter
                requirement. Final inverter selection must also verify
                surge capability, DC system voltage, PV input limits,
                MPPT operating range, battery compatibility, and other
                manufacturer specifications.
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
          Back to Energy Calculation
        </Button>

        <Button
          type="button"
          onClick={handleContinue}
          disabled={!calculation}
        >
          Continue to PV Sizing
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}