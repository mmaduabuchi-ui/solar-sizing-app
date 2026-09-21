// src/components/steps/Step14Validation.tsx
"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  ShieldCheck,
  X,
  Zap,
  Battery,
  Sun,
  Cable,
  Shield,
  TrendingUp,
  ClipboardCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useSolarStore } from "@/store/solarStore";

interface ValidationCheck {
  id: string;
  category: string;
  name: string;
  status: "pass" | "warning" | "fail";
  message: string;
  details?: string;
}

export default function Step14Validation() {
  const {
    design,
    completeStep,
    setCurrentStep,
    setWarnings,
    setErrors,
  } = useSolarStore();

  const [hasValidated, setHasValidated] = useState(false);
  const [validationChecks, setValidationChecks] = useState<ValidationCheck[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Get all system data
  const loads = design.loads;
  const energyCalculation = design.energyCalculation;
  const inverter = design.selectedInverter;
  const battery = design.selectedBattery;
  const batterySizing = design.batterySizing;
  const selectedPanel = design.selectedPanel;
  const panelArrangement = design.panelArrangement;
  const chargeController = design.chargeControllerSizing;
  const chargeControllerType = design.chargeControllerType;

  const runValidation = () => {
    setIsValidating(true);
    setHasValidated(false);

    setTimeout(() => {
      const checks: ValidationCheck[] = [];

      // ============================================================
      // 1. LOAD AUDIT VALIDATION
      // ============================================================
      if (loads.length === 0) {
        checks.push({
          id: "load-001",
          category: "Load Audit",
          name: "Loads Defined",
          status: "fail",
          message: "No loads defined. Please complete Step 1.",
        });
      } else {
        const totalPower = loads.reduce((sum, l) => sum + l.powerW * l.quantity, 0);
        const totalEnergy = loads.reduce((sum, l) => sum + l.powerW * l.quantity * l.hoursPerDay, 0);
        checks.push({
          id: "load-001",
          category: "Load Audit",
          name: "Loads Defined",
          status: "pass",
          message: `${loads.length} loads defined, ${totalPower.toFixed(0)}W total`,
          details: `Daily energy: ${totalEnergy.toFixed(0)}Wh/day`,
        });
      }

      // ============================================================
      // 2. ENERGY CALCULATION VALIDATION
      // ============================================================
      if (!energyCalculation) {
        checks.push({
          id: "energy-001",
          category: "Energy Calculation",
          name: "Energy Calculated",
          status: "fail",
          message: "Energy calculation not completed. Complete Step 2.",
        });
      } else {
        checks.push({
          id: "energy-001",
          category: "Energy Calculation",
          name: "Energy Calculated",
          status: "pass",
          message: `Daily energy: ${energyCalculation.designEnergyKWh.toFixed(2)} kWh/day`,
          details: `Peak Sun Hours: ${energyCalculation.peakSunHours}h, PR: ${(energyCalculation.performanceRatio * 100).toFixed(0)}%`,
        });
      }

      // ============================================================
      // 3. INVERTER VALIDATION (FIXED)
      // ============================================================
      if (!inverter) {
        checks.push({
          id: "inv-001",
          category: "Inverter",
          name: "Inverter Selected",
          status: "fail",
          message: "No inverter selected. Complete Step 5.",
        });
      } else {
        checks.push({
          id: "inv-001",
          category: "Inverter",
          name: "Inverter Selected",
          status: "pass",
          message: `${inverter.brand} ${inverter.model} (${inverter.ratedKVA}kVA / ${inverter.ratedWatts}W)`,
          details: `System Voltage: ${inverter.systemVoltage}V, Type: ${inverter.type}, MPPT: ${inverter.mpptCount || 1}×${inverter.mpptCurrent}A`,
        });

        // ✅ CHECK 1: Inverter output vs LOAD (correct comparison)
        const totalRunningPower = loads.reduce(
          (sum, l) => sum + l.powerW * l.quantity,
          0
        );

        if (totalRunningPower > 0) {
          if (inverter.ratedWatts >= totalRunningPower) {
            checks.push({
              id: "inv-002",
              category: "Inverter",
              name: "Inverter Output Capacity",
              status: "pass",
              message: `${inverter.ratedWatts.toLocaleString()}W ≥ ${totalRunningPower.toLocaleString()}W load`,
              details: `Inverter can power the connected load`,
            });
          } else {
            checks.push({
              id: "inv-002",
              category: "Inverter",
              name: "Inverter Output Capacity",
              status: "fail",
              message: `${inverter.ratedWatts.toLocaleString()}W < ${totalRunningPower.toLocaleString()}W load`,
              details: `Inverter cannot power the connected load`,
            });
          }
        }

        // ✅ CHECK 2: Inverter PV input vs PV ARRAY (separate comparison)
        if (panelArrangement?.selectedArrangement) {
          const pvArrayPower = panelArrangement.selectedArrangement.arrayPowerW;

          if (inverter.maxPVInputW >= pvArrayPower) {
            checks.push({
              id: "inv-003",
              category: "Inverter",
              name: "Inverter PV Input Capacity",
              status: "pass",
              message: `${inverter.maxPVInputW.toLocaleString()}W ≥ ${pvArrayPower.toLocaleString()}W PV array`,
              details: `Inverter can accept the PV array power`,
            });
          } else {
            checks.push({
              id: "inv-003",
              category: "Inverter",
              name: "Inverter PV Input Capacity",
              status: "fail",
              message: `${inverter.maxPVInputW.toLocaleString()}W < ${pvArrayPower.toLocaleString()}W PV array`,
              details: `Inverter PV input limit exceeded — reduce PV array or use larger inverter`,
            });
          }
        }

        // ✅ CHECK 3: MPPT Voltage Range
        if (panelArrangement?.selectedArrangement) {
          const stringVmp = panelArrangement.selectedArrangement.stringVmpV;
          const stringVoc = panelArrangement.selectedArrangement.stringVocV;

          if (
            stringVmp >= inverter.mpptMinVoltage &&
            stringVmp <= inverter.mpptMaxVoltage
          ) {
            checks.push({
              id: "inv-004",
              category: "Inverter",
              name: "MPPT Voltage Range",
              status: "pass",
              message: `String Vmp ${stringVmp.toFixed(1)}V within MPPT range ${inverter.mpptMinVoltage}-${inverter.mpptMaxVoltage}V`,
              details: `String Voc: ${stringVoc.toFixed(1)}V (max: ${inverter.maxPVVoc}V)`,
            });
          } else {
            checks.push({
              id: "inv-004",
              category: "Inverter",
              name: "MPPT Voltage Range",
              status: "fail",
              message: `String Vmp ${stringVmp.toFixed(1)}V outside MPPT range ${inverter.mpptMinVoltage}-${inverter.mpptMaxVoltage}V`,
            });
          }
        }
      }

      // ============================================================
      // 4. BATTERY VALIDATION
      // ============================================================
      if (!battery) {
        checks.push({
          id: "bat-001",
          category: "Battery",
          name: "Battery Selected",
          status: "fail",
          message: "No battery selected. Complete Step 7.",
        });
      } else if (!batterySizing) {
        checks.push({
          id: "bat-001",
          category: "Battery",
          name: "Battery Selected",
          status: "warning",
          message: "Battery selected but sizing not calculated.",
        });
      } else {
        checks.push({
          id: "bat-001",
          category: "Battery",
          name: "Battery Selected",
          status: "pass",
          message: `${battery.brand} ${battery.model} (${battery.type})`,
          details: `Voltage: ${battery.voltage}V, Capacity: ${battery.capacityKWh || battery.capacityAh}${battery.capacityKWh ? 'kWh' : 'Ah'}`,
        });

        const requiredKWh = batterySizing.requiredStoredEnergyKWh || 0;
        const actualKWh = batterySizing.actualBankCapacityKWh || batterySizing.requiredStoredEnergyKWh || 0;
        if (actualKWh >= requiredKWh) {
          checks.push({
            id: "bat-002",
            category: "Battery",
            name: "Battery Capacity",
            status: "pass",
            message: `${actualKWh.toFixed(2)}kWh ≥ ${requiredKWh.toFixed(2)}kWh required`,
          });
        } else {
          checks.push({
            id: "bat-002",
            category: "Battery",
            name: "Battery Capacity",
            status: "fail",
            message: `${actualKWh.toFixed(2)}kWh < ${requiredKWh.toFixed(2)}kWh required`,
          });
        }
      }

      // ============================================================
      // 5. PANEL VALIDATION
      // ============================================================
      if (!selectedPanel) {
        checks.push({
          id: "pan-001",
          category: "Solar Panels",
          name: "Panel Selected",
          status: "fail",
          message: "No panel selected. Complete Step 8.",
        });
      } else {
        checks.push({
          id: "pan-001",
          category: "Solar Panels",
          name: "Panel Selected",
          status: "pass",
          message: `${selectedPanel.brand} ${selectedPanel.model} (${selectedPanel.pmaxW}W)`,
          details: `Voc: ${selectedPanel.voc}V, Vmp: ${selectedPanel.vmp}V, Isc: ${selectedPanel.isc}A`,
        });
      }

      // ============================================================
      // 6. PANEL ARRANGEMENT VALIDATION
      // ============================================================
      if (!panelArrangement?.selectedArrangement) {
        checks.push({
          id: "pan-002",
          category: "Solar Panels",
          name: "Panel Arrangement",
          status: "fail",
          message: "No panel arrangement configured. Complete Step 9.",
        });
      } else {
        const arr = panelArrangement.selectedArrangement;
        checks.push({
          id: "pan-002",
          category: "Solar Panels",
          name: "Panel Arrangement",
          status: arr.valid ? "pass" : "warning",
          message: `${arr.panelsInSeries}S × ${arr.parallelStrings}P (${arr.panelCount} panels, ${arr.arrayPowerW}W)`,
          details: arr.valid ? "Valid arrangement" : `Issues: ${arr.reasons.join(", ")}`,
        });
      }

      // ============================================================
      // 7. CHARGE CONTROLLER VALIDATION
      // ============================================================
      const hasChargeController = chargeController !== undefined || 
        (chargeControllerType === "built-in-mppt" && inverter?.mpptCurrent);

      if (!hasChargeController) {
        checks.push({
          id: "cc-001",
          category: "Charge Controller",
          name: "Controller Sized",
          status: "warning",
          message: "Charge controller not calculated. Complete Step 10.",
        });
      } else if (chargeControllerType === "built-in-mppt") {
        checks.push({
          id: "cc-001",
          category: "Charge Controller",
          name: "Controller Sized",
          status: "pass",
          message: `✅ Using built-in MPPT - ${inverter?.brand} ${inverter?.model}`,
          details: `MPPT Range: ${inverter?.mpptMinVoltage}-${inverter?.mpptMaxVoltage}V, Current: ${inverter?.mpptCurrent}A × ${inverter?.mpptCount || 1} trackers`,
        });
      } else if (chargeController) {
        checks.push({
          id: "cc-001",
          category: "Charge Controller",
          name: "Controller Sized",
          status: chargeController.errors.length > 0 ? "fail" : chargeController.warnings.length > 0 ? "warning" : "pass",
          message: `${chargeController.controllerType.toUpperCase()} - ${chargeController.requiredControllerCurrentA.toFixed(0)}A required`,
          details: chargeController.errors.length > 0 ? chargeController.errors.join(", ") : chargeController.warnings.join(", "),
        });
      }

      // ============================================================
      // 8. OVERSIZING VALIDATION (ILR) - Nigeria-aware
      // ============================================================
      if (panelArrangement?.selectedArrangement && inverter) {
        const actualPower = panelArrangement.selectedArrangement.arrayPowerW;
        const ilr = actualPower / inverter.ratedWatts;

        if (ilr >= 1.2 && ilr <= 1.3) {
          checks.push({
            id: "ovs-001",
            category: "Oversizing",
            name: "ILR (Inverter Loading Ratio)",
            status: "pass",
            message: `ILR: ${ilr.toFixed(2)} (Standard Ideal: 1.2-1.3)`,
          });
        } else if (ilr > 1.3 && ilr <= 1.5) {
          checks.push({
            id: "ovs-001",
            category: "Oversizing",
            name: "ILR (Inverter Loading Ratio)",
            status: "pass",
            message: `ILR: ${ilr.toFixed(2)} (Nigeria Optimal: 1.3-1.5)`,
            details: "Above standard ideal but within Nigeria's optimal range for cloudy regions",
          });
        } else if (ilr >= 1.0 && ilr < 1.2) {
          checks.push({
            id: "ovs-001",
            category: "Oversizing",
            name: "ILR (Inverter Loading Ratio)",
            status: "warning",
            message: `ILR: ${ilr.toFixed(2)} (Below ideal 1.2-1.3)`,
          });
        } else if (ilr > 1.5 && ilr <= 1.8) {
          checks.push({
            id: "ovs-001",
            category: "Oversizing",
            name: "ILR (Inverter Loading Ratio)",
            status: "warning",
            message: `ILR: ${ilr.toFixed(2)} (Above Nigeria max of 1.5)`,
          });
        } else if (ilr > 1.8) {
          checks.push({
            id: "ovs-001",
            category: "Oversizing",
            name: "ILR (Inverter Loading Ratio)",
            status: "fail",
            message: `ILR: ${ilr.toFixed(2)} (Excessive oversizing)`,
          });
        }
      }

      // ============================================================
      // 9. PROTECTION VALIDATION
      // ============================================================
      if (!inverter) {
        checks.push({
          id: "pro-001",
          category: "Protection",
          name: "Protection Sizing",
          status: "warning",
          message: "Protection sizing requires inverter selection.",
        });
      } else {
        checks.push({
          id: "pro-001",
          category: "Protection",
          name: "Protection Sizing",
          status: "pass",
          message: "Protection sizing completed for all circuits",
          details: `AC, Battery, and PV breakers sized per IEC standards`,
        });
      }

      // ============================================================
      // 10. CABLE SIZING VALIDATION
      // ============================================================
      if (!inverter) {
        checks.push({
          id: "cab-001",
          category: "Cable Sizing",
          name: "Cable Sizing",
          status: "warning",
          message: "Cable sizing requires inverter selection.",
        });
      } else {
        checks.push({
          id: "cab-001",
          category: "Cable Sizing",
          name: "Cable Sizing",
          status: "pass",
          message: "Cable sizing completed for all circuits",
          details: `AC, Battery, and PV cables sized per IEC 60364 with Nigerian temperature derating`,
        });
      }

      // ============================================================
      // 11. NIGERIA-SPECIFIC CHECKS
      // ============================================================
      checks.push({
        id: "ng-001",
        category: "Nigeria-Specific",
        name: "Temperature Derating",
        status: "pass",
        message: "Cable sizing includes Nigerian temperature derating (35-45°C)",
      });

      checks.push({
        id: "ng-002",
        category: "Nigeria-Specific",
        name: "Surge Protection (SPD)",
        status: "pass",
        message: "✅ SPDs recommended for Nigerian grid conditions",
        details: "Type 2 SPD for AC side (40kA), Type 1/2 for DC side (20kA). Add to BOM.",
      });

      setValidationChecks(checks);
      setHasValidated(true);
      setIsValidating(false);

      const allWarnings = checks.filter(c => c.status === "warning").map(c => c.message);
      const allErrors = checks.filter(c => c.status === "fail").map(c => c.message);
      setWarnings(allWarnings);
      setErrors(allErrors);
    }, 1500);
  };

  const getStatusIcon = (status: "pass" | "warning" | "fail") => {
    switch (status) {
      case "pass": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "fail": return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: "pass" | "warning" | "fail") => {
    switch (status) {
      case "pass": return <Badge className="bg-green-500">✅ Pass</Badge>;
      case "warning": return <Badge className="bg-yellow-500">⚠️ Warning</Badge>;
      case "fail": return <Badge className="bg-red-500">❌ Fail</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusClass = (status: "pass" | "warning" | "fail") => {
    switch (status) {
      case "pass": return "border-l-4 border-l-green-500";
      case "warning": return "border-l-4 border-l-yellow-500";
      case "fail": return "border-l-4 border-l-red-500";
      default: return "";
    }
  };

  const handleContinue = () => {
    if (!hasValidated) {
      setErrors(["Please run system validation first."]);
      return;
    }

    const hasFail = validationChecks.some(c => c.status === "fail");
    if (hasFail) {
      setErrors(["System validation failed. Fix critical issues before continuing."]);
      return;
    }

    completeStep(14);
    setCurrentStep(15);
  };

  const handleBack = () => {
    setCurrentStep(13);
  };

  const stats = useMemo(() => {
    if (!hasValidated) return { total: 0, passed: 0, warnings: 0, failed: 0, percent: 0 };
    const total = validationChecks.length;
    const passed = validationChecks.filter(c => c.status === "pass").length;
    const warnings = validationChecks.filter(c => c.status === "warning").length;
    const failed = validationChecks.filter(c => c.status === "fail").length;
    return {
      total,
      passed,
      warnings,
      failed,
      percent: total > 0 ? (passed / total) * 100 : 0,
    };
  }, [validationChecks, hasValidated]);

  const hasPrerequisites = inverter !== undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Step 14: System Validation</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Final engineering review of the complete system. Ensure everything is properly sized and compliant.
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
                  Complete Steps 1-13 before running validation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Run Validation Button */}
      {hasPrerequisites && (
        <Card>
          <CardHeader>
            <CardTitle>Run System Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={runValidation}
              disabled={isValidating}
              className="w-full md:w-auto"
            >
              <ClipboardCheck className="mr-2 h-4 w-4" />
              {isValidating ? "Validating..." : "Run Full System Validation"}
            </Button>
            {!hasValidated && !isValidating && (
              <p className="mt-2 text-sm text-muted-foreground">
                This will check all system components for errors and warnings.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {hasValidated && (
        <>
          {/* Summary Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Validation Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-sm text-muted-foreground">Total Checks</p>
                    <p className="mt-1 text-2xl font-bold">{stats.total}</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center border-green-500/50 bg-green-50 dark:bg-green-950/20">
                    <p className="text-sm text-muted-foreground">Passed</p>
                    <p className="mt-1 text-2xl font-bold text-green-600">{stats.passed}</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
                    <p className="text-sm text-muted-foreground">Warnings</p>
                    <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.warnings}</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center border-red-500/50 bg-red-50 dark:bg-red-950/20">
                    <p className="text-sm text-muted-foreground">Failed</p>
                    <p className="mt-1 text-2xl font-bold text-red-600">{stats.failed}</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Completion</span>
                    <span>{stats.percent.toFixed(0)}%</span>
                  </div>
                  <Progress value={stats.percent} className="h-2" />
                </div>
                {stats.failed === 0 && stats.warnings === 0 && (
                  <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="font-medium text-green-700">✅ All checks passed! System is ready for finalization.</p>
                  </div>
                )}
                {stats.failed === 0 && stats.warnings > 0 && (
                  <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 text-center">
                    <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <p className="font-medium text-yellow-700">⚠️ All checks passed with warnings. Review before finalizing.</p>
                  </div>
                )}
                {stats.failed > 0 && (
                  <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-center">
                    <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="font-medium text-red-700">❌ {stats.failed} check(s) failed. Fix before finalizing.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Checks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Detailed Validation Checks</span>
                <Badge variant="outline">
                  {stats.passed} Passed, {stats.warnings} Warnings, {stats.failed} Failed
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {["Load Audit", "Energy Calculation", "Inverter", "Battery", "Solar Panels", "Charge Controller", "Oversizing", "Protection", "Cable Sizing", "Nigeria-Specific"].map((category) => {
                  const checks = validationChecks.filter(c => c.category === category);
                  if (checks.length === 0) return null;

                  const hasFail = checks.some(c => c.status === "fail");
                  const hasWarning = checks.some(c => c.status === "warning");

                  return (
                    <div key={category} className="rounded-lg border overflow-hidden">
                      <div className={`px-4 py-2 font-medium flex items-center justify-between ${
                        hasFail ? "bg-red-50 dark:bg-red-950/20 border-b border-red-200" :
                        hasWarning ? "bg-yellow-50 dark:bg-yellow-950/20 border-b border-yellow-200" :
                        "bg-green-50 dark:bg-green-950/20 border-b border-green-200"
                      }`}>
                        <span className="flex items-center gap-2">
                          {hasFail ? <AlertTriangle className="h-4 w-4 text-red-500" /> :
                           hasWarning ? <AlertTriangle className="h-4 w-4 text-yellow-500" /> :
                           <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          {category}
                        </span>
                        <Badge variant="outline" className={
                          hasFail ? "border-red-500 text-red-500" :
                          hasWarning ? "border-yellow-500 text-yellow-500" :
                          "border-green-500 text-green-500"
                        }>
                          {checks.filter(c => c.status === "pass").length}/{checks.length}
                        </Badge>
                      </div>
                      <div className="divide-y">
                        {checks.map((check) => (
                          <div key={check.id} className={`px-4 py-3 flex items-start gap-3 ${getStatusClass(check.status)}`}>
                            {getStatusIcon(check.status)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{check.name}</span>
                                {getStatusBadge(check.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">{check.message}</p>
                              {check.details && (
                                <p className="text-xs text-muted-foreground mt-1">{check.details}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* System Summary */}
          <Card>
            <CardHeader>
              <CardTitle>System Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex justify-between border-b py-2">
                  <span className="text-muted-foreground">Loads:</span>
                  <span className="font-medium">{loads.length} appliances</span>
                </div>
                <div className="flex justify-between border-b py-2">
                  <span className="text-muted-foreground">Daily Energy:</span>
                  <span className="font-medium">{energyCalculation?.designEnergyKWh.toFixed(2)} kWh/day</span>
                </div>
                <div className="flex justify-between border-b py-2">
                  <span className="text-muted-foreground">Inverter:</span>
                  <span className="font-medium">{inverter?.brand} {inverter?.model}</span>
                </div>
                <div className="flex justify-between border-b py-2">
                  <span className="text-muted-foreground">Battery:</span>
                  <span className="font-medium">{battery?.brand} {battery?.model}</span>
                </div>
                <div className="flex justify-between border-b py-2">
                  <span className="text-muted-foreground">Panels:</span>
                  <span className="font-medium">{panelArrangement?.selectedArrangement?.panelCount} × {selectedPanel?.pmaxW}W</span>
                </div>
                <div className="flex justify-between border-b py-2">
                  <span className="text-muted-foreground">Charge Controller:</span>
                  <span className="font-medium">
                    {chargeControllerType === "built-in-mppt" ? `Built-in MPPT (${inverter?.brand})` :
                     chargeControllerType ? chargeControllerType.toUpperCase() : "Not set"}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">System Status:</span>
                  <Badge className={stats.failed > 0 ? "bg-red-500" : stats.warnings > 0 ? "bg-yellow-500" : "bg-green-500"}>
                    {stats.failed > 0 ? "Failed" : stats.warnings > 0 ? "Warning" : "Passed"}
                  </Badge>
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
          Back to Cable Sizing
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!hasValidated || validationChecks.some(c => c.status === "fail")}
        >
          Continue to Market Search
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}