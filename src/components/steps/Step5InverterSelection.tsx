// src/components/steps/Step5InverterSelection.tsx
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
import { calculateLoadAudit } from "@/lib/calculations/loadAudit";
import { calculateInverterSizing } from "@/lib/calculations/inverter";
import { calculatePVSizing } from "@/lib/calculations/pvSizing";
import { calculateInverterSelection } from "@/lib/calculations/inverterSelection";
import { findBestInverter, MatchingCriteria } from "@/lib/inverterMatching";
import { INVERTER_DATABASE } from "@/lib/inverterDatabase";

import type { InverterSpec, InverterType } from "@/types/solar";

const DEFAULT_INVERTER: InverterSpec = {
  brand: "",
  model: "",
  type: "hybrid",
  ratedKVA: 0,
  ratedWatts: 0,
  systemVoltage: 48,
  maxPVInputW: 0,
  maxPVVoc: 0,
  mpptMinVoltage: 0,
  mpptMaxVoltage: 0,
  mpptCurrent: 0,
  maxChargingCurrent: undefined,
  mpptCount: 1,
};

/**
 * Returns true when the inverter brand is a featured partner
 * (YuFai Aurora / Sunlux). Used to render the 🇳🇬 badge in the
 * demo so partner products are visually obvious.
 */
function isPartnerBrand(brand: string | undefined): boolean {
  if (!brand) return false;
  const lc = brand.toLowerCase();
  return lc.includes("yufai") || lc.includes("sunlux");
}

