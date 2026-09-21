// src/components/steps/Step12Protection.tsx
"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Shield,
  Zap,
  Battery,
  Sun,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useSolarStore } from "@/store/solarStore";

// ✅ EXPANDED: Industrial breaker ratings (MCB → MCCB → ACB)
const STANDARD_BREAKER_RATINGS = [
  // MCB (Miniature Circuit Breakers)
  6, 10, 16, 20, 25, 32, 40, 50, 63,
  // MCCB (Molded Case Circuit Breakers)
  80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800,
  // ACB (Air Circuit Breakers)
  1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000,
];

// Nigerian standard MCB types
const MCB_TYPES = [
  { value: "b", label: "B Curve", description: "Light loads, lighting, residential" },
  { value: "c", label: "C Curve", description: "Motors, transformers, commercial" },
  { value: "d", label: "D Curve", description: "Heavy motors, welders, industrial" },
];

interface ProtectionResult {
  circuit: string;
  type: string;
  requiredCurrent: number;
  protectedCurrent: number;
  recommendedBreaker: number | null;
  standard: string;
  cableSize: string;
  status: "pass" | "warning" | "fail";
  warnings: string[];
  errors: string[];
}

export default function Step12Protection() {
  const {
    design,
    completeStep,
    setCurrentStep,
    setWarnings,
    setErrors,
  } = useSolarStore();

  const [hasCalculated, setHasCalculated] = useState(false);
  const [protectionResults, setProtectionResults] = useState<ProtectionResult[]>([]);
  const [selectedMCBType, setSelectedMCBType] = useState<"b" | "c" | "d">("c");

  // ✅ Initial phase state (default: single-phase)
  const [acPhase, setAcPhase] = useState<"single" | "three">("single");
  const [acVoltage, setAcVoltage] = useState(230);

  const inverter = design.selectedInverter;
  const selectedPanel = design.selectedPanel;
  const panelArrangement = design.panelArrangement;

  // ✅ NEW: Auto-select 3-phase for industrial inverters (> 10kVA)
  // This runs whenever the inverter changes (including when loaded from store)
  useEffect(() => {
    if (inverter && inverter.ratedKVA > 10) {
      setAcPhase("three");
      setAcVoltage(415);
    } else if (inverter) {
      // Reset to single-phase for smaller inverters
      setAcPhase("single");
      setAcVoltage(230);
    }
  }, [inverter?.ratedKVA]);

  // Calculate protection sizes
  const calculateProtection = () => {
    if (!inverter) return;

    const results: ProtectionResult[] = [];

    // ============================================================
    // 1. AC Circuit Protection
    // ============================================================
    let acCurrent: number;
    if (acPhase === "three") {
      // 3-phase: I = P / (V × √3)
      acCurrent = inverter.ratedWatts / (acVoltage * Math.sqrt(3));
    } else {
      // Single-phase: I = P / V
      acCurrent = inverter.ratedWatts / acVoltage;
    }

    const acProtected = acCurrent * 1.25;
    const acBreaker =
      STANDARD_BREAKER_RATINGS.find((r) => r >= acProtected) || null;
    const acCableSize = acBreaker
      ? getCableSizeForBreaker(acBreaker)
      : "N/A";

    // Determine breaker type based on size
    let acBreakerType = "MCB";
    if (acBreaker && acBreaker > 125) acBreakerType = "MCCB";
    if (acBreaker && acBreaker > 800) acBreakerType = "ACB";

    results.push({
      circuit: `AC Output (${acPhase === "three" ? "3-Phase" : "Single-Phase"})`,
      type: acBreakerType,
      requiredCurrent: acCurrent,
      protectedCurrent: acProtected,
      recommendedBreaker: acBreaker,
      standard: "IEC 60898 / IEC 60947-2",
      cableSize: acCableSize,
      status: acBreaker ? "pass" : "fail",
      warnings:
        acBreaker && acBreaker > 630
          ? ["Large breaker requires professional installation and coordination"]
          : [],
      errors: acBreaker
        ? []
        : [
            "No suitable breaker found — consider splitting into multiple circuits or using a higher-rated ACB",
          ],
    });

    // ============================================================
    // 2. Battery Circuit Protection
    // ============================================================
    const batteryCurrent =
      inverter.ratedWatts / (inverter.systemVoltage * 0.85);
    const batteryProtected = batteryCurrent * 1.25;
    const batteryBreaker =
      STANDARD_BREAKER_RATINGS.find((r) => r >= batteryProtected) || null;
    const batteryCableSize = batteryBreaker
      ? getCableSizeForBreaker(batteryBreaker)
      : "N/A";

    // Determine battery breaker type
    let batteryBreakerType = "DC MCCB";
    if (batteryBreaker && batteryBreaker > 800) batteryBreakerType = "DC ACB";

    results.push({
      circuit: "Battery DC",
      type: batteryBreakerType,
      requiredCurrent: batteryCurrent,
      protectedCurrent: batteryProtected,
      recommendedBreaker: batteryBreaker,
      standard: "IEC 60947-2",
      cableSize: batteryCableSize,
      status: batteryBreaker ? "pass" : "fail",
      warnings:
        batteryBreaker && batteryBreaker > 400
          ? ["Large DC breaker requires DC-rated equipment and professional installation"]
          : [],
      errors: batteryBreaker
        ? []
        : ["No suitable DC breaker found for battery circuit"],
    });

    // ============================================================
    // 3. PV Circuit Protection
    // ============================================================
    let pvCurrent = 0;
    if (selectedPanel && panelArrangement?.selectedArrangement) {
      pvCurrent =
        selectedPanel.isc *
        panelArrangement.selectedArrangement.parallelStrings;
    }
    const pvProtected = pvCurrent * 1.25;
    const pvBreaker =
      pvCurrent > 0
        ? STANDARD_BREAKER_RATINGS.find((r) => r >= pvProtected) || null
        : null;
    const pvCableSize = pvBreaker
      ? getCableSizeForBreaker(pvBreaker)
      : "N/A";

    results.push({
      circuit: "PV Array",
      type: "DC MCB",
      requiredCurrent: pvCurrent,
      protectedCurrent: pvProtected,
      recommendedBreaker: pvBreaker,
      standard: "IEC 60364-7-712",
      cableSize: pvCableSize,
      status: pvBreaker
        ? "pass"
        : pvCurrent > 0
          ? "fail"
          : "warning",
      warnings:
        pvBreaker && pvBreaker > 63
          ? ["PV breaker should be DC-rated with high breaking capacity"]
          : [],
      errors: pvBreaker
        ? []
        : pvCurrent > 0
          ? ["No suitable PV breaker found"]
          : ["PV current is zero, check panel arrangement"],
    });

    setProtectionResults(results);
    setHasCalculated(true);

    const allWarnings = results.flatMap((r) => r.warnings);
    const allErrors = results.flatMap((r) => r.errors);
    setWarnings(allWarnings);
    setErrors(allErrors);
  };

  // ✅ EXPANDED: Cable size lookup for higher currents
  const getCableSizeForBreaker = (breakerA: number): string => {
    if (breakerA <= 16) return "2.5 mm²";
    if (breakerA <= 25) return "4 mm²";
    if (breakerA <= 40) return "6 mm²";
    if (breakerA <= 63) return "10 mm²";
    if (breakerA <= 100) return "16 mm²";
    if (breakerA <= 125) return "25 mm²";
    if (breakerA <= 160) return "35 mm²";
    if (breakerA <= 200) return "50 mm²";
    if (breakerA <= 250) return "70 mm²";
    if (breakerA <= 315) return "95 mm²";
    if (breakerA <= 400) return "120 mm²";
    if (breakerA <= 500) return "150 mm²";
    if (breakerA <= 630) return "185 mm²";
    if (breakerA <= 800) return "2× 185 mm²";
    if (breakerA <= 1000) return "2× 240 mm²";
    if (breakerA <= 1250) return "3× 240 mm²";
    if (breakerA <= 1600) return "4× 240 mm²";
    if (breakerA <= 2000) return "5× 240 mm²";
    return "Multiple parallel cables — consult engineer";
  };

  const getStatusBadge = (status: "pass" | "warning" | "fail") => {
    switch (status) {
      case "pass":
        return <Badge className="bg-green-500">✅ PASS</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500">⚠️ WARNING</Badge>;
      case "fail":
        return <Badge className="bg-red-500">❌ FAIL</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleContinue = () => {
    if (!hasCalculated) {
      setErrors(["Please calculate protection sizing first."]);
      return;
    }

    const hasFail = protectionResults.some((r) => r.status === "fail");
    if (hasFail) {
      setErrors([
        "Some protection circuits failed. Please fix before continuing.",
      ]);
      return;
    }

    completeStep(12);
    setCurrentStep(13);
  };

  const handleBack = () => {
    setCurrentStep(11);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat("en-NG", {
      maximumFractionDigits: 2,
    }).format(value);
  };

  const hasPrerequisites = inverter !== undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Step 12: Protection Sizing</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Size circuit breakers and fuses for AC, Battery, and PV circuits to
          Nigerian and International standards.
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
                  Complete Step 5 (Inverter Selection) first.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Protection Settings */}
      {hasPrerequisites && (
        <Card>
          <CardHeader>
            <CardTitle>Protection Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {/* MCB Trip Curve */}
              <div>
                <Label className="mb-2 block text-sm font-medium">
                  MCB Trip Curve
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {MCB_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() =>
                        setSelectedMCBType(type.value as "b" | "c" | "d")
                      }
                      className={`rounded-lg border p-3 text-center transition ${
                        selectedMCBType === type.value
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <p className="font-bold uppercase">{type.value}</p>
                      <p className="text-xs text-muted-foreground">
                        {type.label}
                      </p>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  C-Curve recommended for general use in Nigeria
                </p>
              </div>

              {/* AC Phase Selection */}
              <div>
                <Label className="mb-2 block text-sm font-medium">
                  AC Phase
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setAcPhase("single");
                      setAcVoltage(230);
                    }}
                    className={`rounded-lg border p-3 text-center transition ${
                      acPhase === "single"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <p className="font-bold">Single</p>
                    <p className="text-xs text-muted-foreground">230V</p>
                  </button>
                  <button
                    onClick={() => {
                      setAcPhase("three");
                      setAcVoltage(415);
                    }}
                    className={`rounded-lg border p-3 text-center transition ${
                      acPhase === "three"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <p className="font-bold">3-Phase</p>
                    <p className="text-xs text-muted-foreground">415V</p>
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {acPhase === "three"
                    ? "✅ Auto-selected for inverters > 10kVA"
                    : "Standard residential"}
                </p>
              </div>

              {/* System Summary */}
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium mb-2">System Summary</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inverter:</span>
                    <span className="text-xs font-medium">
                      {inverter?.brand} {inverter?.model}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Rated Power:
                    </span>
                    <span>{inverter?.ratedWatts} W</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">DC Voltage:</span>
                    <span>{inverter?.systemVoltage} V</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AC Voltage:</span>
                    <span>
                      {acVoltage} V {acPhase === "three" ? "(3φ)" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculate Button */}
      {hasPrerequisites && (
        <Card>
          <CardHeader>
            <CardTitle>Protection Calculation</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={calculateProtection}
              className="w-full md:w-auto"
            >
              <Shield className="mr-2 h-4 w-4" />
              Calculate Protection Sizing
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {hasCalculated && protectionResults.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {protectionResults.map((result, index) => (
              <Card
                key={index}
                className={
                  result.status === "fail"
                    ? "border-red-500/50"
                    : result.status === "warning"
                      ? "border-yellow-500/50"
                      : "border-green-500/50"
                }
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {result.circuit.includes("AC") && (
                        <Zap className="h-5 w-5 text-yellow-500" />
                      )}
                      {result.circuit.includes("Battery") && (
                        <Battery className="h-5 w-5 text-green-500" />
                      )}
                      {result.circuit.includes("PV") && (
                        <Sun className="h-5 w-5 text-orange-500" />
                      )}
                      <span className="font-semibold text-sm">
                        {result.circuit}
                      </span>
                    </div>
                    {getStatusBadge(result.status)}
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Required Current:
                      </span>
                      <span className="font-medium">
                        {formatNumber(result.requiredCurrent)} A
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Protected Current:
                      </span>
                      <span className="font-medium">
                        {formatNumber(result.protectedCurrent)} A
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Recommended Breaker:
                      </span>
                      <span className="font-bold text-primary">
                        {result.recommendedBreaker
                          ? `${result.recommendedBreaker} A`
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Cable Size:
                      </span>
                      <span className="font-medium">{result.cableSize}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Standard:</span>
                      <span className="font-medium text-xs">
                        {result.standard}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Protection Schedule</span>
                <Badge variant="outline">
                  {protectionResults.filter((r) => r.status === "pass").length}{" "}
                  of {protectionResults.length} Passed
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Circuit</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">
                      Required (A)
                    </TableHead>
                    <TableHead className="text-right">
                      Protected (A)
                    </TableHead>
                    <TableHead className="text-right">
                      Breaker (A)
                    </TableHead>
                    <TableHead>Cable</TableHead>
                    <TableHead>Standard</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {protectionResults.map((result, index) => (
                    <TableRow
                      key={index}
                      className={
                        result.status === "fail"
                          ? "bg-red-50 dark:bg-red-950/20"
                          : result.status === "warning"
                            ? "bg-yellow-50 dark:bg-yellow-950/20"
                            : ""
                      }
                    >
                      <TableCell className="font-medium">
                        {result.circuit}
                      </TableCell>
                      <TableCell>{result.type}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(result.requiredCurrent)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(result.protectedCurrent)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {result.recommendedBreaker
                          ? `${result.recommendedBreaker} A`
                          : "N/A"}
                      </TableCell>
                      <TableCell>{result.cableSize}</TableCell>
                      <TableCell className="text-xs">
                        {result.standard}
                      </TableCell>
                      <TableCell className="text-center">
                        {result.status === "pass" && (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                        )}
                        {result.status === "warning" && (
                          <AlertTriangle className="h-5 w-5 text-yellow-500 mx-auto" />
                        )}
                        {result.status === "fail" && (
                          <AlertTriangle className="h-5 w-5 text-red-500 mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Warnings */}
          {protectionResults.some((r) => r.warnings.length > 0) && (
            <Card className="border-yellow-500/50">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500" />
                  <div>
                    <p className="font-medium">Warnings</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {protectionResults
                        .flatMap((r) => r.warnings)
                        .map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Errors */}
          {protectionResults.some((r) => r.errors.length > 0) && (
            <Card className="border-red-500/50">
              <CardContent className="pt-6">
                <div className="flex gap-3 text-red-600">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-medium">Errors</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {protectionResults
                        .flatMap((r) => r.errors)
                        .map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Nigeria-Specific Note */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium">
                    Nigeria-Specific Protection Requirements
                  </p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>
                      • <strong>AC Breakers:</strong> MCBs (≤125A), MCCBs
                      (125A-800A), ACBs (&gt;800A). 3-phase recommended for
                      industrial systems.
                    </li>
                    <li>
                      • <strong>DC Breakers:</strong> Use DC-rated MCCBs or ACBs
                      for battery circuits. Must handle system DC voltage.
                    </li>
                    <li>
                      • <strong>PV Breakers:</strong> Use DC-rated MCBs with
                      high breaking capacity (≥10kA).
                    </li>
                    <li>
                      • <strong>Surge Protection:</strong> Install Type 2 SPDs
                      on AC and Type 1/2 on DC sides.
                    </li>
                    <li>
                      • <strong>RCDs:</strong> Install 30mA RCDs on AC circuits
                      for personnel protection (IEC 61008).
                    </li>
                    <li>
                      • <strong>Local Availability:</strong> Schneider, ABB,
                      Eaton, Legrand, and local brands available for all sizes.
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Reference */}
          <Card>
            <CardHeader>
              <CardTitle>
                Quick Reference: Nigerian Standard Breakers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    Common AC Breaker Sizes
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {[16, 20, 32, 63, 100, 160, 250, 400, 630, 800, 1250].map(
                      (size) => (
                        <Badge key={size} variant="outline">
                          {size}A
                        </Badge>
                      )
                    )}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    Common DC MCCB/ACB Sizes
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {[63, 100, 200, 400, 630, 800, 1000, 1250].map((size) => (
                      <Badge key={size} variant="outline">
                        {size}A
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    Common PV DC MCB Sizes
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {[16, 20, 32, 40, 50, 63, 80, 100].map((size) => (
                      <Badge key={size} variant="outline">
                        {size}A
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t pt-6">
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Oversizing Analysis
        </Button>
        <Button
          onClick={handleContinue}
          disabled={
            !hasCalculated ||
            protectionResults.some((r) => r.status === "fail")
          }
        >
          Continue to Cable Sizing
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}