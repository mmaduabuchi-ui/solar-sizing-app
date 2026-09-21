// src/components/steps/Step10PanelArrangement.tsx
"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Grid,
  X,
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
import { calculatePanelArrangement } from "@/lib/calculations/panelArrangement";
import type { PanelArrangementCandidate } from "@/types/solar";

export default function Step10PanelArrangement() {
  const {
    design,
    setPanelArrangement,
    completeStep,
    setCurrentStep,
    setWarnings,
    setErrors,
  } = useSolarStore();

  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number | null>(null);
  const [calculationError, setCalculationError] = useState("");
  const [hasCalculated, setHasCalculated] = useState(!!design.panelArrangement);

  // Get required data
  const requiredPVPowerW = useMemo(() => {
    if (!design.energyCalculation) return 0;
    return design.energyCalculation.requiredPVPowerW;
  }, [design.energyCalculation]);

  const selectedPanel = design.selectedPanel;
  const inverter = design.selectedInverter;

  // ✅ Helper: compute true ILR (array power ÷ inverter rated watts)
  const computeILR = (arrayPowerW: number): number | null => {
    if (!inverter || !inverter.ratedWatts || inverter.ratedWatts <= 0) {
      return null;
    }
    return arrayPowerW / inverter.ratedWatts;
  };

  // Calculate all possible arrangements with DYNAMIC max panel count
  const arrangementResult = useMemo(() => {
    if (!selectedPanel || requiredPVPowerW <= 0) return null;

    try {
      // ✅ Dynamically calculate max panels for industrial systems
      const estimatedPanels = Math.ceil(requiredPVPowerW / selectedPanel.pmaxW);
      const maxPanels = Math.max(100, Math.ceil(estimatedPanels * 1.5));

      return calculatePanelArrangement({
        requiredPVPowerW,
        selectedPanel,
        inverter: inverter || undefined,
        currentSafetyFactor: 1.25,
        maxPanelCount: maxPanels,
      });
    } catch (error) {
      console.error("Panel arrangement calculation failed:", error);
      return null;
    }
  }, [selectedPanel, requiredPVPowerW, inverter]);

  // Get valid candidates
  const validCandidates = useMemo(() => {
    if (!arrangementResult) return [];
    return arrangementResult.candidates.filter(
      (c) => c.valid && c.arrayPowerW >= requiredPVPowerW
    );
  }, [arrangementResult, requiredPVPowerW]);

  // Handle candidate selection
  const handleSelectCandidate = (index: number) => {
    setSelectedCandidateIndex(index);
    setHasCalculated(true);
    setCalculationError("");
    setWarnings([]);
    setErrors([]);

    const candidate = validCandidates[index];
    if (candidate && arrangementResult) {
      setPanelArrangement({
        ...arrangementResult,
        selectedArrangement: candidate,
      });
    }
  };

  const handleContinue = () => {
    if (!hasCalculated || !design.panelArrangement || !design.panelArrangement.selectedArrangement) {
      setCalculationError("Please select a panel arrangement first.");
      return;
    }

    completeStep(9);
    setCurrentStep(10);
  };

  const handleBack = () => {
    setCurrentStep(8);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat("en-NG", {
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Render a visual representation of the arrangement (limited for large systems)
  const renderPanelGrid = (candidate: PanelArrangementCandidate) => {
    const rows = candidate.parallelStrings;
    const cols = candidate.panelsInSeries;

    // For large systems (>50 panels), show a simplified view
    const isLargeSystem = candidate.panelCount > 50;

    if (isLargeSystem) {
      return (
        <div className="mt-4 rounded-lg border p-4 bg-muted/30">
          <p className="text-sm font-medium mb-2">Array Layout (Simplified)</p>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border-2 border-primary"></div>
              <span>{cols} panels in series (string)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-primary/30"></div>
              <span>{rows} parallel strings</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Total: {candidate.panelCount} panels ({cols}S × {rows}P)
          </p>
        </div>
      );
    }

    return (
      <div className="mt-4">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(cols, 8)}, 1fr)` }}>
          {Array.from({ length: Math.min(candidate.panelCount, 40) }).map((_, index) => {
            const row = Math.floor(index / Math.min(cols, 8));
            const col = index % Math.min(cols, 8);
            const isFirstCol = col === 0;
            const isLastCol = col === Math.min(cols, 8) - 1;

            return (
              <div
                key={index}
                className={`aspect-square rounded-lg border-2 p-2 text-center text-xs ${
                  isFirstCol ? 'border-l-4 border-l-primary' : ''
                } ${isLastCol ? 'border-r-4 border-r-primary' : ''}
                flex items-center justify-center bg-muted/30 transition-colors hover:bg-muted/50`}
              >
                <div>
                  <div className="font-bold text-xs">P{index + 1}</div>
                  <div className="text-[8px] text-muted-foreground">
                    {row + 1}S
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {candidate.panelCount > 40 && (
          <p className="mt-2 text-xs text-muted-foreground text-center">
            Showing first 40 of {candidate.panelCount} panels
          </p>
        )}
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>← Series Connection →</span>
          <span>↑ Parallel Strings ↑</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Grid className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Step 9: Panel Arrangement</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your solar panels in series and parallel to match your inverter's MPPT specifications.
        </p>
      </div>

      {/* Selected Panel Summary */}
      {selectedPanel && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Panel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="font-semibold">
                  {selectedPanel.brand} {selectedPanel.model}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedPanel.pmaxW}W • {selectedPanel.voc}V Voc • {selectedPanel.vmp}V Vmp
                </p>
              </div>
              <Badge variant="outline" className="ml-auto">
                Required: {formatNumber(requiredPVPowerW)} W
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inverter MPPT Limits */}
      {inverter && (
        <Card>
          <CardHeader>
            <CardTitle>Inverter MPPT Specifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-5">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Max PV Input</p>
                <p className="font-semibold">{inverter.maxPVInputW} W</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Max PV Voc</p>
                <p className="font-semibold">{inverter.maxPVVoc} V</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">MPPT Range</p>
                <p className="font-semibold">
                  {inverter.mpptMinVoltage} - {inverter.mpptMaxVoltage} V
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">MPPT Current</p>
                <p className="font-semibold">{inverter.mpptCurrent} A</p>
              </div>
              <div className="rounded-lg border p-3 border-primary/50 bg-primary/5">
                <p className="text-xs text-muted-foreground">MPPT Trackers</p>
                <p className="font-semibold">
                  {inverter.mpptCount || 1} × {inverter.mpptCurrent}A
                </p>
                <p className="text-xs text-muted-foreground">
                  Total: {(inverter.mpptCount || 1) * inverter.mpptCurrent}A
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Arrangement Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Available Arrangements</span>
            {validCandidates.length > 0 && (
              <Badge variant="outline">{validCandidates.length} valid configurations</Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Select the best arrangement for your system
          </p>
        </CardHeader>
        <CardContent>
          {validCandidates.length === 0 ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
              <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
              <p className="mt-2 font-medium">No Valid Arrangements Found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try selecting a different panel or check your inverter specifications.
              </p>
              {inverter && (
                <div className="mt-4 text-left text-sm">
                  <p className="font-medium">Current Inverter Limits:</p>
                  <ul className="mt-1 text-muted-foreground">
                    <li>• Max PV Voc: {inverter.maxPVVoc}V</li>
                    <li>• MPPT Voltage: {inverter.mpptMinVoltage}-{inverter.mpptMaxVoltage}V</li>
                    <li>• MPPT Current: {inverter.mpptCurrent}A × {inverter.mpptCount || 1} trackers = {(inverter.mpptCurrent || 0) * (inverter.mpptCount || 1)}A total</li>
                  </ul>
                  <p className="mt-2 text-muted-foreground">
                    <strong>Tip:</strong> For large systems, increase MPPT count or MPPT current per tracker.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {validCandidates.slice(0, 20).map((candidate, index) => {
                const isSelected = selectedCandidateIndex === index;
                const isRecommended =
                  candidate.panelCount === arrangementResult?.minimumPanelCount &&
                  candidate.oversizingRatio <= 1.3;

                return (
                  <button
                    key={index}
                    onClick={() => handleSelectCandidate(index)}
                    className={`w-full rounded-lg border p-4 text-left transition ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold">
                            {candidate.panelsInSeries}S × {candidate.parallelStrings}P
                          </h4>
                          {isRecommended && (
                            <Badge className="bg-green-500">Recommended</Badge>
                          )}
                          {isSelected && (
                            <Badge variant="default">Selected</Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-sm">
                          <span>
                            <span className="text-muted-foreground">Panels:</span>{" "}
                            {candidate.panelCount}
                          </span>
                          <span>
                            <span className="text-muted-foreground">Power:</span>{" "}
                            {candidate.arrayPowerW} W
                          </span>
                          <span>
                            <span className="text-muted-foreground">String Voc:</span>{" "}
                            {candidate.stringVocV.toFixed(1)} V
                          </span>
                          <span>
                            <span className="text-muted-foreground">Array Isc:</span>{" "}
                            {candidate.arrayIscA.toFixed(1)} A
                          </span>
                          {candidate.mpptCount && candidate.mpptCount > 1 && (
                            <span>
                              <span className="text-muted-foreground">Per MPPT:</span>{" "}
                              {candidate.currentPerMppt?.toFixed(1)} A
                            </span>
                          )}
                          <span>
                            <span className="text-muted-foreground">Oversizing:</span>{" "}
                            {candidate.oversizingPercent.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {candidate.valid ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <X className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                    </div>

                    {/* Visual Grid */}
                    {isSelected && renderPanelGrid(candidate)}

                    {/* Electrical Details */}
                    {isSelected && (
                      <div className="mt-4 grid gap-2 rounded-lg bg-muted/30 p-3 md:grid-cols-5">
                        <div>
                          <p className="text-xs text-muted-foreground">String Voltage</p>
                          <p className="font-medium">
                            {candidate.stringVocV.toFixed(1)} V (Voc)
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {candidate.stringVmpV.toFixed(1)} V (Vmp)
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Array Current</p>
                          <p className="font-medium">
                            {candidate.arrayIscA.toFixed(1)} A (Isc)
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {candidate.arrayImpA.toFixed(1)} A (Imp)
                          </p>
                        </div>
                        {inverter && (
                          <div>
                            <p className="text-xs text-muted-foreground">MPPT Distribution</p>
                            <p className="font-medium">
                              {candidate.mpptCount || 1} tracker
                              {(candidate.mpptCount || 1) > 1 ? "s" : ""}
                            </p>
                            {/* ✅ FIX: single-tracker wording */}
                            <p className="text-sm text-muted-foreground">
                              {(candidate.mpptCount || 1) === 1
                                ? `${candidate.parallelStrings} strings on 1 tracker`
                                : `${(candidate.stringsPerMppt || candidate.parallelStrings).toFixed(1)} strings each`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(candidate.currentPerMppt || candidate.arrayIscA).toFixed(1)}A per tracker
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">Oversizing</p>
                          <p className="font-medium">
                            {candidate.oversizingPercent.toFixed(1)}%
                          </p>
                          {/* ✅ FIX: true ILR = arrayPowerW ÷ inverterRatedWatts */}
                          <p className="text-sm text-muted-foreground">
                            ILR:{" "}
                            {(() => {
                              const ilr = computeILR(candidate.arrayPowerW);
                              return ilr !== null ? ilr.toFixed(2) : "N/A";
                            })()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          {candidate.reasons.length === 0 ? (
                            <p className="font-medium text-green-600">Valid</p>
                          ) : (
                            <p className="font-medium text-destructive">Invalid</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Reasons if invalid */}
                    {candidate.reasons.length > 0 && (
                      <div className="mt-2 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">
                        {candidate.reasons.map((reason, idx) => (
                          <div key={idx}>• {reason}</div>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
              {validCandidates.length > 20 && (
                <p className="text-center text-sm text-muted-foreground">
                  Showing first 20 of {validCandidates.length} valid configurations
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {calculationError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">Configuration Error</p>
                <p className="mt-1 text-sm">{calculationError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engineering Note */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">Arrangement Guidelines</p>
              <p className="text-muted-foreground">
                <strong>Series (S):</strong> Increases voltage. Must stay below inverter's max PV Voc.
              </p>
              <p className="text-muted-foreground">
                <strong>Parallel (P):</strong> Increases current. Must stay below total MPPT current limit.
              </p>
              <p className="text-muted-foreground">
                <strong>Multiple MPPT:</strong> Large inverters have 2-10 MPPT trackers. Strings are distributed across them.
              </p>
              <p className="text-muted-foreground">
                <strong>Optimal ILR:</strong> 1.2 - 1.3 (PV array 20-30% larger than required).
              </p>
              <p className="text-muted-foreground">
                <strong>Nigeria-specific:</strong> Higher oversizing (ILR 1.3-1.5) recommended for cloudy regions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t pt-6">
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Panel Selection
        </Button>
        <Button
          onClick={handleContinue}
          disabled={
            !hasCalculated ||
            !design.panelArrangement ||
            !design.panelArrangement.selectedArrangement
          }
        >
          Continue to Charge Controller
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}