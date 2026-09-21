// src/components/steps/Step13CableSizing.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Cable,
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useSolarStore } from "@/store/solarStore";

// ✅ EXPANDED: Cable sizes up to 630mm² (industrial)
const CABLE_SIZES = [
  1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500, 630,
];

// ✅ EXPANDED: Cable ampacities (Copper, PVC insulated, 70°C)
const CABLE_AMPACITIES: Record<number, number> = {
  1.5: 15,
  2.5: 20,
  4: 27,
  6: 34,
  10: 46,
  16: 61,
  25: 80,
  35: 99,
  50: 119,
  70: 151,
  95: 182,
  120: 210,
  150: 240,
  185: 275,
  240: 320,
  300: 360,
  400: 415,
  500: 470,
  630: 530,
};

// ✅ Voltage drop per ampere per meter (V/A/m) — Copper
const VOLTAGE_DROP_PER_A_PER_M: Record<number, number> = {
  1.5: 0.029,
  2.5: 0.018,
  4: 0.011,
  6: 0.0073,
  10: 0.0044,
  16: 0.0028,
  25: 0.00175,
  35: 0.00125,
  50: 0.00087,
  70: 0.00062,
  95: 0.00046,
  120: 0.00036,
  150: 0.00029,
  185: 0.00023,
  240: 0.00018,
  300: 0.000145,
  400: 0.000108,
  500: 0.000087,
  630: 0.000069,
};

// ✅ Standard IEC breaker ratings (matches Step 12)
const STANDARD_BREAKER_RATINGS = [
  6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800,
];

function nextStandardBreaker(requiredA: number): number {
  return STANDARD_BREAKER_RATINGS.find((r) => r >= requiredA) ?? 800;
}

interface CableResult {
  circuit: string;
  currentA: number;
  cableSize: number | null;
  cableCount: number;
  voltageDropPercent: number;
  voltageDropV: number;
  ampacity: number;
  protectionDeviceA: number;
  status: "pass" | "warning" | "fail";
  warnings: string[];
  errors: string[];
}

