// src/components/steps/Step9PanelQuantity.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sun,
  Sparkles,
  Building2,
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
import { calculatePanelArrangement } from "@/lib/calculations/panelArrangement";
import { findBestPanels, PanelMatchingCriteria } from "@/lib/panelMatching";
import { PANEL_DATABASE } from "@/lib/panelDatabase";

export default function Step9PanelQuantity() {
  const {
    design,
    setSelectedPanel,
    setPanelArrangement,
    completeStep,
    setCurrentStep,
    setWarnings,
    setErrors,
  } = useSolarStore();

  const [mode, setMode] = useState<"manual" | "smart">(
    design.selectedPanel ? "manual" : "smart"
  );

  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);
  const [isCustomPanel, setIsCustomPanel] = useState(false);

  const [customPanel, setCustomPanel] = useState({
    brand: "",
    model: "",
    pmaxW: 500,
    voc: 49.5,
    vmp: 41.2,
    isc: 12.9,
    imp: 12.14,
    efficiency: 21.3,
  });

  const [smartSuggestion, setSmartSuggestion] = useState<ReturnType<typeof findBestPanels> | null>(null);
  const [computedSuggestionKey, setComputedSuggestionKey] = useState<string | null>(null);
  const [calculationError, setCalculationError] = useState("");
  const [hasCalculated, setHasCalculated] = useState(!!design.selectedPanel);

  const requiredPVPowerW = useMemo(() => {
    if (!design.energyCalculation) return 0;
    return design.energyCalculation.requiredPVPowerW;
  }, [design.energyCalculation]);

  const inverter = design.selectedInverter;

  /**
   * Key that uniquely identifies the current suggestion request.
   * When any input that should trigger a new suggestion changes, this
   * key changes. Until the corresponding suggestion has been computed,
   * the UI shows a loading state (derived, not stored).
   */
  const suggestionKey = useMemo(() => {
    if (mode !== "smart" || requiredPVPowerW <= 0) return null;
    return [
      requiredPVPowerW,
      inverter?.maxPVVoc ?? 0,
      inverter?.mpptMinVoltage ?? 0,
      inverter?.mpptMaxVoltage ?? 0,
    ].join("|");
  }, [mode, requiredPVPowerW, inverter]);

  const isLoadingSuggestions =
    suggestionKey !== null && suggestionKey !== computedSuggestionKey;

  // Auto-suggest when requirements are available
  useEffect(() => {
    if (suggestionKey === null) return;
    if (suggestionKey === computedSuggestionKey) return;

    const timer = setTimeout(() => {
      const criteria: PanelMatchingCriteria = {
        requiredPVPowerW,
        inverter: inverter ? {
          maxPVVoc: inverter.maxPVVoc,
          mpptMinVoltage: inverter.mpptMinVoltage,
          mpptMaxVoltage: inverter.mpptMaxVoltage,
        } : undefined,
        // ✅ FIX: lowered from 20 → 15 so small 100W–250W panels qualify
        minEfficiency: 15,
        maxPanelCount: 20,
      };

      const suggestion = findBestPanels(criteria);
      setSmartSuggestion(suggestion);
      setComputedSuggestionKey(suggestionKey);
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionKey]);

  const currentPanel = useMemo(() => {
    if (isCustomPanel) {
      return {
        brand: customPanel.brand || "Custom",
        model: customPanel.model || "Custom Panel",
        pmaxW: customPanel.pmaxW,
        voc: customPanel.voc,
        vmp: customPanel.vmp,
        isc: customPanel.isc,
        imp: customPanel.imp,
        efficiency: customPanel.efficiency,
      };
    }
    if (selectedPresetIndex !== null) {
      return PANEL_DATABASE[selectedPresetIndex];
    }
    return null;
  }, [isCustomPanel, customPanel, selectedPresetIndex]);

  // Dynamically calculate max panels for industrial systems
  const arrangementResult = useMemo(() => {
    if (!currentPanel || requiredPVPowerW <= 0) return null;

    try {
      const estimatedPanels = Math.ceil(requiredPVPowerW / currentPanel.pmaxW);
      const maxPanels = Math.max(100, Math.ceil(estimatedPanels * 1.5));

      return calculatePanelArrangement({
        requiredPVPowerW,
        selectedPanel: currentPanel,
        inverter: inverter || undefined,
        currentSafetyFactor: 1.25,
        maxPanelCount: maxPanels,
      });
    } catch (error) {
      console.error("Panel arrangement calculation failed:", error);
      return null;
    }
  }, [currentPanel, requiredPVPowerW, inverter]);

  const handleApplySuggestion = (suggested: typeof PANEL_DATABASE[0]) => {
    setSelectedPresetIndex(null);
    setIsCustomPanel(false);
    setHasCalculated(false);
    setCalculationError("");
    setWarnings([]);
    setErrors([]);

    const index = PANEL_DATABASE.findIndex(p => p.model === suggested.model);
    if (index !== -1) {
      setSelectedPresetIndex(index);
    }
  };

  const handlePresetSelect = (index: number) => {
    setSelectedPresetIndex(index);
    setIsCustomPanel(false);
    setHasCalculated(false);
    setCalculationError("");
    setWarnings([]);
    setErrors([]);
  };

  const handleCustomToggle = () => {
    setIsCustomPanel(true);
    setSelectedPresetIndex(null);
    setHasCalculated(false);
    setCalculationError("");
    setWarnings([]);
    setErrors([]);
  };

  const handleCustomChange = (field: string, value: string | number) => {
    setCustomPanel((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasCalculated(false);
  };

  const handleCalculate = () => {
    setCalculationError("");
    setWarnings([]);
    setErrors([]);

    if (!currentPanel) {
      setCalculationError("Please select a panel first.");
      return;
    }

    if (requiredPVPowerW <= 0) {
      setCalculationError("Complete Step 2: Energy Calculation first.");
      return;
    }

    if (!arrangementResult) {
      setCalculationError("Could not calculate panel arrangement.");
      return;
    }

    setSelectedPanel(currentPanel);
    setPanelArrangement(arrangementResult);
    setHasCalculated(true);

    if (arrangementResult.warnings.length > 0) {
      setWarnings(arrangementResult.warnings);
    }

    if (arrangementResult.errors.length > 0) {
      setErrors(arrangementResult.errors);
      setCalculationError(arrangementResult.errors[0]);
      return;
    }
  };

  const handleContinue = () => {
    if (!hasCalculated || !design.selectedPanel || !design.panelArrangement) {
      setCalculationError("Calculate the panel selection first.");
      return;
    }

    if (design.panelArrangement.status === "no-valid-arrangement") {
      setCalculationError("No valid panel arrangement found. Please select a different panel.");
      return;
    }

    completeStep(8);
    setCurrentStep(9);
  };

  const handleBack = () => {
    setCurrentStep(7);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat("en-NG", {
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Sun className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Step 8: Panel Selection</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Select solar panels for your system using smart suggestions or manual entry.
        </p>
      </div>

      {/* System Requirement */}
      <Card>
        <CardHeader>
          <CardTitle>System Requirement</CardTitle>
        </CardHeader>
        <CardContent>
          {requiredPVPowerW > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Required PV Capacity</p>
                <p className="mt-1 text-2xl font-bold">
                  {formatNumber(requiredPVPowerW)} W
                </p>
                <p className="text-sm text-muted-foreground">
                  {(requiredPVPowerW / 1000).toFixed(2)} kWp
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Based On</p>
                <p className="mt-1 font-medium">
                  Step 2 Energy Calculation
                </p>
                <p className="text-sm text-muted-foreground">
                  {design.energyCalculation?.designEnergyKWh.toFixed(2)} kWh/day
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-5 w-5" />
                Energy Calculation Required
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Complete Step 2: Energy Calculation before selecting panels.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selection Mode */}
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
                AI-powered suggestion based on your system requirements
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
                Browse panels manually or enter custom specifications
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Smart Suggestions */}
      {mode === "smart" && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Powered Panel Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSuggestions ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Finding the best panels...</p>
                </div>
              </div>
            ) : smartSuggestion ? (
              <div className="space-y-4">
                {smartSuggestion.suggested && (
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
                          <Badge variant="outline">
                            {smartSuggestion.suggested.pmaxW}W
                          </Badge>
                          {smartSuggestion.suggested.efficiency && (
                            <Badge variant="outline">
                              {smartSuggestion.suggested.efficiency}% Efficiency
                            </Badge>
                          )}
                          <Badge variant="outline">
                            Voc: {smartSuggestion.suggested.voc}V
                          </Badge>
                          <Badge variant="outline">
                            Vmp: {smartSuggestion.suggested.vmp}V
                          </Badge>
                          {smartSuggestion.suggested.priceNGN && (
                            <Badge variant="secondary">
                              ₦{smartSuggestion.suggested.priceNGN.toLocaleString()}
                            </Badge>
                          )}
                          {smartSuggestion.suggested.availability === "high" && (
                            <Badge className="bg-green-500">In Stock</Badge>
                          )}
                          {smartSuggestion.suggested.warranty && (
                            <Badge variant="default">{smartSuggestion.suggested.warranty}</Badge>
                          )}
                        </div>
                        {smartSuggestion.suggested.description && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {smartSuggestion.suggested.description}
                          </p>
                        )}
                      </div>
                      <Button onClick={() => handleApplySuggestion(smartSuggestion.suggested!)}>
                        Select This
                      </Button>
                    </div>
                  </div>
                )}

                {/* Alternatives */}
                {smartSuggestion.alternatives.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-muted-foreground">
                      Alternatives ({smartSuggestion.alternatives.length})
                    </p>
                    <div className="space-y-2">
                      {smartSuggestion.alternatives.map((alt, i) => (
                        <div key={i} className="flex flex-col md:flex-row md:items-center md:justify-between rounded-lg border p-3 gap-2">
                          <div>
                            <p className="font-medium">{alt.brand} {alt.model}</p>
                            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                              <span>{alt.pmaxW}W</span>
                              {alt.efficiency && <span>{alt.efficiency}%</span>}
                              <span>Voc: {alt.voc}V</span>
                              <span>Vmp: {alt.vmp}V</span>
                              {alt.priceNGN && <span>₦{alt.priceNGN.toLocaleString()}</span>}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleApplySuggestion(alt)}>
                            Select
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">No suggestions available. Complete Step 2 first.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Selection */}
      {mode === "manual" && (
        <Card>
          <CardHeader>
            <CardTitle>Select Panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preset panels */}
            <div>
              <Label className="mb-3 block">Common Panels (Nigerian Market)</Label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {PANEL_DATABASE.map((panel, index) => (
                  <button
                    key={`${panel.brand}-${panel.model}`}
                    onClick={() => handlePresetSelect(index)}
                    className={`rounded-lg border p-4 text-left transition ${
                      selectedPresetIndex === index && !isCustomPanel
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{panel.brand}</p>
                      <p className="text-sm text-muted-foreground">{panel.model}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline">{panel.pmaxW}W</Badge>
                        {panel.efficiency && (
                          <Badge variant="secondary">{panel.efficiency}%</Badge>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                        <span>Voc: {panel.voc}V</span>
                        <span>Vmp: {panel.vmp}V</span>
                        <span>Isc: {panel.isc}A</span>
                        <span>Imp: {panel.imp}A</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom panel toggle */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleCustomToggle}
              className="w-full"
            >
              {isCustomPanel ? "Using Custom Panel" : "Enter Custom Panel Specifications"}
            </Button>

            {isCustomPanel && (
              <div className="rounded-lg border p-4 space-y-4">
                <h4 className="font-medium">Custom Panel Specifications</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Brand</Label>
                    <Input
                      placeholder="e.g. SunPower"
                      value={customPanel.brand}
                      onChange={(e) => handleCustomChange("brand", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input
                      placeholder="e.g. X-500"
                      value={customPanel.model}
                      onChange={(e) => handleCustomChange("model", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Power (W)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 500"
                      value={customPanel.pmaxW || ""}
                      onChange={(e) => handleCustomChange("pmaxW", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Voc (V)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 49.5"
                      step="0.1"
                      value={customPanel.voc || ""}
                      onChange={(e) => handleCustomChange("voc", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vmp (V)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 41.2"
                      step="0.1"
                      value={customPanel.vmp || ""}
                      onChange={(e) => handleCustomChange("vmp", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Isc (A)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 12.9"
                      step="0.1"
                      value={customPanel.isc || ""}
                      onChange={(e) => handleCustomChange("isc", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Imp (A)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 12.14"
                      step="0.01"
                      value={customPanel.imp || ""}
                      onChange={(e) => handleCustomChange("imp", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Efficiency (%)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 21.3"
                      step="0.1"
                      value={customPanel.efficiency || ""}
                      onChange={(e) => handleCustomChange("efficiency", Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calculate button */}
      {currentPanel && requiredPVPowerW > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Panel Quantity Calculation</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCalculate} className="w-full md:w-auto">
              <Sun className="mr-2 h-4 w-4" />
              Calculate Panel Quantity
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
      {hasCalculated && design.panelArrangement && currentPanel && (
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Panel Selection Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium text-muted-foreground">Selected Panel</p>
              <p className="mt-1 text-lg font-bold">
                {currentPanel.brand} {currentPanel.model}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge>{currentPanel.pmaxW}W</Badge>
                {currentPanel.efficiency && (
                  <Badge variant="secondary">{currentPanel.efficiency}% Efficiency</Badge>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                <div>
                  <span className="text-muted-foreground">Voc:</span>
                  <span className="ml-1 font-medium">{currentPanel.voc}V</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Vmp:</span>
                  <span className="ml-1 font-medium">{currentPanel.vmp}V</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Isc:</span>
                  <span className="ml-1 font-medium">{currentPanel.isc}A</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Imp:</span>
                  <span className="ml-1 font-medium">{currentPanel.imp}A</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">Minimum Panels</p>
                <p className="mt-1 text-3xl font-bold">
                  {design.panelArrangement.minimumPanelCount}
                </p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">Actual PV Array</p>
                <p className="mt-1 text-3xl font-bold">
                  {design.panelArrangement.selectedArrangement?.panelCount || 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  {design.panelArrangement.selectedArrangement?.arrayPowerW.toFixed(0)} W
                </p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">Oversizing</p>
                <p className="mt-1 text-3xl font-bold">
                  {design.panelArrangement.selectedArrangement?.oversizingPercent.toFixed(1)}%
                </p>
              </div>
            </div>

            {design.panelArrangement.status === "valid" ? (
              <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Valid panel arrangement found. Continue to Panel Arrangement.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm font-medium">
                  No valid arrangement found. Try a different panel.
                </span>
              </div>
            )}

            {design.panelArrangement.warnings.length > 0 && (
              <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-medium">Warnings</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {design.panelArrangement.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t pt-6">
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Battery Selection
        </Button>
        <Button
          onClick={handleContinue}
          disabled={
            !hasCalculated ||
            !design.selectedPanel ||
            !design.panelArrangement ||
            design.panelArrangement.status === "no-valid-arrangement"
          }
        >
          Continue to Panel Arrangement
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}