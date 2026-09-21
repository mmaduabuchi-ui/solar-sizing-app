// src/components/steps/Step11Oversizing.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  TrendingUp,
  X,
  ArrowLeft,
  Filter,
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

interface ArrangementOption {
  id: string;
  name: string;
  panelsInSeries: number;
  parallelStrings: number;
  panelCount: number;
  arrayPowerW: number;
  requiredPVPowerW: number;
  inverterRatedPowerW: number;
  ilr: number;
  oversizingPercent: number;
  status: "undersized" | "below-preferred" | "acceptable" | "above-preferred" | "excessive";
  isValid: boolean;
  isPractical: boolean;
  impracticalReason?: string;
  reasons: string[];
  isOriginal: boolean;
}

export default function Step11Oversizing() {
  const {
    design,
    completeStep,
    setCurrentStep,
    setWarnings,
    setErrors,
    setPanelArrangement,
  } = useSolarStore();

  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(0);
  const [showImpractical, setShowImpractical] = useState(false);

  const selectedPanel = design.selectedPanel;
  const panelArrangement = design.panelArrangement;
  const inverter = design.selectedInverter;

  // Get the original arrangement from Step 9
  const originalArrangement = panelArrangement?.selectedArrangement;

  // ✅ MPPT-aware practical limits
  const mpptCount = inverter?.mpptCount || 1;
  const MAX_PARALLEL_STRINGS = Math.min(50, mpptCount * 20);

  // ✅ FIX: derive minimum series from the inverter's MPPT floor
  // (instead of a hard-coded 5, which is wrong for 12V/24V systems)
  const MIN_SERIES_FOR_MPPT = useMemo(() => {
    if (!inverter || !selectedPanel || selectedPanel.vmp <= 0) return 1;
    const mpptMin = inverter.mpptMinVoltage || 0;
    return Math.max(1, Math.ceil(mpptMin / selectedPanel.vmp));
  }, [inverter, selectedPanel]);

  // Calculate all possible arrangements
  const arrangementOptions = useMemo(() => {
    if (!selectedPanel || !inverter) return [];

    const requiredPVPowerW = design.energyCalculation?.requiredPVPowerW || 0;
    const inverterRatedPowerW = inverter.ratedWatts;
    const panelWattage = selectedPanel.pmaxW;
    const panelVoc = selectedPanel.voc;
    const panelVmp = selectedPanel.vmp;

    if (requiredPVPowerW <= 0 || inverterRatedPowerW <= 0) return [];

    const options: ArrangementOption[] = [];

    // Dynamic search space based on system size
    const minPanels = Math.ceil(requiredPVPowerW / panelWattage);
    const maxPanels = Math.ceil(minPanels * 1.5);
    const maxSeriesAllowed = Math.floor(
      (inverter.maxPVVoc || 1500) / panelVoc
    );

    // ✅ Practical series range based on MPPT voltage limits
    const mpptMinVoltage = inverter.mpptMinVoltage || 0;
    const mpptMaxVoltage = inverter.mpptMaxVoltage || 1500;
    const minSeriesForMPPT = Math.max(
      MIN_SERIES_FOR_MPPT,
      Math.ceil(mpptMinVoltage / panelVmp)
    );
    const maxSeriesForMPPT = Math.min(
      maxSeriesAllowed,
      Math.floor(mpptMaxVoltage / panelVmp)
    );

    console.log("Step 11 search space:", {
      minPanels,
      maxPanels,
      maxSeriesAllowed,
      practicalSeriesRange: `${minSeriesForMPPT}-${maxSeriesForMPPT}`,
      maxParallel: MAX_PARALLEL_STRINGS,
      mpptCount,
    });

    // Generate arrangements within realistic bounds
    for (let series = 1; series <= maxSeriesAllowed; series++) {
      // Calculate min/max parallel strings for this series count
      const minParallel = Math.max(1, Math.ceil(minPanels / series));
      const maxParallel = Math.ceil(maxPanels / series);

      for (let parallel = minParallel; parallel <= maxParallel; parallel++) {
        const panelCount = series * parallel;

        // Skip if outside range
        if (panelCount < minPanels * 0.95) continue;
        if (panelCount > maxPanels) continue;

        const arrayPowerW = panelCount * panelWattage;

        // Skip if power is way off
        if (arrayPowerW < requiredPVPowerW * 0.95) continue;
        if (arrayPowerW > inverterRatedPowerW * 2.0) continue;

        const ilr = arrayPowerW / inverterRatedPowerW;
        const oversizingPercent = ((arrayPowerW / requiredPVPowerW) - 1) * 100;

        let status: ArrangementOption["status"];
        const reasons: string[] = [];
        let isValid = true;

        // Nigeria-aware thresholds
        if (arrayPowerW < requiredPVPowerW) {
          status = "undersized";
          isValid = false;
          reasons.push(
            `PV array ${arrayPowerW}W is below required ${requiredPVPowerW.toFixed(0)}W`
          );
        } else if (ilr < 1.2) {
          status = "below-preferred";
          isValid = true;
          reasons.push(`ILR ${ilr.toFixed(2)} is below preferred minimum of 1.20`);
        } else if (ilr <= 1.3) {
          status = "acceptable";
          isValid = true;
        } else if (ilr <= 1.5) {
          status = "acceptable";
          isValid = true;
          reasons.push(
            `ILR ${ilr.toFixed(2)} is within Nigeria's optimal range (1.3-1.5)`
          );
        } else if (ilr <= 1.8) {
          status = "above-preferred";
          isValid = true;
          reasons.push(
            `ILR ${ilr.toFixed(2)} is above Nigeria's recommended range of 1.5`
          );
        } else {
          status = "excessive";
          isValid = false;
          reasons.push(`ILR ${ilr.toFixed(2)} is excessively high`);
        }

        // ✅ Check practical limits (using dynamic min/max series)
        let isPractical = true;
        let impracticalReason: string | undefined;

        if (series < minSeriesForMPPT) {
          isPractical = false;
          impracticalReason = `String voltage too low (${series}S × ${panelVmp}V = ${(series * panelVmp).toFixed(0)}V < ${mpptMinVoltage}V MPPT minimum)`;
        } else if (series > maxSeriesForMPPT) {
          isPractical = false;
          impracticalReason = `String voltage too high (${series}S × ${panelVoc}V = ${(series * panelVoc).toFixed(0)}V > ${inverter.maxPVVoc}V max)`;
        } else if (parallel > MAX_PARALLEL_STRINGS) {
          isPractical = false;
          impracticalReason = `Too many parallel strings (${parallel} > ${MAX_PARALLEL_STRINGS} practical limit)`;
        }

        // Check if this is the original arrangement
        const isOriginal = !!(
          originalArrangement &&
          originalArrangement.panelsInSeries === series &&
          originalArrangement.parallelStrings === parallel &&
          originalArrangement.panelCount === panelCount
        );

        options.push({
          id: `${series}S${parallel}P`,
          name: `${series}S × ${parallel}P`,
          panelsInSeries: series,
          parallelStrings: parallel,
          panelCount,
          arrayPowerW,
          requiredPVPowerW,
          inverterRatedPowerW,
          ilr,
          oversizingPercent,
          status,
          isValid,
          isPractical,
          impracticalReason,
          reasons,
          isOriginal,
        });
      }
    }

    // Sort: Original first, then practical+valid, then by closeness to ideal ILR (1.35)
    const sorted = options.sort((a, b) => {
      // Original arrangement always first
      if (a.isOriginal && !b.isOriginal) return -1;
      if (!a.isOriginal && b.isOriginal) return 1;

      // Practical before impractical
      if (a.isPractical && !b.isPractical) return -1;
      if (!a.isPractical && b.isPractical) return 1;

      // Valid before invalid
      if (a.isValid && !b.isValid) return -1;
      if (!a.isValid && b.isValid) return 1;

      // Then by distance from Nigeria's ideal ILR (1.35)
      const aDist = Math.abs(a.ilr - 1.35);
      const bDist = Math.abs(b.ilr - 1.35);
      return aDist - bDist;
    });

    // Limit to top 50
    return sorted.slice(0, 50);

  }, [selectedPanel, inverter, design.energyCalculation, originalArrangement, MAX_PARALLEL_STRINGS, MIN_SERIES_FOR_MPPT]);

  // ✅ Filter options: keep practical OR original
  const filteredOptions = useMemo(() => {
    if (showImpractical) return arrangementOptions;
    return arrangementOptions.filter(
      (opt) => opt.isPractical || opt.isOriginal
    );
  }, [arrangementOptions, showImpractical]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: arrangementOptions.length,
      practical: arrangementOptions.filter((o) => o.isPractical).length,
      impractical: arrangementOptions.filter((o) => !o.isPractical).length,
    };
  }, [arrangementOptions]);

  // Get the currently selected option
  const currentOption = useMemo(() => {
    if (filteredOptions.length === 0 || selectedOptionIndex >= filteredOptions.length) {
      return null;
    }
    return filteredOptions[selectedOptionIndex];
  }, [filteredOptions, selectedOptionIndex]);

  // Auto-select the original arrangement if it exists
  useEffect(() => {
    if (filteredOptions.length > 0) {
      const originalIndex = filteredOptions.findIndex((opt) => opt.isOriginal);
      if (originalIndex !== -1) {
        setSelectedOptionIndex(originalIndex);
      } else {
        setSelectedOptionIndex(0);
      }
    }
  }, [filteredOptions]);

  const handleSelectOption = (index: number) => {
    setSelectedOptionIndex(index);
  };

  const handleApplyOption = () => {
    if (!currentOption || !selectedPanel) return;

    const newArrangement = {
      ...design.panelArrangement!,
      selectedArrangement: {
        panelCount: currentOption.panelCount,
        panelsInSeries: currentOption.panelsInSeries,
        parallelStrings: currentOption.parallelStrings,
        arrayPowerW: currentOption.arrayPowerW,
        oversizingRatio: currentOption.ilr,
        oversizingPercent: currentOption.oversizingPercent,
        stringVocV: currentOption.panelsInSeries * selectedPanel.voc,
        stringVmpV: currentOption.panelsInSeries * selectedPanel.vmp,
        arrayIscA: currentOption.parallelStrings * selectedPanel.isc,
        arrayImpA: currentOption.parallelStrings * selectedPanel.imp,
        valid: currentOption.isValid,
        reasons: currentOption.reasons,
      },
    };

    setPanelArrangement(newArrangement);

    const warnings: string[] = [];
    const errors: string[] = [];

    if (
      currentOption.status === "below-preferred" ||
      currentOption.status === "above-preferred"
    ) {
      warnings.push(
        `ILR of ${currentOption.ilr.toFixed(2)} is outside preferred range (1.2-1.3)`
      );
    }

    if (!currentOption.isValid) {
      errors.push(
        `This arrangement is invalid: ${currentOption.reasons.join(", ")}`
      );
    }

    setWarnings(warnings);
    setErrors(errors);

    if (currentOption.isValid) {
      completeStep(11);
      setCurrentStep(12);
    } else {
      setWarnings([...warnings, "Please select a valid arrangement"]);
    }
  };

  const handleBack = () => {
    setCurrentStep(10);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "acceptable": return "border-green-500 bg-green-50 dark:bg-green-950/20";
      case "below-preferred": return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
      case "above-preferred": return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
      case "undersized": return "border-red-500 bg-red-50 dark:bg-red-950/20";
      case "excessive": return "border-red-500 bg-red-50 dark:bg-red-950/20";
      default: return "border-muted bg-muted/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "acceptable": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "below-preferred": return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "above-preferred": return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "undersized": return <X className="h-5 w-5 text-red-500" />;
      case "excessive": return <X className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "acceptable": return "✅ Acceptable";
      case "below-preferred": return "⚠️ Below Preferred";
      case "above-preferred": return "⚠️ Above Preferred";
      case "undersized": return "❌ Undersized";
      case "excessive": return "❌ Excessive";
      default: return "Unknown";
    }
  };

  if (!selectedPanel || !inverter) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Step 11: Oversizing Analysis</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Analyze your PV array oversizing and Inverter Loading Ratio (ILR).
        </p>
        <Card className="border-amber-500/50">
          <CardContent className="pt-6">
            <div className="flex gap-3 text-amber-600">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">Prerequisites Required</p>
                <p className="text-sm text-muted-foreground">
                  Complete Steps 8-10 first (Panel Selection, Arrangement, and Charge Controller).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between border-t pt-6">
          <Button variant="outline" onClick={handleBack}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button disabled>Continue</Button>
        </div>
      </div>
    );
  }

  if (filteredOptions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Step 11: Oversizing Analysis</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Analyze your PV array oversizing and Inverter Loading Ratio (ILR).
        </p>
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">No Valid Arrangements Found</p>
                <p className="text-sm text-muted-foreground">
                  Try selecting a different panel or adjusting your system requirements.
                </p>
                <div className="mt-2 text-xs space-y-1">
                  <p>Debug info:</p>
                  <p>Required PV: {design.energyCalculation?.requiredPVPowerW.toFixed(0)} W</p>
                  <p>Panel Wattage: {selectedPanel.pmaxW} W</p>
                  <p>Panel Voc: {selectedPanel.voc} V</p>
                  <p>Panel Vmp: {selectedPanel.vmp} V</p>
                  <p>Inverter Max Voc: {inverter.maxPVVoc} V</p>
                  <p>MPPT Voltage Range: {inverter.mpptMinVoltage}-{inverter.mpptMaxVoltage} V</p>
                  <p>Min Series (from MPPT): {MIN_SERIES_FOR_MPPT}</p>
                  <p>Max Parallel: {MAX_PARALLEL_STRINGS}</p>
                </div>
                {!showImpractical && stats.impractical > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setShowImpractical(true)}
                  >
                    Show {stats.impractical} impractical options
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between border-t pt-6">
          <Button variant="outline" onClick={handleBack}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button disabled>Continue</Button>
        </div>
      </div>
    );
  }

  const originalIndex = filteredOptions.findIndex((opt) => opt.isOriginal);
  const hasOriginal = originalIndex !== -1;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Step 11: Oversizing Analysis</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Review PV array oversizing and Inverter Loading Ratio (ILR). Select the best configuration for your system.
        </p>
        {hasOriginal && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Your original arrangement from Step 9 is marked with{" "}
            <Badge variant="outline" className="border-blue-500 text-blue-600">
              Original
            </Badge>
          </div>
        )}
      </div>

      {/* Filter Toggle */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Showing <strong>{filteredOptions.length}</strong> configurations
              </span>
              {stats.impractical > 0 && !showImpractical && (
                <span className="text-muted-foreground">
                  ({stats.impractical} impractical hidden)
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImpractical(!showImpractical)}
            >
              {showImpractical
                ? `Hide Impractical (${stats.impractical})`
                : `Show Impractical (${stats.impractical})`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Selection Summary */}
      {currentOption && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                Selected Configuration
                {currentOption.isOriginal && (
                  <Badge className="bg-blue-500">Original</Badge>
                )}
                {currentOption.isValid && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                {!currentOption.isValid && (
                  <X className="h-5 w-5 text-red-500" />
                )}
              </span>
              <Badge className={currentOption.isValid ? "bg-green-500" : "bg-red-500"}>
                {currentOption.isValid ? "Valid" : "Invalid"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Configuration</p>
                <p className="mt-1 text-xl font-bold">{currentOption.name}</p>
                <p className="text-xs text-muted-foreground">
                  {currentOption.panelCount} panels
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Array Power</p>
                <p className="mt-1 text-xl font-bold">
                  {currentOption.arrayPowerW.toLocaleString()} W
                </p>
                <p className="text-xs text-muted-foreground">
                  Req: {currentOption.requiredPVPowerW.toFixed(0)} W
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">ILR</p>
                <p
                  className={`mt-1 text-xl font-bold ${
                    currentOption.ilr >= 1.2 && currentOption.ilr <= 1.5
                      ? "text-green-600"
                      : "text-yellow-600"
                  }`}
                >
                  {currentOption.ilr.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Target: 1.20 - 1.50</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Oversizing</p>
                <p className="mt-1 text-xl font-bold">
                  {currentOption.oversizingPercent.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Above requirement</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Status</p>
                <p
                  className={`mt-1 text-xl font-bold ${
                    currentOption.isValid ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {getStatusLabel(currentOption.status)}
                </p>
              </div>
            </div>

            {currentOption.reasons.length > 0 && (
              <div
                className={`mt-4 rounded-lg border p-3 ${
                  currentOption.isValid
                    ? "border-yellow-500/50 bg-yellow-500/10"
                    : "border-red-500/50 bg-red-500/10"
                }`}
              >
                <div className="flex gap-3">
                  {currentOption.isValid ? (
                    <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {currentOption.isValid ? "Warnings" : "Errors"}
                    </p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {currentOption.reasons.map((reason, index) => (
                        <li key={index}>• {reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Available Configurations</span>
            <Badge variant="outline">{filteredOptions.length} options</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {filteredOptions.map((option, index) => {
              const isSelected = selectedOptionIndex === index;
              const isIdeal = option.ilr >= 1.2 && option.ilr <= 1.5;

              return (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(index)}
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : option.isValid && option.isPractical
                        ? "hover:bg-muted/50"
                        : "opacity-60 hover:bg-muted/30"
                  } ${getStatusColor(option.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(option.status)}
                        <span className="font-semibold">{option.name}</span>
                        {option.isOriginal && (
                          <Badge
                            variant="outline"
                            className="border-blue-500 text-blue-600"
                          >
                            Original
                          </Badge>
                        )}
                        {option.isValid && isIdeal && !option.isOriginal && (
                          <Badge className="bg-green-500">Ideal</Badge>
                        )}
                        {!option.isValid && (
                          <Badge className="bg-red-500">Invalid</Badge>
                        )}
                        {!option.isPractical && (
                          <Badge className="bg-orange-500">Impractical</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>{option.panelCount} panels</span>
                      <span className="text-muted-foreground">
                        {option.arrayPowerW.toLocaleString()}W
                      </span>
                      <span
                        className={`font-medium ${
                          option.ilr >= 1.2 && option.ilr <= 1.5
                            ? "text-green-600"
                            : "text-yellow-600"
                        }`}
                      >
                        ILR: {option.ilr.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">
                        {option.oversizingPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  {option.reasons.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {option.reasons.map((reason, i) => (
                        <span key={i} className="mr-2">
                          • {reason}
                        </span>
                      ))}
                    </div>
                  )}
                  {!option.isPractical && option.impracticalReason && (
                    <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                      ⚠️ {option.impracticalReason}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Selection Buttons */}
      <div className="flex flex-wrap gap-3">
        {hasOriginal && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const idx = filteredOptions.findIndex((opt) => opt.isOriginal);
              if (idx !== -1) setSelectedOptionIndex(idx);
            }}
            className="border-blue-500 text-blue-600 hover:bg-blue-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Select Original ({filteredOptions[originalIndex]?.name})
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const idx = filteredOptions.findIndex(
              (opt) => opt.isValid && opt.isPractical && opt.ilr >= 1.2 && opt.ilr <= 1.5
            );
            if (idx !== -1) setSelectedOptionIndex(idx);
          }}
        >
          Select Ideal (ILR 1.2-1.5)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const idx = filteredOptions.findIndex((opt) => opt.isValid && opt.isPractical);
            if (idx !== -1) setSelectedOptionIndex(idx);
          }}
        >
          Select First Practical
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between border-t pt-6">
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Charge Controller
        </Button>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setSelectedOptionIndex(0)}
            disabled={filteredOptions.length === 0}
          >
            Reset Selection
          </Button>
          <Button
            onClick={handleApplyOption}
            disabled={!currentOption || !currentOption.isValid || !currentOption.isPractical}
          >
            {currentOption?.isValid && currentOption?.isPractical ? (
              <>
                Apply & Continue
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              "Select Valid & Practical"
            )}
          </Button>
        </div>
      </div>

      {/* Engineering Note */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">Oversizing Guidelines</p>
              <p className="text-muted-foreground">
                <strong>Practical Filter:</strong> Only arrangements with ≤{" "}
                {MAX_PARALLEL_STRINGS} parallel strings (based on {mpptCount} MPPT trackers) and
                ≥ {MIN_SERIES_FOR_MPPT} panels in series are shown.
              </p>
              <p className="text-muted-foreground">
                <strong>Original Arrangement:</strong> Always shown regardless of practicality.
              </p>
              <p className="text-muted-foreground">
                <strong>ILR 1.2 - 1.3 (Standard Ideal):</strong> PV array is optimally sized.
              </p>
              <p className="text-muted-foreground">
                <strong>ILR 1.3 - 1.5 (Nigeria Optimal):</strong> Recommended for cloudy regions.
              </p>
              <p className="text-muted-foreground">
                <strong>ILR 1.51 - 1.80:</strong> Oversized (warning only).
              </p>
              <p className="text-muted-foreground">
                <strong>ILR &gt; 1.80:</strong> Excessive oversizing (error).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}