export default function Step13CableSizing() {
  const {
    design,
    completeStep,
    setCurrentStep,
    setWarnings,
    setErrors,
    // ✅ NEW: cable sizing setter
    setCableSizing,
  } = useSolarStore();

  const [hasCalculated, setHasCalculated] = useState(false);
  const [cableResults, setCableResults] = useState<CableResult[]>([]);
  const [ambientTemp, setAmbientTemp] = useState(40);

  // ✅ Realistic default battery length (2 m, not 5 m)
  const [circuitLengths, setCircuitLengths] = useState({
    ac: 10,
    battery: 2,
    pv: 15,
  });

  // ✅ Auto-detect 3-phase AC
  const inverterKVA = design.selectedInverter?.ratedKVA || 0;
  const [acPhase, setAcPhase] = useState<"single" | "three">(
    inverterKVA > 10 ? "three" : "single"
  );
  const [acVoltage, setAcVoltage] = useState(
    inverterKVA > 10 ? 415 : 230
  );

  const inverter = design.selectedInverter;
  const selectedPanel = design.selectedPanel;
  const panelArrangement = design.panelArrangement;

  // ✅ Auto-switch to 3-phase for industrial inverters
  useEffect(() => {
    if (inverter && inverter.ratedKVA > 10) {
      setAcPhase("three");
      setAcVoltage(415);
    }
  }, [inverter?.ratedKVA]);

  const handleLengthChange = (circuit: string, value: number) => {
    setCircuitLengths((prev) => ({
      ...prev,
      [circuit]: value,
    }));
  };

  const getTempDerating = (temp: number): number => {
    if (temp <= 30) return 1.0;
    if (temp <= 35) return 0.94;
    if (temp <= 40) return 0.87;
    if (temp <= 45) return 0.79;
    if (temp <= 50) return 0.71;
    return 0.61;
  };

  // ✅ Dynamic DC max voltage drop based on system voltage
  // 12V / 24V systems get 5% (physical reality of low-voltage DC)
  // 48V+ systems get 2% (standard industrial)
  const getDcMaxDrop = (): number => {
    if (!inverter) return 2;
    return inverter.systemVoltage <= 24 ? 5 : 2;
  };

  // ============================================================
  // ✅ Cable selection: prefers smallest cable that meets BOTH
  //   ampacity AND voltage drop.
  // ============================================================
  const calculateSingleCable = (
    currentA: number,
    voltageV: number,
    oneWayLengthM: number,
    maxDropPercent: number,
    protectionA: number,
    tempFactor: number,
    circuitName: string,
    isThreePhase: boolean = false
  ): CableResult => {
    const warnings: string[] = [];
    const errors: string[] = [];

    const dropFactor = isThreePhase ? Math.sqrt(3) : 2;
    const totalLength = oneWayLengthM * dropFactor;

    const requiredAmpacity = Math.max(currentA, protectionA);

    let finalCableSize: number | null = null;
    let cableCount = 1;
    let actualDropV = 0;
    let actualDropPercent = 0;
    let actualAmpacity = 0;

    for (const size of CABLE_SIZES) {
      const deratedAmp = (CABLE_AMPACITIES[size] || 0) * tempFactor;
      if (deratedAmp < requiredAmpacity) continue;

      const dropPerM = VOLTAGE_DROP_PER_A_PER_M[size] || 0;
      const dropV = totalLength * currentA * dropPerM;
      const dropPercent = (dropV / voltageV) * 100;

      if (dropPercent <= maxDropPercent) {
        finalCableSize = size;
        cableCount = 1;
        actualDropV = dropV;
        actualDropPercent = dropPercent;
        actualAmpacity = deratedAmp;
        break;
      }

      // Track smallest ampacity-passing cable as fallback
      if (finalCableSize === null) {
        finalCableSize = size;
        actualDropV = dropV;
        actualDropPercent = dropPercent;
        actualAmpacity = deratedAmp;
      }
    }

    // Fallback: parallel cables if no single size works
    if (!finalCableSize) {
      const maxAmp = (CABLE_AMPACITIES[630] || 0) * tempFactor;
      const maxDropPerM = VOLTAGE_DROP_PER_A_PER_M[630] || 0;

      const ampCount = Math.ceil(requiredAmpacity / maxAmp);
      const dropCount = Math.ceil(
        (totalLength * currentA * maxDropPerM) /
          ((voltageV * maxDropPercent) / 100)
      );
      cableCount = Math.max(ampCount, dropCount);

      if (cableCount <= 6) {
        finalCableSize = 630;
        actualDropV = (totalLength * currentA * maxDropPerM) / cableCount;
        actualDropPercent = (actualDropV / voltageV) * 100;
        actualAmpacity = maxAmp * cableCount;
      } else {
        errors.push(
          `Required ampacity ${requiredAmpacity.toFixed(0)}A or voltage drop needs ${cableCount} parallel cables — impractical. Consider busbar system.`
        );
        return {
          circuit: circuitName,
          currentA,
          cableSize: null,
          cableCount: 0,
          voltageDropPercent: 0,
          voltageDropV: 0,
          ampacity: 0,
          protectionDeviceA: protectionA,
          status: "fail",
          warnings,
          errors,
        };
      }
    }

    let status: "pass" | "warning" | "fail" = "pass";

    if (actualDropPercent > maxDropPercent) {
      warnings.push(
        `Voltage drop ${actualDropPercent.toFixed(2)}% exceeds max ${maxDropPercent}%.`
      );
      status = "warning";
    }

    if (actualAmpacity < protectionA) {
      errors.push(
        `Cable ampacity ${actualAmpacity.toFixed(0)}A is below protection ${protectionA}A.`
      );
      status = "fail";
    }

    if (cableCount > 1) {
      warnings.push(
        `Using ${cableCount} parallel × ${finalCableSize} mm² cables.`
      );
    }

    if (ambientTemp > 35) {
      warnings.push(
        `High ambient temperature (${ambientTemp}°C) requires ${((1 - tempFactor) * 100).toFixed(0)}% derating.`
      );
    }

    return {
      circuit: circuitName,
      currentA,
      cableSize: finalCableSize,
      cableCount,
      voltageDropPercent: actualDropPercent || 0,
      voltageDropV: actualDropV || 0,
      ampacity: actualAmpacity || 0,
      protectionDeviceA: protectionA,
      status,
      warnings,
      errors,
    };
  };

  const calculateCableSizing = () => {
    if (!inverter) return;

    const tempFactor = getTempDerating(ambientTemp);
    const dcMaxDrop = getDcMaxDrop();
    const results: CableResult[] = [];

    // 1. AC Circuit
    let acCurrent: number;
    if (acPhase === "three") {
      acCurrent = inverter.ratedWatts / (acVoltage * Math.sqrt(3));
    } else {
      acCurrent = inverter.ratedWatts / acVoltage;
    }

    const acResult = calculateSingleCable(
      acCurrent,
      acVoltage,
      circuitLengths.ac,
      3,
      nextStandardBreaker(acCurrent * 1.25),
      tempFactor,
      `AC Output (${acPhase === "three" ? "3φ" : "1φ"})`,
      acPhase === "three"
    );
    results.push(acResult);

    // 2. Battery Circuit
    const batteryCurrent =
      inverter.ratedWatts / (inverter.systemVoltage * 0.85);
    const batteryResult = calculateSingleCable(
      batteryCurrent,
      inverter.systemVoltage,
      circuitLengths.battery,
      dcMaxDrop,
      nextStandardBreaker(batteryCurrent * 1.25),
      tempFactor,
      "Battery DC",
      false
    );
    results.push(batteryResult);

    // 3. PV Circuit
    let pvCurrent = 0;
    if (selectedPanel && panelArrangement?.selectedArrangement) {
      pvCurrent =
        selectedPanel.isc *
        panelArrangement.selectedArrangement.parallelStrings;
    }
    const pvVoltage = selectedPanel
      ? selectedPanel.voc *
        (panelArrangement?.selectedArrangement?.panelsInSeries || 1)
      : 0;

    let pvResult: CableResult | null = null;
    if (pvCurrent > 0 && pvVoltage > 0) {
      pvResult = calculateSingleCable(
        pvCurrent,
        pvVoltage,
        circuitLengths.pv,
        dcMaxDrop,
        nextStandardBreaker(pvCurrent * 1.25),
        tempFactor,
        "PV Array",
        false
      );
      results.push(pvResult);
    }

    setCableResults(results);
    setHasCalculated(true);

    // ✅ NEW: Push cable sizing to the store for Step 16
    setCableSizing({
      ac: {
        cableSize: acResult.cableSize,
        cableCount: acResult.cableCount,
        lengthM: circuitLengths.ac,
        voltageDropPercent: acResult.voltageDropPercent,
      },
      battery: {
        cableSize: batteryResult.cableSize,
        cableCount: batteryResult.cableCount,
        lengthM: circuitLengths.battery,
        voltageDropPercent: batteryResult.voltageDropPercent,
      },
      pv: pvResult
        ? {
            cableSize: pvResult.cableSize,
            cableCount: pvResult.cableCount,
            lengthM: circuitLengths.pv,
            voltageDropPercent: pvResult.voltageDropPercent,
          }
        : {
            cableSize: null,
            cableCount: 1,
            lengthM: circuitLengths.pv,
            voltageDropPercent: 0,
          },
    });

    const allWarnings = results.flatMap((r) => r.warnings);
    const allErrors = results.flatMap((r) => r.errors);
    setWarnings(allWarnings);
    setErrors(allErrors);
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

  const getRecommendedCable = (result: CableResult): string => {
    if (!result.cableSize) return "N/A";
    if (result.cableCount > 1) {
      return `${result.cableCount}× ${result.cableSize} mm²`;
    }
    return `${result.cableSize} mm²`;
  };

  const handleContinue = () => {
    if (!hasCalculated || cableResults.length === 0) {
      setErrors(["Please calculate cable sizing first."]);
      return;
    }

    const hasFail = cableResults.some((r) => r.status === "fail");
    if (hasFail) {
      setErrors([
        "Some circuits failed. Please fix before continuing.",
      ]);
      return;
    }

    completeStep(13);
    setCurrentStep(14);
  };

  const handleBack = () => {
    setCurrentStep(12);
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
          <Cable className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Step 13: Cable Sizing</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Calculate cable sizes and voltage drop for AC, Battery, and PV
          circuits to Nigerian and International standards.
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

      {/* Installation Conditions */}
      {hasPrerequisites && (
        <Card>
          <CardHeader>
            <CardTitle>Installation Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label
                  htmlFor="ambientTemp"
                  className="mb-2 block text-sm font-medium"
                >
                  Ambient Temperature (°C)
                </Label>
                <Input
                  id="ambientTemp"
                  type="number"
                  min="20"
                  max="60"
                  value={ambientTemp}
                  onChange={(e) =>
                    setAmbientTemp(Number(e.target.value))
                  }
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Nigeria typical: 35-45°C. Derating applied.
                </p>
              </div>
              <div className="rounded-lg border p-3 border-primary/50 bg-primary/5">
                <p className="text-xs text-muted-foreground">
                  AC Phase (auto from Step 12)
                </p>
                <p className="font-semibold">
                  {acPhase === "three"
                    ? "3-Phase (415V)"
                    : "Single-Phase (230V)"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {acPhase === "three"
                    ? `I = P / (V × √3) = ${(
                        inverter!.ratedWatts /
                        (415 * Math.sqrt(3))
                      ).toFixed(0)} A`
                    : `I = P / V = ${(
                        inverter!.ratedWatts / 230
                      ).toFixed(0)} A`}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Cable Type
                </p>
                <p className="font-semibold">Copper (recommended)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Nigeria standard
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label className="mb-2 block text-sm font-medium">
                  AC Cable Length
                </Label>
                <Input
                  type="number"
                  value={circuitLengths.ac}
                  onChange={(e) =>
                    handleLengthChange("ac", Number(e.target.value))
                  }
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  One-way length (meters)
                </p>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-medium">
                  Battery Cable Length
                </Label>
                <Input
                  type="number"
                  value={circuitLengths.battery}
                  onChange={(e) =>
                    handleLengthChange(
                      "battery",
                      Number(e.target.value)
                    )
                  }
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  One-way length (meters)
                </p>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-medium">
                  PV Cable Length
                </Label>
                <Input
                  type="number"
                  value={circuitLengths.pv}
                  onChange={(e) =>
                    handleLengthChange("pv", Number(e.target.value))
                  }
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  One-way length (meters)
                </p>
              </div>
            </div>

            {inverter && inverter.systemVoltage <= 24 && (
              <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-3">
                <div className="flex gap-2 text-sm">
                  <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-700">
                      Low-voltage DC system ({inverter.systemVoltage}V) detected
                    </p>
                    <p className="text-muted-foreground">
                      DC voltage drop limit relaxed to{" "}
                      <strong>{getDcMaxDrop()}%</strong> for 12V/24V circuits
                      (standard practice for low-voltage DC). 48V+ systems use
                      2%.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calculate Button */}
      {hasPrerequisites && (
        <Card>
          <CardHeader>
            <CardTitle>Calculate Cable Sizing</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={calculateCableSizing}
              className="w-full md:w-auto"
            >
              <Cable className="mr-2 h-4 w-4" />
              Calculate All Circuits
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {hasCalculated && cableResults.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {cableResults.map((result, index) => {
              const icon = result.circuit.includes("AC") ? (
                <Zap className="h-5 w-5 text-yellow-500" />
              ) : result.circuit.includes("Battery") ? (
                <Battery className="h-5 w-5 text-green-500" />
              ) : (
                <Sun className="h-5 w-5 text-orange-500" />
              );

              return (
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
                        {icon}
                        <span className="font-semibold text-sm">
                          {result.circuit}
                        </span>
                      </div>
                      {getStatusBadge(result.status)}
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Current:
                        </span>
                        <span className="font-medium">
                          {formatNumber(result.currentA)} A
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Cable Size:
                        </span>
                        <span className="font-bold text-primary">
                          {getRecommendedCable(result)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Voltage Drop:
                        </span>
                        <span
                          className={
                            result.voltageDropPercent > 3
                              ? "text-red-500 font-bold"
                              : "text-green-500 font-bold"
                          }
                        >
                          {formatNumber(result.voltageDropPercent)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Ampacity:
                        </span>
                        <span className="font-medium">
                          {formatNumber(result.ampacity)} A
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Cable Schedule</span>
                <Badge variant="outline">
                  {cableResults.filter((r) => r.status === "pass").length}{" "}
                  of {cableResults.length} Passed
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Circuit</TableHead>
                    <TableHead className="text-right">
                      Current (A)
                    </TableHead>
                    <TableHead className="text-right">Cable</TableHead>
                    <TableHead className="text-right">
                      Drop (%)
                    </TableHead>
                    <TableHead className="text-right">
                      Ampacity (A)
                    </TableHead>
                    <TableHead className="text-right">
                      Protection (A)
                    </TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cableResults.map((result, index) => (
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
                      <TableCell className="text-right">
                        {formatNumber(result.currentA)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {getRecommendedCable(result)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${
                          result.voltageDropPercent > 3
                            ? "text-red-500"
                            : "text-green-500"
                        }`}
                      >
                        {formatNumber(result.voltageDropPercent)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(result.ampacity)}
                      </TableCell>
                      <TableCell className="text-right">
                        {result.protectionDeviceA}
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
          {cableResults.some((r) => r.warnings.length > 0) && (
            <Card className="border-yellow-500/50">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500" />
                  <div>
                    <p className="font-medium">Warnings</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {cableResults
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
          {cableResults.some((r) => r.errors.length > 0) && (
            <Card className="border-red-500/50">
              <CardContent className="pt-6">
                <div className="flex gap-3 text-red-600">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-medium">Errors</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {cableResults
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
                <div className="space-y-1 text-sm">
                  <p className="font-medium">
                    Nigeria-Specific Cable Recommendations
                  </p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>
                      • <strong>AC Cable:</strong> Copper, PVC insulated,
                      UV protected if exposed.
                    </li>
                    <li>
                      • <strong>Battery Cable:</strong> Double-insulated,
                      use lugs and heat shrink.
                    </li>
                    <li>
                      • <strong>PV Cable:</strong> Solar-rated (UV-resistant),
                      MC4 connectors.
                    </li>
                    <li>
                      • <strong>Temperature:</strong> 35-45°C requires 15-20%
                      derating.
                    </li>
                    <li>
                      • <strong>Parallel Cables:</strong> Use same
                      length/type for even current sharing.
                    </li>
                    <li>
                      • <strong>Local Availability:</strong> Nexans,
                      Prysmian, and local brands.
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
                Quick Reference: Cable Sizing Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    AC Circuit (230V/415V)
                  </p>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>≤63A:</span>
                      <span className="font-medium">10mm²</span>
                    </div>
                    <div className="flex justify-between">
                      <span>≤160A:</span>
                      <span className="font-medium">35mm²</span>
                    </div>
                    <div className="flex justify-between">
                      <span>≤400A:</span>
                      <span className="font-medium">120mm²</span>
                    </div>
                    <div className="flex justify-between">
                      <span>≤630A:</span>
                      <span className="font-medium">185mm²</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    Battery DC (48V-384V)
                  </p>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>≤200A:</span>
                      <span className="font-medium">50mm²</span>
                    </div>
                    <div className="flex justify-between">
                      <span>≤400A:</span>
                      <span className="font-medium">120mm²</span>
                    </div>
                    <div className="flex justify-between">
                      <span>≤630A:</span>
                      <span className="font-medium">185mm²</span>
                    </div>
                    <div className="flex justify-between">
                      <span>&gt;630A:</span>
                      <span className="font-medium">Parallel</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    PV Array (DC)
                  </p>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>≤40A:</span>
                      <span className="font-medium">10mm²</span>
                    </div>
                    <div className="flex justify-between">
                      <span>≤200A:</span>
                      <span className="font-medium">50mm²</span>
                    </div>
                    <div className="flex justify-between">
                      <span>≤400A:</span>
                      <span className="font-medium">120mm²</span>
                    </div>
                    <div className="flex justify-between">
                      <span>≤630A:</span>
                      <span className="font-medium">185mm²</span>
                    </div>
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
          Back to Protection Sizing
        </Button>
        <Button
          onClick={handleContinue}
          disabled={
            !hasCalculated ||
            cableResults.some((r) => r.status === "fail")
          }
        >
          Continue to System Validation
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}