export default function Step5InverterSelection() {
  const {
    design,
    setCurrentStep,
    completeStep,
    setInverterType,
    setSelectedInverter,
    setInverterSelectionResult,
    setSystemVoltage,
    setWarnings,
    setErrors,
  } = useSolarStore();

  // ✅ Initialize inverter with selected system voltage from Step 3
  const [inverter, setInverter] = useState<InverterSpec>({
    ...DEFAULT_INVERTER,
    type: design.inverterType ?? "hybrid",
    systemVoltage: design.systemVoltage || 48, // ✅ Use selected voltage
  });

  const [mode, setMode] = useState<"manual" | "smart">(
    design.selectedInverter ? "manual" : "smart"
  );

  const [selectionResult, setSelectionResult] = useState<
    ReturnType<typeof calculateInverterSelection> | null
  >(null);

  const [smartSuggestion, setSmartSuggestion] = useState<ReturnType<typeof findBestInverter> | null>(null);
  const [calculationError, setCalculationError] = useState("");
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const loadAudit = useMemo(() => {
    if (!design.loads || design.loads.length === 0) return null;
    try {
      return calculateLoadAudit(design.loads);
    } catch {
      return null;
    }
  }, [design.loads]);

  const inverterSizing = useMemo(() => {
    if (!loadAudit) return null;
    try {
      return calculateInverterSizing({
        loadAudit,
        workingMargin: 1.25,
        powerFactor: design.powerFactor,
      });
    } catch {
      return null;
    }
  }, [loadAudit, design.powerFactor]);

  const pvSizing = useMemo(() => {
    if (!design.energyCalculation) return null;
    try {
      return calculatePVSizing({
        energyCalculation: design.energyCalculation,
      });
    } catch {
      return null;
    }
  }, [design.energyCalculation]);

  // ✅ Sync inverter.systemVoltage when design.systemVoltage changes (from Step 3)
  useEffect(() => {
    if (design.systemVoltage && inverter.systemVoltage !== design.systemVoltage) {
      // Only sync if user hasn't manually overridden the voltage
      setInverter((current) => ({
        ...current,
        systemVoltage: design.systemVoltage,
      }));
    }
  }, [design.systemVoltage]);

  // Auto-suggest when requirements are available
  useEffect(() => {
    if (mode === "smart" && inverterSizing && pvSizing) {
      setIsLoadingSuggestions(true);

      setTimeout(() => {
        const criteria: MatchingCriteria = {
          requiredKVA: inverterSizing.requiredKVA,
          requiredWatts: inverterSizing.workingLoadW,
          requiredPVPowerW: pvSizing.requiredPVPowerW,
          startingSurgeW: inverterSizing.startingSurgeW,
          // ✅ Use selected system voltage from Step 3
          systemVoltage: design.systemVoltage || 48,
          inverterType: design.inverterType || "hybrid",
        };

        const suggestion = findBestInverter(inverterSizing, criteria);
        setSmartSuggestion(suggestion);
        setIsLoadingSuggestions(false);

        if (suggestion.suggested && suggestion.matchScore > 60) {
          const suggested = suggestion.suggested;
          setInverter({
            brand: suggested.brand,
            model: suggested.model,
            type: suggested.type,
            ratedKVA: suggested.ratedKVA,
            ratedWatts: suggested.ratedWatts,
            // ✅ Use selected system voltage (fallback to suggested)
            systemVoltage: design.systemVoltage || suggested.systemVoltage,
            maxPVInputW: suggested.maxPVInputW,
            maxPVVoc: suggested.maxPVVoc,
            mpptMinVoltage: suggested.mpptMinVoltage,
            mpptMaxVoltage: suggested.mpptMaxVoltage,
            mpptCurrent: suggested.mpptCurrent,
            maxChargingCurrent: suggested.maxChargingCurrent,
            mpptCount: (suggested as any).mpptCount || 1,
          });

          setInverterType(suggested.type);
        }
      }, 500);
    }
  }, [mode, inverterSizing, pvSizing, design.inverterType, design.systemVoltage]);

  const updateInverterField = <K extends keyof InverterSpec>(
    field: K,
    value: InverterSpec[K]
  ) => {
    setInverter((current) => ({ ...current, [field]: value }));
    setSelectionResult(null);
    setCalculationError("");
  };

  const handleTypeChange = (type: InverterType) => {
    setInverter((current) => ({ ...current, type }));
    setInverterType(type);
    setSelectionResult(null);
    setCalculationError("");
  };

  const handleApplySuggestion = (suggested: typeof INVERTER_DATABASE[0]) => {
    setInverter({
      brand: suggested.brand,
      model: suggested.model,
      type: suggested.type,
      ratedKVA: suggested.ratedKVA,
      ratedWatts: suggested.ratedWatts,
      // ✅ Use selected system voltage
      systemVoltage: design.systemVoltage || suggested.systemVoltage,
      maxPVInputW: suggested.maxPVInputW,
      maxPVVoc: suggested.maxPVVoc,
      mpptMinVoltage: suggested.mpptMinVoltage,
      mpptMaxVoltage: suggested.mpptMaxVoltage,
      mpptCurrent: suggested.mpptCurrent,
      maxChargingCurrent: suggested.maxChargingCurrent,
      mpptCount: (suggested as any).mpptCount || 1,
    });

    setInverterType(suggested.type);
    setSelectionResult(null);
    setCalculationError("");
  };

  const handleValidate = () => {
    setCalculationError("");
    setSelectionResult(null);
    setWarnings([]);
    setErrors([]);

    if (!inverterSizing) {
      setCalculationError("Complete Step 3 before selecting an inverter.");
      return;
    }

    if (!pvSizing) {
      setCalculationError("Complete Step 4 before selecting an inverter.");
      return;
    }

    try {
      const result = calculateInverterSelection({
        inverter,
        inverterType: inverter.type,
        requiredInverterKVA: inverterSizing.requiredKVA,
        requiredInverterWatts: inverterSizing.workingLoadW,
        startingSurgeW: inverterSizing.startingSurgeW,
        surgeDataAvailable: inverterSizing.surgeDataAvailable,
        requiredPVPowerW: pvSizing.requiredPVPowerW,
      });

      setSelectionResult(result);
      setInverterSelectionResult({
        status: result.status,
        warnings: result.warnings,
        errors: result.errors,
      });
      setWarnings(result.warnings);
      setErrors(result.errors);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Validation failed.";
      setCalculationError(message);
      setErrors([message]);
    }
  };

  const handleContinue = () => {
    if (!selectionResult) {
      setCalculationError("Validate the inverter first.");
      return;
    }

    if (selectionResult.status === "fail") {
      setCalculationError("The selected inverter failed validation.");
      return;
    }

    setSelectedInverter(inverter);
    // ✅ Sync system voltage with inverter
    setSystemVoltage(inverter.systemVoltage);
    setInverterSelectionResult({
      status: selectionResult.status,
      warnings: selectionResult.warnings,
      errors: selectionResult.errors,
    });

    completeStep(5);
    setCurrentStep(6);
  };

  const handleBack = () => setCurrentStep(4);

  const statusLabel = selectionResult?.status === "pass" ? "PASS" :
                      selectionResult?.status === "warning" ? "WARNING" :
                      selectionResult?.status === "fail" ? "FAIL" : "";

  const requirements = useMemo(() => {
    if (!inverterSizing || !pvSizing) return null;
    return {
      requiredKVA: inverterSizing.requiredKVA,
      requiredWatts: inverterSizing.workingLoadW,
      startingSurgeW: inverterSizing.startingSurgeW,
      requiredPVPowerW: pvSizing.requiredPVPowerW,
    };
  }, [inverterSizing, pvSizing]);

  const totalMpptCurrent = (inverter.mpptCount || 1) * inverter.mpptCurrent;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Step 5: Inverter Selection</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Select and validate an inverter for your system using smart suggestions or manual entry.
        </p>
      </div>

      {requirements && (
        <Card>
          <CardHeader>
            <CardTitle>System Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-5">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Required KVA</p>
                <p className="font-semibold">{requirements.requiredKVA.toFixed(2)} kVA</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Required Watts</p>
                <p className="font-semibold">{requirements.requiredWatts.toFixed(0)} W</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">PV Array Power</p>
                <p className="font-semibold">{requirements.requiredPVPowerW.toFixed(0)} W</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Starting Surge</p>
                <p className="font-semibold">{requirements.startingSurgeW.toFixed(0)} W</p>
              </div>
              {/* ✅ NEW: Show selected system voltage */}
              <div className="rounded-lg border p-3 border-primary/50 bg-primary/5">
                <p className="text-xs text-muted-foreground">System Voltage</p>
                <p className="font-semibold text-primary">
                  {design.systemVoltage}V DC
                </p>
                <p className="text-xs text-muted-foreground">
                  From Step 3
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                Enter inverter specifications manually
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
              AI-Powered Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSuggestions ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Finding the best inverter...</p>
                </div>
              </div>
            ) : smartSuggestion ? (
              <div className="space-y-4">
                {smartSuggestion.suggested && (
                  <div className="rounded-lg border-2 border-primary/50 p-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-lg font-bold">
                            {smartSuggestion.suggested.brand} {smartSuggestion.suggested.model}
                          </h4>
                          <Badge className="bg-primary">Best Match</Badge>
                          {isPartnerBrand(smartSuggestion.suggested.brand) && (
                            <Badge className="bg-blue-500">🇳🇬 Aurora Partner</Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Match Score:</span>
                          <span className="font-semibold text-primary">{smartSuggestion.matchScore}%</span>
                        </div>
                        <p className="mt-2 text-sm">{smartSuggestion.reason}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="outline">
                            {smartSuggestion.suggested.ratedKVA} kVA
                          </Badge>
                          <Badge variant="outline">
                            {smartSuggestion.suggested.ratedWatts} W
                          </Badge>
                          <Badge variant="outline">
                            {smartSuggestion.suggested.systemVoltage}V
                          </Badge>
                          {smartSuggestion.suggested.priceNGN && (
                            <Badge variant="secondary">
                              ₦{smartSuggestion.suggested.priceNGN.toLocaleString()}
                            </Badge>
                          )}
                          {smartSuggestion.suggested.availability === "high" && (
                            <Badge className="bg-green-500">In Stock</Badge>
                          )}
                          {smartSuggestion.suggested.type === "hybrid" && (
                            <Badge variant="default">Hybrid</Badge>
                          )}
                          {smartSuggestion.suggested.type === "standalone" && (
                            <Badge variant="default">Standalone</Badge>
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

                {smartSuggestion.alternatives.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-muted-foreground">
                      Alternatives ({smartSuggestion.alternatives.length})
                    </p>
                    <div className="space-y-2">
                      {smartSuggestion.alternatives.map((alt, i) => (
                        <div key={i} className="flex flex-col md:flex-row md:items-center md:justify-between rounded-lg border p-3 gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">{alt.brand} {alt.model}</p>
                              {isPartnerBrand(alt.brand) && (
                                <Badge className="bg-blue-500">🇳🇬 Aurora Partner</Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                              <span>{alt.ratedKVA} kVA</span>
                              <span>{alt.ratedWatts} W</span>
                              <span>{alt.systemVoltage}V</span>
                              {alt.priceNGN && <span>₦{alt.priceNGN.toLocaleString()}</span>}
                              {alt.type === "hybrid" && <span className="text-xs">Hybrid</span>}
                              {alt.type === "standalone" && <span className="text-xs">Standalone</span>}
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

                {!smartSuggestion.suggested && (
                  <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
                    <div className="flex gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium">No matching inverter in database</p>
                        <p className="text-muted-foreground mt-1">
                          The system voltage {design.systemVoltage}V is not currently in our database.
                          Please use Manual Entry to enter your inverter specifications.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => setMode("manual")}
                        >
                          Switch to Manual Entry
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">No suggestions available. Complete previous steps first.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{mode === "smart" ? "Selected Inverter" : "Inverter Specification"}</span>
            <Badge variant="outline" className="border-primary/50 bg-primary/5">
              System Voltage: {design.systemVoltage}V DC
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-sm font-medium">Brand</Label>
              <Input
                value={inverter.brand}
                onChange={(e) => updateInverterField("brand", e.target.value)}
                placeholder="e.g. Deye"
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Model</Label>
              <Input
                value={inverter.model}
                onChange={(e) => updateInverterField("model", e.target.value)}
                placeholder="Enter exact model"
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Rated Capacity (kVA)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={inverter.ratedKVA || ""}
                onChange={(e) => updateInverterField("ratedKVA", Number(e.target.value))}
                placeholder="e.g. 5"
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Rated Output (W)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={inverter.ratedWatts || ""}
                onChange={(e) => updateInverterField("ratedWatts", Number(e.target.value))}
                placeholder="e.g. 5000"
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">
                System / Battery Voltage (V)
                <span className="text-xs text-muted-foreground ml-2">
                  (Selected in Step 3: {design.systemVoltage}V)
                </span>
              </Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={inverter.systemVoltage || ""}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  updateInverterField("systemVoltage", v);
                  // ✅ Also update the design's system voltage
                  if (v > 0) setSystemVoltage(v);
                }}
                placeholder={`e.g. ${design.systemVoltage || 48}`}
                className="mt-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Must match or exceed the voltage you selected in Step 3
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Maximum PV Input Power (W)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={inverter.maxPVInputW || ""}
                onChange={(e) => updateInverterField("maxPVInputW", Number(e.target.value))}
                placeholder="e.g. 6500"
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Maximum PV Voc (V)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={inverter.maxPVVoc || ""}
                onChange={(e) => updateInverterField("maxPVVoc", Number(e.target.value))}
                placeholder="e.g. 500"
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">MPPT Minimum Voltage (V)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={inverter.mpptMinVoltage || ""}
                onChange={(e) => updateInverterField("mpptMinVoltage", Number(e.target.value))}
                placeholder="e.g. 150"
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">MPPT Maximum Voltage (V)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={inverter.mpptMaxVoltage || ""}
                onChange={(e) => updateInverterField("mpptMaxVoltage", Number(e.target.value))}
                placeholder="e.g. 425"
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">MPPT Current Per Tracker (A)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={inverter.mpptCurrent || ""}
                onChange={(e) => updateInverterField("mpptCurrent", Number(e.target.value))}
                placeholder="e.g. 100"
                className="mt-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Current rating PER MPPT tracker
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Number of MPPT Trackers</Label>
              <Input
                type="number"
                min="1"
                max="10"
                step="1"
                value={inverter.mpptCount || 1}
                onChange={(e) => updateInverterField("mpptCount", Number(e.target.value))}
                placeholder="1"
                className="mt-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Most inverters have 1. Industrial: 2-10 trackers
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Maximum Charging Current (A)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={inverter.maxChargingCurrent ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  updateInverterField("maxChargingCurrent", value === "" ? undefined : Number(value));
                }}
                placeholder="Optional"
                className="mt-2"
              />
            </div>
          </div>

          {/* Total MPPT Capacity Display */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Total MPPT Capacity</p>
                <p className="text-sm text-muted-foreground">
                  {inverter.mpptCount || 1} tracker{(inverter.mpptCount || 1) > 1 ? 's' : ''} × {inverter.mpptCurrent || 0}A each
                </p>
              </div>
              <p className="text-2xl font-bold text-primary">
                {totalMpptCurrent.toFixed(0)}A
              </p>
            </div>
          </div>

          {/* Voltage consistency warning */}
          {inverter.systemVoltage !== design.systemVoltage && inverter.systemVoltage > 0 && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
              <div className="flex gap-2 text-sm">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <p className="font-medium">Voltage mismatch with Step 3</p>
                  <p className="text-muted-foreground">
                    Step 3 recommended {design.systemVoltage}V, but this inverter uses {inverter.systemVoltage}V.
                    All downstream calculations (battery, cables) will use the inverter's voltage.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Specification source</p>
                <p className="mt-1 text-muted-foreground">
                  Enter specifications from the manufacturer's datasheet or an approved market specification.
                  Exact model data should be verified before final design approval.
                </p>
              </div>
            </div>
          </div>

          <Button onClick={handleValidate} className="w-full md:w-auto">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Validate Inverter
          </Button>
        </CardContent>
      </Card>

      {calculationError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">Validation Error</p>
                <p className="mt-1 text-sm">{calculationError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectionResult && (
        <Card className={selectionResult.status === "fail" ? "border-destructive" : "border-green-500/50"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectionResult.status === "fail" ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              Validation: {statusLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-2">
              {Object.entries(selectionResult.checks).map(([key, passed]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className={passed ? "text-green-600" : "text-destructive"}>
                    {passed ? "✅ Pass" : "❌ Fail"}
                  </span>
                </div>
              ))}
            </div>

            {selectionResult.warnings.length > 0 && (
              <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-medium">Warnings</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {selectionResult.warnings.map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {selectionResult.errors.length > 0 && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-medium">Errors</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {selectionResult.errors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between border-t pt-6">
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to PV Sizing
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!selectionResult || selectionResult.status === "fail"}
        >
          Continue to Battery Sizing
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}