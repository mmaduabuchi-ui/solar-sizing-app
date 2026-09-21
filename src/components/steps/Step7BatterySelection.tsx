// src/components/steps/Step7BatterySelection.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Battery,
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
import { findBestBattery, BatteryMatchingCriteria } from "@/lib/batteryMatching";
import { BATTERY_DATABASE } from "@/lib/batteryDatabase";
import { calculateBatterySizing } from "@/lib/calculations/battery";

import type { BatterySpec, BatteryType } from "@/types/solar";

function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  }).format(value);
}

/**
 * Returns true when the battery brand is a featured partner
 * (Sunlux / YuFai Aurora). Used to render the 🇳🇬 badge in the
 * demo so partner products are visually obvious.
 */
function isPartnerBrand(brand: string | undefined): boolean {
  if (!brand) return false;
  const lc = brand.toLowerCase();
  return lc.includes("sunlux") || lc.includes("yufai");
}

export default function Step7BatterySelection() {
  const {
    design,
    setSelectedBattery,
    setCurrentStep,
    completeStep,
    setWarnings,
    setErrors,
    setBatterySizing, // ✅ allows re-running Step 6 sizing for the chosen type
  } = useSolarStore();

  const [mode, setMode] = useState<"manual" | "smart">(
    design.selectedBattery ? "manual" : "smart"
  );

  // ✅ Local battery type — independent from Step 6
  const [batteryType, setBatteryType] = useState<BatteryType>(
    design.selectedBattery?.type || design.batteryType || "lithium"
  );

  const [brand, setBrand] = useState(design.selectedBattery?.brand || "");
  const [model, setModel] = useState(design.selectedBattery?.model || "");
  const [voltage, setVoltage] = useState(
    design.selectedBattery?.voltage ? String(design.selectedBattery.voltage) : ""
  );
  const [capacity, setCapacity] = useState(() => {
    if (design.selectedBattery?.capacityAh) {
      return String(design.selectedBattery.capacityAh);
    }
    if (design.selectedBattery?.capacityKWh) {
      return String(design.selectedBattery.capacityKWh);
    }
    return "";
  });

  const [smartSuggestion, setSmartSuggestion] = useState<ReturnType<typeof findBestBattery> | null>(null);
  const [error, setError] = useState("");
  const [validationTriggered, setValidationTriggered] = useState(Boolean(design.selectedBattery));

  // ✅ Track which suggestion key has already been computed so we can derive
  //    the loading flag without calling setState synchronously in an effect.
  const [computedSuggestionKey, setComputedSuggestionKey] = useState<string | null>(null);

  const systemVoltage =
    design.selectedInverter?.systemVoltage || design.systemVoltage || 48;

  // ✅ Recompute Step 6's sizing for the currently selected battery type
  const sizing = useMemo(() => {
    if (!design.energyCalculation) return null;

    try {
      return calculateBatterySizing({
        energyCalculation: design.energyCalculation,
        batteryType,
        systemVoltage,
        autonomyDays: design.autonomyDays,
        batteryDoD: design.batteryDoD,
        batteryEfficiency: design.batteryEfficiency,
      });
    } catch {
      return null;
    }
  }, [
    design.energyCalculation,
    design.autonomyDays,
    design.batteryDoD,
    design.batteryEfficiency,
    batteryType,
    systemVoltage,
  ]);

  /**
   * A unique key describing the current suggestion request. When any input
   * that should trigger a new suggestion changes, this key changes, and the
   * effect below recomputes. Until the new key has been computed, the UI
   * shows the loading state (derived, not stored).
   */
  const suggestionKey = useMemo(() => {
    if (mode !== "smart" || !sizing) return null;
    return [
      batteryType,
      sizing.systemVoltage || systemVoltage,
      sizing.requiredCapacityKWh || 0,
      sizing.requiredCapacityAh || 0,
    ].join("|");
  }, [mode, sizing, batteryType, systemVoltage]);

  /**
   * Derived loading state — true whenever we're waiting on a suggestion
   * that hasn't been computed yet. This replaces the old
   * `setIsLoadingSuggestions(true)` call that fired synchronously in the
   * effect body.
   */
  const isLoadingSuggestions =
    suggestionKey !== null && suggestionKey !== computedSuggestionKey;

  // Auto-suggest when requirements are available
  useEffect(() => {
    if (suggestionKey === null) return;

    // If we've already computed this exact suggestion, do nothing.
    if (suggestionKey === computedSuggestionKey) return;

    const timer = setTimeout(() => {
      const criteria: BatteryMatchingCriteria = {
        batteryType,
        systemVoltage: sizing!.systemVoltage || systemVoltage,
        requiredCapacityKWh: sizing!.requiredCapacityKWh || 0,
        requiredCapacityAh: sizing!.requiredCapacityAh || 0,
      };

      const suggestion = findBestBattery(criteria);
      setSmartSuggestion(suggestion);

      if (suggestion.suggested && suggestion.matchScore > 60) {
        const suggested = suggestion.suggested;
        setBatteryType(suggested.type);
        setBrand(suggested.brand);
        setModel(suggested.model);
        setVoltage(String(suggested.voltage));
        if (suggested.capacityKWh) {
          setCapacity(String(suggested.capacityKWh));
        } else if (suggested.capacityAh) {
          setCapacity(String(suggested.capacityAh));
        }
      }

      // Mark this suggestion as computed → flips isLoadingSuggestions false.
      setComputedSuggestionKey(suggestionKey);
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionKey]);

  const handleBatteryTypeChange = (value: BatteryType) => {
    setBatteryType(value);
    setBrand("");
    setModel("");
    setVoltage("");
    setCapacity("");
    setValidationTriggered(false);
    setError("");
  };

  const handleApplySuggestion = (suggested: typeof BATTERY_DATABASE[0]) => {
    setBatteryType(suggested.type);
    setBrand(suggested.brand);
    setModel(suggested.model);
    setVoltage(String(suggested.voltage));
    if (suggested.capacityKWh) {
      setCapacity(String(suggested.capacityKWh));
    } else if (suggested.capacityAh) {
      setCapacity(String(suggested.capacityAh));
    }
    setValidationTriggered(false);
    setError("");
  };

  // Battery bank configuration
  const configuration = useMemo(() => {
    if (!sizing) return null;

    const batteryVoltage = Number(voltage);
    const batteryCapacity = Number(capacity);

    if (!Number.isFinite(batteryVoltage) || batteryVoltage <= 0) return null;
    if (!Number.isFinite(batteryCapacity) || batteryCapacity <= 0) return null;

    const seriesRatio = systemVoltage / batteryVoltage;
    const exactVoltageMatch = Number.isInteger(seriesRatio);

    if (!exactVoltageMatch) {
      return {
        seriesBatteries: Math.ceil(seriesRatio),
        parallelStrings: 0,
        totalBatteryCount: 0,
        actualBankVoltage: batteryVoltage * Math.ceil(seriesRatio),
        actualBankCapacityAh: 0,
        actualBankCapacityKWh: 0,
        exactVoltageMatch: false,
        voltageError: `Battery voltage ${batteryVoltage}V cannot form exact ${systemVoltage}V bank`,
      };
    }

    const seriesBatteries = seriesRatio;
    let parallelStrings = 1;

    if (batteryType === "lithium") {
      const capacityPerStringKWh = batteryCapacity * seriesBatteries;
      const requiredKWh = sizing.requiredCapacityKWh || 0;
      if (requiredKWh > 0) {
        parallelStrings = Math.ceil(requiredKWh / capacityPerStringKWh);
      }
    } else {
      const requiredAh = sizing.requiredCapacityAh || 0;
      if (requiredAh > 0) {
        parallelStrings = Math.ceil(requiredAh / batteryCapacity);
      }
    }

    const totalBatteryCount = seriesBatteries * parallelStrings;
    const actualBankVoltage = batteryVoltage * seriesBatteries;
    const actualBankCapacityAh =
      batteryType === "tubular"
        ? batteryCapacity * parallelStrings
        : undefined;
    const actualBankCapacityKWh =
      batteryType === "lithium"
        ? batteryCapacity * seriesBatteries * parallelStrings
        : (actualBankVoltage * (batteryCapacity * parallelStrings)) / 1000;

    return {
      seriesBatteries,
      parallelStrings,
      totalBatteryCount,
      actualBankVoltage,
      actualBankCapacityAh,
      actualBankCapacityKWh,
      exactVoltageMatch: true,
      voltageError: undefined,
    };
  }, [voltage, capacity, batteryType, systemVoltage, sizing]);

  // ✅ Validation — no longer checks battery type against Step 6
  const validation = useMemo((): {
    status: "pass" | "warning" | "fail";
    errors: string[];
    warnings: string[];
    voltagePass: boolean;
    capacityPass: boolean;
  } | null => {
    if (!sizing || !configuration) return null;
    if (!configuration.exactVoltageMatch) return null;

    const requiredKWh = sizing.requiredCapacityKWh || 0;
    const requiredAh = sizing.requiredCapacityAh || 0;

    const voltagePass = configuration.exactVoltageMatch;

    let capacityPass = false;
    if (batteryType === "lithium") {
      capacityPass =
        (configuration.actualBankCapacityKWh || 0) >= requiredKWh;
    } else {
      capacityPass =
        (configuration.actualBankCapacityAh || 0) >= requiredAh;
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!voltagePass) {
      errors.push(`Battery voltage cannot form exact ${systemVoltage}V bank.`);
    }
    if (!capacityPass) {
      errors.push("Battery bank does not meet the required capacity.");
    }

    if (
      capacityPass &&
      batteryType === "lithium" &&
      requiredKWh > 0 &&
      (configuration.actualBankCapacityKWh || 0) > requiredKWh * 1.5
    ) {
      warnings.push(
        "Battery bank is significantly larger than required (>50% oversizing).",
      );
    }
    if (
      capacityPass &&
      batteryType === "tubular" &&
      requiredAh > 0 &&
      (configuration.actualBankCapacityAh || 0) > requiredAh * 1.5
    ) {
      warnings.push(
        "Battery bank is significantly larger than required (>50% oversizing).",
      );
    }

    const status: "pass" | "warning" | "fail" =
      errors.length > 0
        ? "fail"
        : warnings.length > 0
          ? "warning"
          : "pass";

    return {
      status,
      errors,
      warnings,
      voltagePass,
      capacityPass,
    };
  }, [batteryType, configuration, sizing, systemVoltage]);

  const handleValidate = () => {
    setError("");
    setWarnings([]);
    setErrors([]);

    if (!sizing) {
      setError("Complete Step 6 battery sizing first.");
      return;
    }

    if (!brand.trim()) {
      setError("Enter the battery brand.");
      return;
    }

    if (!model.trim()) {
      setError("Enter the battery model.");
      return;
    }

    const batteryVoltage = Number(voltage);
    if (!Number.isFinite(batteryVoltage) || batteryVoltage <= 0) {
      setError("Enter a valid battery voltage.");
      return;
    }

    const batteryCapacity = Number(capacity);
    if (!Number.isFinite(batteryCapacity) || batteryCapacity <= 0) {
      setError(
        batteryType === "lithium"
          ? "Enter a valid battery capacity in kWh."
          : "Enter a valid battery capacity in Ah.",
      );
      return;
    }

    if (!configuration || !configuration.exactVoltageMatch) {
      setError(
        `Battery voltage ${batteryVoltage}V cannot form an exact ${systemVoltage}V battery bank. Choose a voltage that divides evenly (e.g., 12V, 24V, 48V).`,
      );
      return;
    }

    const selectedBattery: BatterySpec = {
      brand: brand.trim(),
      model: model.trim(),
      type: batteryType,
      voltage: batteryVoltage,
      ...(batteryType === "lithium"
        ? { capacityKWh: batteryCapacity }
        : { capacityAh: batteryCapacity }),
    };

    setSelectedBattery(selectedBattery);
    setValidationTriggered(true);

    // ✅ Persist the recomputed sizing so Step 16 knows the final battery
    if (sizing) {
      setBatterySizing(sizing);
    }

    if (validation) {
      setWarnings(validation.warnings);
      setErrors(validation.errors);
    }
  };

  const handleContinue = () => {
    if (!validationTriggered || !design.selectedBattery) {
      setError("Validate the selected battery before continuing.");
      return;
    }

    if (validation && validation.status === "fail") {
      setError(
        "The selected battery bank does not satisfy the requirement. Correct the selection before continuing.",
      );
      return;
    }

    completeStep(7);
    setCurrentStep(8);
  };

  const handleBack = () => {
    setCurrentStep(6);
  };

  const requiredCapacityDisplay = useMemo(() => {
    if (!sizing) return "—";
    return batteryType === "lithium"
      ? `${formatNumber(sizing.requiredCapacityKWh || 0)} kWh`
      : `${formatNumber(sizing.requiredCapacityAh || 0)} Ah`;
  }, [sizing, batteryType]);

  const getStatusBadge = (status: "pass" | "warning" | "fail") => {
    switch (status) {
      case "pass":
        return <Badge className="bg-green-500">✅ PASS</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500">⚠️ WARNING</Badge>;
      case "fail":
        return <Badge className="bg-red-500">❌ FAIL</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Battery className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Step 7: Battery Selection</h2>
            <p className="text-sm text-muted-foreground">
              Select and validate a battery for your system using smart
              suggestions or manual entry.
            </p>
          </div>
        </div>
      </div>

      {/* Requirement Summary — reflects the CURRENT type */}
      {sizing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Battery Requirement</span>
              <Badge variant="outline" className="capitalize">
                {batteryType}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Battery Type</p>
                <p className="mt-1 text-xl font-bold capitalize">
                  {batteryType}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Required Bank Voltage
                </p>
                <p className="mt-1 text-xl font-bold">{systemVoltage} V</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Required Capacity
                </p>
                <p className="mt-1 text-xl font-bold">
                  {requiredCapacityDisplay}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                <Badge variant="secondary" className="ml-auto">
                  AI-Powered
                </Badge>
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
                Enter battery specifications manually
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
              AI-Powered Battery Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSuggestions ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">
                    Finding the best battery...
                  </p>
                </div>
              </div>
            ) : smartSuggestion && smartSuggestion.suggested ? (
              <div className="space-y-4">
                <div className="rounded-lg border-2 border-primary/50 p-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-lg font-bold">
                          {smartSuggestion.suggested.brand}{" "}
                          {smartSuggestion.suggested.model}
                        </h4>
                        <Badge className="bg-primary">Best Match</Badge>
                        {isPartnerBrand(smartSuggestion.suggested.brand) && (
                          <Badge className="bg-blue-500">🇳🇬 Aurora Partner</Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Match Score:
                        </span>
                        <span className="font-semibold text-primary">
                          {smartSuggestion.matchScore}%
                        </span>
                      </div>
                      <p className="mt-2 text-sm">
                        {smartSuggestion.reason}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {smartSuggestion.suggested.voltage}V
                        </Badge>
                        {smartSuggestion.suggested.capacityKWh && (
                          <Badge variant="outline">
                            {smartSuggestion.suggested.capacityKWh} kWh
                          </Badge>
                        )}
                        {smartSuggestion.suggested.capacityAh && (
                          <Badge variant="outline">
                            {smartSuggestion.suggested.capacityAh} Ah
                          </Badge>
                        )}
                        {smartSuggestion.suggested.priceNGN && (
                          <Badge variant="secondary">
                            ₦
                            {smartSuggestion.suggested.priceNGN.toLocaleString()}
                          </Badge>
                        )}
                        {smartSuggestion.suggested.availability === "high" && (
                          <Badge className="bg-green-500">In Stock</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() =>
                        handleApplySuggestion(smartSuggestion.suggested!)
                      }
                    >
                      Select This
                    </Button>
                  </div>
                </div>

                {smartSuggestion.alternatives.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-muted-foreground">
                      Alternatives ({smartSuggestion.alternatives.length})
                    </p>
                    <div className="space-y-2">
                      {smartSuggestion.alternatives.map((alt, i) => (
                        <div
                          key={i}
                          className="flex flex-col md:flex-row md:items-center md:justify-between rounded-lg border p-3 gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">
                                {alt.brand} {alt.model}
                              </p>
                              {isPartnerBrand(alt.brand) && (
                                <Badge className="bg-blue-500">🇳🇬 Aurora Partner</Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                              <span>{alt.voltage}V</span>
                              {alt.capacityKWh && (
                                <span>{alt.capacityKWh} kWh</span>
                              )}
                              {alt.capacityAh && (
                                <span>{alt.capacityAh} Ah</span>
                              )}
                              {alt.priceNGN && (
                                <span>₦{alt.priceNGN.toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApplySuggestion(alt)}
                          >
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
                <p className="text-muted-foreground">
                  No suggestions available for the selected battery type.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try switching to Manual Entry or choosing a different
                  battery type.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Entry */}
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "smart" ? "Selected Battery" : "Battery Specification"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="mb-2 block text-sm font-medium">
              Battery Type
            </Label>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => handleBatteryTypeChange("lithium")}
                className={`rounded-lg border p-4 text-left transition ${
                  batteryType === "lithium"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Battery className="h-5 w-5" />
                  <div>
                    <p className="font-semibold">Lithium</p>
                    <p className="text-sm text-muted-foreground">
                      Capacity in kWh
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleBatteryTypeChange("tubular")}
                className={`rounded-lg border p-4 text-left transition ${
                  batteryType === "tubular"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Battery className="h-5 w-5" />
                  <div>
                    <p className="font-semibold">Tubular</p>
                    <p className="text-sm text-muted-foreground">
                      Capacity in Ah
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label
                htmlFor="batteryBrand"
                className="mb-2 block text-sm font-medium"
              >
                Brand
              </Label>
              <Input
                id="batteryBrand"
                type="text"
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  setValidationTriggered(false);
                }}
                placeholder="e.g. Pylontech, Luminous"
              />
            </div>
            <div>
              <Label
                htmlFor="batteryModel"
                className="mb-2 block text-sm font-medium"
              >
                Model
              </Label>
              <Input
                id="batteryModel"
                type="text"
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  setValidationTriggered(false);
                }}
                placeholder="Enter exact model"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label
                htmlFor="batteryVoltage"
                className="mb-2 block text-sm font-medium"
              >
                Battery Voltage (V)
              </Label>
              <Input
                id="batteryVoltage"
                type="number"
                min="0"
                step="0.1"
                value={voltage}
                onChange={(e) => {
                  setVoltage(e.target.value);
                  setValidationTriggered(false);
                }}
                placeholder="e.g. 12, 24, 48"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Must divide evenly into {systemVoltage}V
              </p>
            </div>
            <div>
              <Label
                htmlFor="batteryCapacity"
                className="mb-2 block text-sm font-medium"
              >
                Battery Capacity (
                {batteryType === "lithium" ? "kWh" : "Ah"})
              </Label>
              <Input
                id="batteryCapacity"
                type="number"
                min="0"
                step="0.01"
                value={capacity}
                onChange={(e) => {
                  setCapacity(e.target.value);
                  setValidationTriggered(false);
                }}
                placeholder={
                  batteryType === "lithium" ? "e.g. 5.12" : "e.g. 200"
                }
              />
            </div>
          </div>

          <Button onClick={handleValidate} className="w-full md:w-auto">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Validate Battery
          </Button>
        </CardContent>
      </Card>

      {/* Battery Bank Configuration Display */}
      {configuration && configuration.exactVoltageMatch && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>🔋 Battery Bank Configuration</span>
              {validation && getStatusBadge(validation.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border-2 border-primary/30 p-4 text-center bg-primary/5">
                <p className="text-sm text-muted-foreground">
                  Batteries in Series
                </p>
                <p className="mt-1 text-3xl font-bold text-primary">
                  {configuration.seriesBatteries}
                </p>
                <p className="text-xs text-muted-foreground">
                  {voltage}V × {configuration.seriesBatteries} ={" "}
                  {configuration.actualBankVoltage}V
                </p>
              </div>

              <div className="rounded-lg border-2 border-primary/30 p-4 text-center bg-primary/5">
                <p className="text-sm text-muted-foreground">
                  Parallel Strings
                </p>
                <p className="mt-1 text-3xl font-bold text-primary">
                  {configuration.parallelStrings}
                </p>
                <p className="text-xs text-muted-foreground">
                  To meet capacity requirement
                </p>
              </div>

              <div className="rounded-lg border-2 border-primary/50 p-4 text-center bg-primary/10">
                <p className="text-sm text-muted-foreground">
                  Total Batteries Required
                </p>
                <p className="mt-1 text-3xl font-bold text-primary">
                  {configuration.totalBatteryCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  {configuration.seriesBatteries}S ×{" "}
                  {configuration.parallelStrings}P
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Actual Bank Voltage
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {formatNumber(configuration.actualBankVoltage, 0)} V
                </p>
                <p className="text-xs text-green-600">
                  ✅ Matches system voltage
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Actual Bank Capacity
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {batteryType === "lithium"
                    ? `${formatNumber(configuration.actualBankCapacityKWh ?? 0)} kWh`
                    : `${formatNumber(configuration.actualBankCapacityAh ?? 0)} Ah`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Required: {requiredCapacityDisplay}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Actual Bank Energy
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {formatNumber(
                    configuration.actualBankCapacityKWh ?? 0,
                  )}{" "}
                  kWh
                </p>
                <p className="text-xs text-muted-foreground">
                  Total bank capacity
                </p>
              </div>
            </div>

            {validation && validation.warnings.length > 0 && (
              <div className="mt-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
                <div className="flex gap-2">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500" />
                  <div className="text-sm">
                    {validation.warnings.map((w, i) => (
                      <p key={i}>⚠️ {w}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {validation && validation.errors.length > 0 && (
              <div className="mt-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3">
                <div className="flex gap-2">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                  <div className="text-sm text-red-700">
                    {validation.errors.map((e, i) => (
                      <p key={i}>❌ {e}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {configuration && !configuration.exactVoltageMatch && (
        <Card className="border-red-500/50">
          <CardContent className="pt-6">
            <div className="flex gap-3 text-red-600">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">Invalid Battery Voltage</p>
                <p className="text-sm mt-1">{configuration.voltageError}</p>
                <p className="text-sm mt-1 text-muted-foreground">
                  Choose a battery voltage that divides evenly into{" "}
                  {systemVoltage}V (e.g., 12V, 24V, 48V).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-500/50">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-700">
                Battery selection error
              </p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Selected Battery</CardTitle>
        </CardHeader>
        <CardContent>
          {design.selectedBattery ? (
            <div className="rounded-lg border p-4">
              <p className="font-semibold">
                {design.selectedBattery.brand} {design.selectedBattery.model}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {design.selectedBattery.type === "lithium"
                  ? `${design.selectedBattery.voltage} V • ${design.selectedBattery.capacityKWh} kWh`
                  : `${design.selectedBattery.voltage} V • ${design.selectedBattery.capacityAh} Ah`}
              </p>
              {configuration && configuration.exactVoltageMatch && (
                <p className="mt-2 text-sm font-medium text-primary">
                  Bank Configuration: {configuration.seriesBatteries}S ×{" "}
                  {configuration.parallelStrings}P ={" "}
                  {configuration.totalBatteryCount} batteries
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No commercial battery has been selected yet.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Step 6
        </Button>

        <Button
          onClick={handleContinue}
          disabled={
            !validationTriggered ||
            !design.selectedBattery ||
            validation?.status === "fail"
          }
        >
          Continue to Step 8
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}