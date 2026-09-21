// src/components/steps/Step8ChargeController.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Zap,
  Battery,
  Sun,
  Sparkles,
  Building2,
  Gauge,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { useSolarStore } from "@/store/solarStore";
import { calculateChargeControllerSizing } from "@/lib/calculations/chargeController";
import { findBestController } from "@/lib/controllerMatching";
import type { ControllerProduct } from "@/lib/controllerDatabase";
import type { ChargeControllerType } from "@/types/solar";

export default function Step8ChargeController() {
  const {
    design,
    setChargeControllerType,
    setChargeControllerSizing,
    completeStep,
    setCurrentStep,
    setWarnings,
    setErrors,
  } = useSolarStore();

  const [selectedType, setSelectedType] = useState<ChargeControllerType>(
    design.chargeControllerType || "mppt"
  );
  const [mode, setMode] = useState<"manual" | "smart">(
    design.chargeControllerSizing ? "manual" : "smart"
  );
  const [calculationError, setCalculationError] = useState("");
  const [hasCalculated, setHasCalculated] = useState(!!design.chargeControllerSizing);

  const [smartSuggestion, setSmartSuggestion] = useState<ReturnType<typeof findBestController> | null>(null);
  const [computedSuggestionKey, setComputedSuggestionKey] = useState<string | null>(null);

  const selectedPanel = design.selectedPanel;
  const panelArrangement = design.panelArrangement;
  const inverter = design.selectedInverter;
  const systemVoltage = inverter?.systemVoltage || design.systemVoltage || 24;
  const isHybrid = inverter?.type === "hybrid";
  const hasBuiltInMPPT = isHybrid && (inverter?.mpptCurrent || 0) > 0;
  const mpptCount = inverter?.mpptCount || 1;
  const totalMpptCurrent = (inverter?.mpptCurrent || 0) * mpptCount;

  const panelCount = panelArrangement?.selectedArrangement?.panelCount || 0;
  const panelsInSeries = panelArrangement?.selectedArrangement?.panelsInSeries || 0;
  const parallelStrings = panelArrangement?.selectedArrangement?.parallelStrings || 0;
  const arrayPowerW = panelArrangement?.selectedArrangement?.arrayPowerW || 0;
  const arrayIscA = panelArrangement?.selectedArrangement?.arrayIscA || 0;

  const sizingResult = useMemo(() => {
    if (!selectedPanel || !panelArrangement || panelCount === 0) return null;

    try {
      return calculateChargeControllerSizing({
        controllerType: selectedType,
        systemVoltage,
        panelCount,
        panelsInSeries,
        selectedPanel,
        selectedInverter: selectedType === "built-in-mppt" ? inverter : undefined,
        safetyFactor: 1.25,
        vocSafetyFactor: 1.15,
      });
    } catch (error) {
      console.error("Charge controller calculation failed:", error);
      return null;
    }
  }, [selectedPanel, panelArrangement, panelCount, panelsInSeries, selectedType, systemVoltage, inverter]);

  /**
   * Key that uniquely identifies the current suggestion request. When any
   * input that should trigger a new suggestion changes, this key changes.
   * Until the corresponding suggestion has been computed, the UI shows a
   * loading state (derived, not stored).
   */
  const suggestionKey = useMemo(() => {
    if (mode !== "smart" || !sizingResult || isHybrid) return null;
    return [
      sizingResult.requiredControllerCurrentA,
      sizingResult.requiredControllerVoltageV,
      systemVoltage,
      arrayPowerW,
    ].join("|");
  }, [mode, sizingResult, isHybrid, systemVoltage, arrayPowerW]);

  const isLoadingSuggestions =
    suggestionKey !== null && suggestionKey !== computedSuggestionKey;

  useEffect(() => {
    if (suggestionKey === null) return;
    if (suggestionKey === computedSuggestionKey) return;
    if (!sizingResult) return;

    const timer = setTimeout(() => {
      const suggestion = findBestController({
        requiredCurrentA: sizingResult.requiredControllerCurrentA,
        requiredVoltageV: sizingResult.requiredControllerVoltageV,
        systemVoltage,
        arrayPowerW,
        maxBudget: 500000,
      });
      setSmartSuggestion(suggestion);
      setComputedSuggestionKey(suggestionKey);
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionKey]);

  const handleTypeSelect = (type: ChargeControllerType) => {
    setSelectedType(type);
    setChargeControllerType(type);
    setHasCalculated(false);
    setCalculationError("");
    setWarnings([]);
    setErrors([]);
  };

  const handleApplySuggestion = (suggested: ControllerProduct) => {
    setSelectedType(suggested.type);
    setChargeControllerType(suggested.type);
    setHasCalculated(false);
    setCalculationError("");
    setWarnings([]);
    setErrors([]);
  };

  const handleCalculate = () => {
    setCalculationError("");
    setWarnings([]);
    setErrors([]);

    if (!selectedPanel) {
      setCalculationError("Select a panel first (Step 8).");
      return;
    }

    if (!panelArrangement || !panelArrangement.selectedArrangement) {
      setCalculationError("Complete the panel arrangement first (Step 9).");
      return;
    }

    if (!sizingResult) {
      setCalculationError("Could not calculate charge controller sizing.");
      return;
    }

    setChargeControllerSizing(sizingResult);
    setHasCalculated(true);

    if (sizingResult.warnings.length > 0) {
      setWarnings(sizingResult.warnings);
    }

    if (sizingResult.errors.length > 0) {
      setErrors(sizingResult.errors);
      setCalculationError(sizingResult.errors[0]);
      return;
    }
  };

  const handleContinue = () => {
    if (!hasCalculated || !design.chargeControllerSizing) {
      setCalculationError("Calculate the charge controller first.");
      return;
    }

    if (design.chargeControllerSizing.errors.length > 0) {
      setCalculationError(design.chargeControllerSizing.errors[0]);
      return;
    }

    completeStep(10);
    setCurrentStep(11);
  };

  const handleBack = () => {
    setCurrentStep(9);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat("en-NG", {
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getRecommendedType = (powerW: number): ChargeControllerType => {
    if (powerW <= 300) return "pwm";
    return "mppt";
  };

  const recommendedType = getRecommendedType(arrayPowerW);
  const isPWMRecommended = recommendedType === "pwm";

  const hasPrerequisites = selectedPanel && panelArrangement;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Step 10: Charge Controller</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Select and size the charge controller for your PV array.
        </p>
      </div>

      {/* Prerequisites Check */}
      {!hasPrerequisites && (
        <Card className="border-amber-500/50">
          <CardContent className="pt-6">
            <div className="flex gap-3 text-amber-600">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">Prerequisites Required</p>
                <p className="text-sm text-muted-foreground">
                  Complete Step 8 (Panel Selection) and Step 9 (Panel Arrangement) first.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Panel Array Configuration */}
      {hasPrerequisites && (
        <Card>
          <CardHeader>
            <CardTitle>Panel Array Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Panel</p>
                <p className="font-semibold text-sm">
                  {selectedPanel.brand} {selectedPanel.model}
                </p>
                <p className="text-xs text-muted-foreground">{selectedPanel.pmaxW}W</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Array Power</p>
                <p className="font-semibold">{formatNumber(arrayPowerW)} W</p>
                {/* ✅ FIX: S = panelsInSeries, P = parallelStrings */}
                <p className="text-xs text-muted-foreground">
                  {panelsInSeries}S × {parallelStrings}P
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Array Isc</p>
                <p className="font-semibold">{formatNumber(arrayIscA)} A</p>
                <p className="text-xs text-muted-foreground">
                  Short circuit current
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Recommended Type</p>
                <p className="font-semibold uppercase">
                  {isPWMRecommended ? "PWM" : "MPPT"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPWMRecommended ? "Best for ≤300W" : "Best for >300W"}
                </p>
              </div>
              <div className="rounded-lg border p-3 border-primary/50 bg-primary/5">
                <p className="text-xs text-muted-foreground">System Voltage</p>
                <p className="font-semibold text-primary">{systemVoltage} V</p>
                <p className="text-xs text-muted-foreground">
                  {mpptCount > 1 ? `${mpptCount} MPPT trackers` : "Single MPPT"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* HYBRID INVERTER - Built-in MPPT Check */}
      {isHybrid && hasBuiltInMPPT && (
        <Card className="border-blue-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Hybrid Inverter Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4">
              <p className="font-medium text-blue-700 dark:text-blue-300">
                Your {inverter.brand} {inverter.model} has a built-in MPPT controller!
              </p>
              <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                Using the built-in MPPT saves money and simplifies installation.
              </p>
            </div>

            {/* MPPT Configuration Grid */}
            <div className="grid gap-2 md:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">MPPT Trackers</p>
                <p className="font-semibold text-lg">{mpptCount}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Current per Tracker</p>
                <p className="font-semibold text-lg">{inverter.mpptCurrent} A</p>
              </div>
              <div className="rounded-lg border p-3 border-primary/50 bg-primary/5">
                <p className="text-xs text-muted-foreground">Total MPPT Capacity</p>
                <p className="font-semibold text-lg text-primary">
                  {totalMpptCurrent} A
                </p>
                <p className="text-xs text-muted-foreground">
                  {mpptCount} × {inverter.mpptCurrent}A
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">MPPT Voltage Range</p>
                <p className="font-semibold text-lg">
                  {inverter.mpptMinVoltage}-{inverter.mpptMaxVoltage} V
                </p>
              </div>
            </div>

            <Button
              onClick={() => handleTypeSelect("built-in-mppt")}
              className={selectedType === "built-in-mppt" ? "border-primary bg-primary/5" : ""}
            >
              <Zap className="mr-2 h-4 w-4" />
              {selectedType === "built-in-mppt" ? "✓ Using Built-in MPPT" : "Use Built-in MPPT"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STANDALONE INVERTER - Smart Suggestions */}
      {!isHybrid && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Selection Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMode("smart")}
                  className={`rounded-lg border p-5 text-left transition ${
                    mode === "smart"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">Smart Suggestion</h4>
                    <Badge variant="secondary" className="ml-auto">AI-Powered</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Get AI-powered recommendations based on your system
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className={`rounded-lg border p-5 text-left transition ${
                    mode === "manual"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    <h4 className="font-semibold">Manual Entry</h4>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enter controller specifications manually
                  </p>
                </button>
              </div>
            </CardContent>
          </Card>

          {mode === "smart" && (
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI-Powered Controller Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingSuggestions ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      <p className="text-sm text-muted-foreground">Finding the best controller...</p>
                    </div>
                  </div>
                ) : smartSuggestion && smartSuggestion.suggested ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border-2 border-primary/50 p-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-bold">
                              {smartSuggestion.suggested.brand} {smartSuggestion.suggested.model}
                            </h4>
                            <Badge className="bg-primary">Best Match</Badge>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Match Score:</span>
                            <span className="font-semibold text-primary">{smartSuggestion.matchScore}%</span>
                          </div>
                          <p className="mt-2 text-sm">{smartSuggestion.reason}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant="outline">{smartSuggestion.suggested.currentA} A</Badge>
                            <Badge variant="outline">{smartSuggestion.suggested.voltageV} V</Badge>
                            <Badge variant="outline" className="uppercase">{smartSuggestion.suggested.type}</Badge>
                            {smartSuggestion.suggested.priceNGN && (
                              <Badge variant="secondary">₦{smartSuggestion.suggested.priceNGN.toLocaleString()}</Badge>
                            )}
                          </div>
                        </div>
                        <Button onClick={() => handleApplySuggestion(smartSuggestion.suggested!)}>
                          Select This
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">Calculate system first to see recommendations.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {mode === "manual" && (
            <Card>
              <CardHeader>
                <CardTitle>Select Controller Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleTypeSelect("mppt")}
                    className={`rounded-lg border p-4 text-left transition ${
                      selectedType === "mppt"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Sun className="h-5 w-5" />
                        <h4 className="font-semibold">MPPT</h4>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">Maximum Power Point Tracking</p>
                      <p className="mt-2 text-xs text-muted-foreground">20-30% more efficient • Handles higher voltages</p>
                      {!isPWMRecommended && <Badge className="mt-2 bg-green-500">Recommended</Badge>}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeSelect("pwm")}
                    className={`rounded-lg border p-4 text-left transition ${
                      selectedType === "pwm"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Battery className="h-5 w-5" />
                        <h4 className="font-semibold">PWM</h4>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">Pulse Width Modulation</p>
                      <p className="mt-2 text-xs text-muted-foreground">Lower cost • Suitable for small systems (≤300W)</p>
                      {isPWMRecommended && <Badge className="mt-2 bg-green-500">Recommended</Badge>}
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Calculate Button */}
      {hasPrerequisites && (
        <Card>
          <CardHeader>
            <CardTitle>Calculate Controller Size</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCalculate} className="w-full md:w-auto">
              <Zap className="mr-2 h-4 w-4" />
              Calculate Charge Controller
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {calculationError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">Calculation Error</p>
                <p className="mt-1 text-sm">{calculationError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {hasCalculated && design.chargeControllerSizing && (
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Charge Controller Sizing Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ✅ FIX: Main Results — different display for built-in MPPT */}
            {design.chargeControllerSizing.controllerType === "built-in-mppt" ? (
              <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-700 dark:text-blue-300">
                      Built-in MPPT used — no external controller required
                    </p>
                    <p className="text-muted-foreground mt-1">
                      The inverter&apos;s internal MPPT handles charge control. See the
                      Inverter MPPT Validation table below for actual operating values.
                    </p>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="rounded border bg-background p-2">
                        <p className="text-muted-foreground">Array Power</p>
                        <p className="font-semibold text-sm">
                          {formatNumber(design.chargeControllerSizing.arrayPowerW)} W
                        </p>
                      </div>
                      <div className="rounded border bg-background p-2">
                        <p className="text-muted-foreground">String Voc</p>
                        <p className="font-semibold text-sm">
                          {formatNumber(design.chargeControllerSizing.stringVocV)} V
                        </p>
                      </div>
                      <div className="rounded border bg-background p-2">
                        <p className="text-muted-foreground">String Vmp</p>
                        <p className="font-semibold text-sm">
                          {formatNumber(design.chargeControllerSizing.stringVmpV)} V
                        </p>
                      </div>
                      <div className="rounded border bg-background p-2">
                        <p className="text-muted-foreground">Array Isc × 1.25</p>
                        <p className="font-semibold text-sm">
                          {formatNumber(design.chargeControllerSizing.arrayIscA * 1.25)} A
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground">Required Controller Current</p>
                  <p className="mt-1 text-3xl font-bold">
                    {formatNumber(design.chargeControllerSizing.requiredControllerCurrentA)} A
                  </p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground">Required Controller Voltage</p>
                  <p className="mt-1 text-3xl font-bold">
                    {formatNumber(design.chargeControllerSizing.requiredControllerVoltageV)} V
                  </p>
                </div>
              </div>
            )}

            {/* MPPT Distribution (only for multi-MPPT inverters) */}
            {design.chargeControllerSizing.mpptCount &&
             design.chargeControllerSizing.mpptCount > 1 && (
              <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
                <h4 className="flex items-center gap-2 font-semibold mb-3">
                  <Gauge className="h-5 w-5 text-primary" />
                  MPPT Distribution
                </h4>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border bg-background p-3 text-center">
                    <p className="text-xs text-muted-foreground">MPPT Trackers</p>
                    <p className="text-2xl font-bold text-primary">
                      {design.chargeControllerSizing.mpptCount}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-background p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Capacity</p>
                    <p className="text-2xl font-bold text-primary">
                      {design.chargeControllerSizing.totalMpptCurrentA?.toFixed(0)} A
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {design.chargeControllerSizing.mpptCount} × {inverter?.mpptCurrent}A
                    </p>
                  </div>
                  <div className="rounded-lg border bg-background p-3 text-center">
                    <p className="text-xs text-muted-foreground">Per MPPT Current</p>
                    <p className="text-2xl font-bold text-green-600">
                      {design.chargeControllerSizing.currentPerMpptA?.toFixed(1)} A
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Limit: {inverter?.mpptCurrent} A ✅
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Inverter MPPT Validation */}
            {(design.chargeControllerSizing.inverterPVLimitPass !== undefined ||
              design.chargeControllerSizing.inverterMPPTVoltagePass !== undefined ||
              design.chargeControllerSizing.inverterMPPTCurrentPass !== undefined ||
              design.chargeControllerSizing.inverterPVVocPass !== undefined) && (
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold mb-3">Inverter MPPT Validation</h4>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className={`flex items-center justify-between rounded-lg border p-3 ${
                    design.chargeControllerSizing.inverterPVLimitPass ? 'border-green-500/50 bg-green-500/5' : 'border-destructive/50 bg-destructive/5'
                  }`}>
                    <div>
                      <p className="text-sm font-medium">PV Input Power</p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(arrayPowerW)} W / {inverter?.maxPVInputW} W
                      </p>
                    </div>
                    <span className={design.chargeControllerSizing.inverterPVLimitPass ? 'text-green-600' : 'text-destructive'}>
                      {design.chargeControllerSizing.inverterPVLimitPass ? '✅' : '❌'}
                    </span>
                  </div>

                  <div className={`flex items-center justify-between rounded-lg border p-3 ${
                    design.chargeControllerSizing.inverterMPPTVoltagePass ? 'border-green-500/50 bg-green-500/5' : 'border-destructive/50 bg-destructive/5'
                  }`}>
                    <div>
                      <p className="text-sm font-medium">MPPT Voltage</p>
                      <p className="text-xs text-muted-foreground">
                        {panelArrangement?.selectedArrangement?.stringVmpV.toFixed(1)} V / {inverter?.mpptMinVoltage}-{inverter?.mpptMaxVoltage} V
                      </p>
                    </div>
                    <span className={design.chargeControllerSizing.inverterMPPTVoltagePass ? 'text-green-600' : 'text-destructive'}>
                      {design.chargeControllerSizing.inverterMPPTVoltagePass ? '✅' : '❌'}
                    </span>
                  </div>

                  <div className={`flex items-center justify-between rounded-lg border p-3 ${
                    design.chargeControllerSizing.inverterMPPTCurrentPass ? 'border-green-500/50 bg-green-500/5' : 'border-destructive/50 bg-destructive/5'
                  }`}>
                    <div>
                      <p className="text-sm font-medium">MPPT Current</p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(arrayIscA * 1.25)} A / {design.chargeControllerSizing.totalMpptCurrentA?.toFixed(0)} A
                      </p>
                    </div>
                    <span className={design.chargeControllerSizing.inverterMPPTCurrentPass ? 'text-green-600' : 'text-destructive'}>
                      {design.chargeControllerSizing.inverterMPPTCurrentPass ? '✅' : '❌'}
                    </span>
                  </div>

                  <div className={`flex items-center justify-between rounded-lg border p-3 ${
                    design.chargeControllerSizing.inverterPVVocPass ? 'border-green-500/50 bg-green-500/5' : 'border-destructive/50 bg-destructive/5'
                  }`}>
                    <div>
                      <p className="text-sm font-medium">PV Voc</p>
                      <p className="text-xs text-muted-foreground">
                        {panelArrangement?.selectedArrangement?.stringVocV.toFixed(1)} V / {inverter?.maxPVVoc} V
                      </p>
                    </div>
                    <span className={design.chargeControllerSizing.inverterPVVocPass ? 'text-green-600' : 'text-destructive'}>
                      {design.chargeControllerSizing.inverterPVVocPass ? '✅' : '❌'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Warnings */}
            {design.chargeControllerSizing.warnings.length > 0 && (
              <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600" />
                  <div>
                    <p className="font-medium">Warnings</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {design.chargeControllerSizing.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Errors */}
            {design.chargeControllerSizing.errors.length > 0 && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
                  <div>
                    <p className="font-medium">Errors</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {design.chargeControllerSizing.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Info: Technology Notes */}
            <div className="rounded-lg bg-muted/30 p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 shrink-0 text-primary" />
                <div className="text-sm space-y-1">
                  <p className="font-medium">Nigerian Field Notes</p>
                  <ul className="text-muted-foreground space-y-0.5">
                    <li>• <strong>Built-in MPPT</strong> saves cost and simplifies installation for hybrid inverters</li>
                    <li>• <strong>Multiple MPPT trackers</strong> distribute current to reduce heat and improve efficiency</li>
                    <li>• <strong>Uneven distribution</strong> is allowed — trackers can handle asymmetric loads within limits</li>
                    <li>• Verify MPPT firmware limits with manufacturer&apos;s datasheet before installation</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t pt-6">
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Panel Arrangement
        </Button>
        <Button
          onClick={handleContinue}
          disabled={
            !hasCalculated ||
            !design.chargeControllerSizing ||
            (design.chargeControllerSizing?.errors?.length || 0) > 0
          }
        >
          Continue to Oversizing
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}