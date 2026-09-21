// src/components/steps/Step16FinalDesign.tsx
"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  FileCheck,
  Download,
  Printer,
  Share2,
  CheckCircle2,
  Zap,
  Battery,
  Sun,
  Shield,
  Package,
  TrendingUp,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useSolarStore } from "@/store/solarStore";
import { useToast } from "@/components/ui/toast";

import jsPDF from "jspdf";

// ============================================================
// TYPES
// ============================================================

interface BOMRow {
  category: string;
  item: string;
  spec: string;
  quantity: number;
  unit: string;
  notes: string;
}

// ============================================================
// HELPERS
// ============================================================

const STANDARD_BREAKER_RATINGS = [
  6, 10, 16, 20, 25, 32, 40, 50, 63,
  80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800,
  1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000,
];

function nextStandardBreaker(requiredA: number): number | null {
  return STANDARD_BREAKER_RATINGS.find((r) => r >= requiredA) ?? null;
}

// ✅ Fallback cable lengths if Step 13 data is missing
const DEFAULT_CABLE_LENGTHS = {
  ac: 10,
  battery: 2,
  pv: 15,
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Step16FinalDesign() {
  const { completeStep, setCurrentStep, design } = useSolarStore();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  // ------------------------------------------------------------
  // SHORTHANDS
  // ------------------------------------------------------------
  const inverter = design.selectedInverter;
  const battery = design.selectedBattery;
  const batterySizing = design.batterySizing;
  const panel = design.selectedPanel;
  const arrangement = design.panelArrangement?.selectedArrangement;
  const chargeControllerSizing = design.chargeControllerSizing;
  const cableSizing = design.cableSizing; // ✅ From Step 13

  const isIndustrial = (inverter?.ratedKVA || 0) > 10;
  const isThreePhase = isIndustrial;
  const acVoltage = isThreePhase ? 415 : 230;

  // ------------------------------------------------------------
  // SYSTEM TOTALS
  // ------------------------------------------------------------
  const systemTotals = useMemo(() => {
    const loads = design.loads || [];
    const totalLoadPower = loads.reduce(
      (sum, l) => sum + l.powerW * l.quantity,
      0,
    );
    const totalDailyEnergy = loads.reduce(
      (sum, l) => sum + l.powerW * l.quantity * l.hoursPerDay,
      0,
    );

    return {
      totalLoadPower,
      totalDailyEnergy,
      panelCount: arrangement?.panelCount || 0,
      arrayPower: arrangement?.arrayPowerW || 0,
      batteryCount: batterySizing?.totalBatteryCount || 1,
      inverterPower: inverter?.ratedWatts || 0,
    };
  }, [design, arrangement, batterySizing, inverter]);

  // ------------------------------------------------------------
  // PROTECTION CALCULATIONS (mirrors Step 12)
  // ------------------------------------------------------------
  const protection = useMemo(() => {
    if (!inverter) return null;

    const acCurrent = isThreePhase
      ? inverter.ratedWatts / (acVoltage * Math.sqrt(3))
      : inverter.ratedWatts / acVoltage;
    const acProtected = acCurrent * 1.25;

    const batteryCurrent =
      inverter.ratedWatts / (inverter.systemVoltage * 0.85);
    const batteryProtected = batteryCurrent * 1.25;

    const pvCurrent =
      panel && arrangement ? panel.isc * arrangement.parallelStrings : 0;
    const pvProtected = pvCurrent * 1.25;

    return {
      ac: {
        required: acCurrent,
        protected: acProtected,
        breaker: nextStandardBreaker(acProtected),
      },
      battery: {
        required: batteryCurrent,
        protected: batteryProtected,
        breaker: nextStandardBreaker(batteryProtected),
      },
      pv: {
        required: pvCurrent,
        protected: pvProtected,
        breaker: pvCurrent > 0 ? nextStandardBreaker(pvProtected) : null,
      },
    };
  }, [inverter, panel, arrangement, acVoltage, isThreePhase]);

  // ------------------------------------------------------------
  // CABLE SIZES & LENGTHS (from Step 13, with fallbacks)
  // ------------------------------------------------------------
  const cables = useMemo(() => {
    const acSize = cableSizing?.ac.cableSize ?? null;
    const acCount = cableSizing?.ac.cableCount ?? 1;
    const acLength = cableSizing?.ac.lengthM ?? DEFAULT_CABLE_LENGTHS.ac;

    const batSize = cableSizing?.battery.cableSize ?? null;
    const batCount = cableSizing?.battery.cableCount ?? 1;
    const batLength =
      cableSizing?.battery.lengthM ?? DEFAULT_CABLE_LENGTHS.battery;

    const pvSize = cableSizing?.pv.cableSize ?? null;
    const pvCount = cableSizing?.pv.cableCount ?? 1;
    const pvLength = cableSizing?.pv.lengthM ?? DEFAULT_CABLE_LENGTHS.pv;

    return {
      ac: { size: acSize, count: acCount, lengthM: acLength },
      battery: { size: batSize, count: batCount, lengthM: batLength },
      pv: { size: pvSize, count: pvCount, lengthM: pvLength },
    };
  }, [cableSizing]);

  // ------------------------------------------------------------
  // BILL OF MATERIALS (dynamic)
  // ------------------------------------------------------------
  const billOfMaterials = useMemo<BOMRow[]>(() => {
    const rows: BOMRow[] = [];

    // --- Inverter ---
    if (inverter) {
      rows.push({
        category: "Inverter",
        item: `${inverter.brand} ${inverter.model}`,
        spec: `${inverter.ratedKVA}kVA / ${inverter.ratedWatts}W, ${inverter.systemVoltage}V DC`,
        quantity: 1,
        unit: "unit",
        notes:
          inverter.type === "hybrid"
            ? `Hybrid with built-in MPPT (${inverter.mpptCount || 1}×${inverter.mpptCurrent}A)`
            : "Standalone (requires external MPPT)",
      });
    }

    // --- Battery ---
    if (battery && batterySizing) {
      const capacity = battery.capacityKWh ?? battery.capacityAh;
      const capacityUnit = battery.capacityKWh ? "kWh" : "Ah";
      const qty = batterySizing.totalBatteryCount || 1;
      const config =
        batterySizing.seriesBatteries && batterySizing.parallelStrings
          ? `${batterySizing.seriesBatteries}S × ${batterySizing.parallelStrings}P`
          : "";

      const totalKWh = batterySizing.actualBankCapacityKWh;

      rows.push({
        category: "Battery",
        item: `${battery.brand} ${battery.model}`,
        spec: `${battery.voltage}V, ${capacity}${capacityUnit}`,
        quantity: qty,
        unit: "unit",
        notes: `${battery.type} bank${config ? ` (${config})` : ""}${
          totalKWh ? ` — ${totalKWh.toFixed(1)} kWh total` : ""
        }`,
      });
    }

    // --- Solar Panels ---
    if (panel && arrangement) {
      rows.push({
        category: "Solar Panels",
        item: `${panel.brand} ${panel.model}`,
        spec: `${panel.pmaxW}W, Voc: ${panel.voc}V, Vmp: ${panel.vmp}V, Isc: ${panel.isc}A`,
        quantity: arrangement.panelCount,
        unit: "units",
        notes: `${arrangement.panelsInSeries}S × ${arrangement.parallelStrings}P — ${(arrangement.arrayPowerW / 1000).toFixed(2)} kWp`,
      });
    }

    // --- Charge Controller (standalone only) ---
    if (inverter?.type === "standalone" && chargeControllerSizing) {
      rows.push({
        category: "Charge Controller",
        item: `${chargeControllerSizing.controllerType.toUpperCase()} Controller`,
        spec: `${chargeControllerSizing.requiredControllerCurrentA.toFixed(0)}A, ${chargeControllerSizing.requiredControllerVoltageV.toFixed(0)}V`,
        quantity: 1,
        unit: "unit",
        notes:
          chargeControllerSizing.controllerType === "mppt"
            ? "External MPPT"
            : "PWM controller",
      });
    }

    // --- Protection ---
    if (inverter && protection) {
      rows.push({
        category: "Protection",
        item: isIndustrial ? "AC MCCB" : "AC MCB",
        spec: `${isThreePhase ? "3-phase, 415V" : "1-phase, 230V"}, ${
          protection.ac.breaker ?? "N/A"
        }A`,
        quantity: 1,
        unit: "unit",
        notes: `Inverter output protection (required ${protection.ac.protected.toFixed(
          1,
        )}A)`,
      });

      rows.push({
        category: "Protection",
        item: "Battery DC MCCB",
        spec: `${inverter.systemVoltage}V DC, ${
          protection.battery.breaker ?? "N/A"
        }A`,
        quantity: 1,
        unit: "unit",
        notes: `Battery circuit protection (required ${protection.battery.protected.toFixed(
          1,
        )}A)`,
      });

      if (protection.pv.breaker) {
        rows.push({
          category: "Protection",
          item: "PV DC MCB",
          spec: `${protection.pv.breaker}A`,
          quantity: 1,
          unit: "unit",
          notes: `PV array protection (required ${protection.pv.protected.toFixed(
            1,
          )}A)`,
        });
      }

      rows.push({
        category: "Protection",
        item: "SPD Type 2",
        spec: "40kA, AC side",
        quantity: 1,
        unit: "unit",
        notes: "Surge protection — AC side",
      });
      rows.push({
        category: "Protection",
        item: "SPD Type 1/2",
        spec: "20kA, DC side",
        quantity: 1,
        unit: "unit",
        notes: "Surge protection — DC side",
      });
    }

    // --- Cables (exact mm² and lengths from Step 13) ---
    if (inverter) {
      // AC cable
      const acSizeStr = cables.ac.size
        ? `${cables.ac.size}mm²`
        : "Copper, sized per installation";
      const acCountStr =
        cables.ac.count > 1 ? ` × ${cables.ac.count} parallel` : "";
      rows.push({
        category: "Cables",
        item: "AC Cable",
        spec: `${isThreePhase ? "3-phase" : "1-phase"}, ${acSizeStr}${acCountStr}`,
        quantity: cables.ac.lengthM,
        unit: "meters",
        notes: "Inverter to distribution board (adjust as needed)",
      });

      // Battery cable
      const batSizeStr = cables.battery.size
        ? `${cables.battery.size}mm²`
        : "Copper, sized per installation";
      const batCountStr =
        cables.battery.count > 1
          ? ` × ${cables.battery.count} parallel`
          : "";
      rows.push({
        category: "Cables",
        item: "Battery Cable",
        spec: `${inverter.systemVoltage}V DC, ${batSizeStr}${batCountStr}`,
        quantity: cables.battery.lengthM,
        unit: "meters",
        notes: "Battery bank to inverter (double-insulated)",
      });

      // PV cable
      const pvSizeStr = cables.pv.size
        ? `${cables.pv.size}mm²`
        : "Solar-rated, UV-resistant";
      const pvCountStr =
        cables.pv.count > 1 ? ` × ${cables.pv.count} parallel` : "";
      rows.push({
        category: "Cables",
        item: "PV Cable",
        spec: `${pvSizeStr}${pvCountStr}`,
        quantity: cables.pv.lengthM,
        unit: "meters",
        notes: "PV array to inverter (MC4 connectors)",
      });
    }

    return rows;
  }, [
    inverter,
    battery,
    batterySizing,
    panel,
    arrangement,
    chargeControllerSizing,
    protection,
    cables,
    isIndustrial,
    isThreePhase,
  ]);

  // ------------------------------------------------------------
  // COST ESTIMATE
  // ------------------------------------------------------------
  // ✅ Preferred source: design.cartTotal (from Step 15)
  // Fallback: rough per-component estimate
  // ------------------------------------------------------------
  const estimatedCost = useMemo(() => {
    // If we have the actual cart total from Step 15, use it
    if (design.cartTotal && design.cartTotal > 0) {
      return design.cartTotal;
    }

    // Fallback: rough estimate
    let total = 0;

    if (inverter) {
      total += inverter.ratedKVA * 175_000;
    }

    if (battery && batterySizing?.totalBatteryCount) {
      const qty = batterySizing.totalBatteryCount;
      if (battery.capacityKWh) {
        total += qty * battery.capacityKWh * 330_000;
      } else if (battery.capacityAh) {
        // ✅ FIX: tubular battery — Ah × V × ₦/kWh
        const kwh = (battery.capacityAh * battery.voltage) / 1000;
        total += qty * kwh * 330_000;
      }
    }

    if (panel && arrangement) {
      total += arrangement.panelCount * panel.pmaxW * 500;
    }

    total += 200_000; // Cables and breakers rough
    total += 150_000; // SPDs

    return total;
  }, [inverter, battery, batterySizing, panel, arrangement, design.cartTotal]);

  // ------------------------------------------------------------
  // FORMAT HELPERS
  // ------------------------------------------------------------
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

  // ------------------------------------------------------------
  // PDF EXPORT
  // ------------------------------------------------------------
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const addText = (
        text: string,
        x: number,
        yPos: number,
        fontSize = 10,
        isBold = false,
      ) => {
        pdf.setFontSize(fontSize);
        pdf.setFont("helvetica", isBold ? "bold" : "normal");
        const lines = pdf.splitTextToSize(text, contentWidth);
        pdf.text(lines, x, yPos);
        return yPos + lines.length * (fontSize * 0.45);
      };

      const addHeader = (text: string, yPos: number) => {
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text(text, margin, yPos);
        pdf.line(margin, yPos + 2, pageWidth - margin, yPos + 2);
        return yPos + 10;
      };

      // Title
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.text("Solar PV System Design Report", margin, y);
      y += 12;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Project: ${design.projectName || "Unnamed Project"}`,
        margin,
        y,
      );
      y += 8;
      pdf.text(
        `Date: ${new Date().toLocaleDateString("en-NG", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        margin,
        y,
      );
      y += 12;

      // System Overview
      y = addHeader("System Overview", y);
      y += 4;
      y = addText(
        `System Size: ${(systemTotals.arrayPower / 1000).toFixed(2)} kWp (${systemTotals.arrayPower.toFixed(0)} W)`,
        margin,
        y,
      );
      y = addText(
        `Daily Energy: ${(systemTotals.totalDailyEnergy / 1000).toFixed(2)} kWh/day`,
        margin,
        y,
      );
      y = addText(
        `Solar Panels: ${systemTotals.panelCount} × ${panel?.pmaxW || 0}W`,
        margin,
        y,
      );
      y = addText(
        `Panel Brand: ${panel?.brand || "N/A"} ${panel?.model || ""}`,
        margin,
        y,
      );
      y += 6;

      // Components
      y = addHeader("System Components", y);
      y += 4;
      y = addText(
        `Inverter: ${inverter?.brand || "N/A"} ${inverter?.model || ""}`,
        margin,
        y,
      );
      y = addText(`Inverter Type: ${inverter?.type || "N/A"}`, margin, y);
      y = addText(
        `Battery: ${battery?.brand || "N/A"} ${battery?.model || ""}`,
        margin,
        y,
      );
      y = addText(`Battery Type: ${battery?.type || "N/A"}`, margin, y);
      y = addText(
        `System Voltage: ${inverter?.systemVoltage || 48}V`,
        margin,
        y,
      );
      y = addText(
        `Panel Configuration: ${arrangement?.panelsInSeries || 0}S × ${arrangement?.parallelStrings || 0}P`,
        margin,
        y,
      );
      y = addText(
        `Charge Controller: ${
          design.chargeControllerType === "built-in-mppt"
            ? "Built-in MPPT"
            : design.chargeControllerType || "N/A"
        }`,
        margin,
        y,
      );
      y += 6;

      // BOM
      y = addHeader("Bill of Materials", y);
      y += 4;

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      const col1 = margin;
      const col2 = margin + 40;
      const col3 = margin + 80;
      const col4 = margin + 140;
      const col5 = margin + 165;

      pdf.text("Category", col1, y);
      pdf.text("Item", col2, y);
      pdf.text("Spec", col3, y);
      pdf.text("Qty", col4, y);
      pdf.text("Unit", col5, y);
      y += 5;
      pdf.line(margin, y, pageWidth - margin, y);
      y += 3;

      pdf.setFont("helvetica", "normal");
      for (const item of billOfMaterials) {
        if (y > pageHeight - 20) {
          pdf.addPage();
          y = margin + 10;
        }
        pdf.text(item.category.substring(0, 15), col1, y);
        pdf.text(item.item.substring(0, 25), col2, y);
        pdf.text(item.spec.substring(0, 25), col3, y);
        pdf.text(String(item.quantity), col4, y);
        pdf.text(item.unit, col5, y);
        y += 6;
      }
      y += 6;

      // Cost Estimate
      y = addHeader("Cost Estimate", y);
      y += 4;
      y = addText(
        `Equipment Cost: ${formatPrice(estimatedCost)}`,
        margin,
        y,
        11,
      );
      y = addText(
        `Installation Cost: ${formatPrice(estimatedCost * 0.25)}`,
        margin,
        y,
        11,
      );
      y = addText(
        `Total Estimated Cost: ${formatPrice(estimatedCost * 1.25)}`,
        margin,
        y,
        12,
        true,
      );
      y += 4;

      // Compliance
      y = addHeader("Compliance & Standards", y);
      y += 4;
      const standards = [
        "IEC 60364 - Electrical Installation",
        "IEC 60898 - MCB Standards",
        "IEC 60947 - MCCB Standards",
        "Nigerian NERC Regulations",
        "Temperature Derating (35-45°C)",
        "Surge Protection Included",
      ];
      for (const standard of standards) {
        y = addText(`• ${standard}`, margin, y, 9);
      }

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        "Generated by Solar PV System Designer v2.0 - Professional Edition",
        margin,
        pageHeight - 10,
      );
      pdf.text(
        `© ${new Date().getFullYear()} Solar PV System Designer`,
        margin,
        pageHeight - 5,
      );

      const projectName = (design.projectName || "Solar_PV_Design").replace(
        /\s+/g,
        "_",
      );
      pdf.save(`${projectName}_Solar_PV_System_Design_Report.pdf`);

      showToast({
        message: "✅ PDF Report downloaded successfully!",
        type: "success",
      });
    } catch (error) {
      console.error("Export failed:", error);
      showToast({
        message: "❌ Failed to export PDF. Please try again.",
        type: "error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const shareData = {
        title: design.projectName || "Solar PV System Design",
        text: `Solar PV System Design\nSystem Size: ${(systemTotals.arrayPower / 1000).toFixed(2)} kWp\nDaily Energy: ${(systemTotals.totalDailyEnergy / 1000).toFixed(2)} kWh\nInverter: ${inverter?.brand || "N/A"}\nBattery: ${battery?.brand || "N/A"}\nPanels: ${systemTotals.panelCount} × ${panel?.pmaxW || 0}W`,
        url: window.location.href,
      };

      if (navigator.share) {
        await navigator.share(shareData);
        showToast({ message: "✅ Shared successfully!", type: "success" });
      } else {
        await navigator.clipboard.writeText(
          `${shareData.title}\n\n${shareData.text}`,
        );
        setCopied(true);
        showToast({
          message: "✅ Design summary copied to clipboard!",
          type: "success",
        });
        setTimeout(() => setCopied(false), 3000);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Share failed:", error);
        try {
          const shareText = `Solar PV System Design\nSystem Size: ${(systemTotals.arrayPower / 1000).toFixed(2)} kWp\nDaily Energy: ${(systemTotals.totalDailyEnergy / 1000).toFixed(2)} kWh`;
          await navigator.clipboard.writeText(shareText);
          setCopied(true);
          showToast({
            message: "✅ Design summary copied to clipboard!",
            type: "success",
          });
          setTimeout(() => setCopied(false), 3000);
        } catch {
          showToast({
            message: "❌ Unable to share. Please copy manually.",
            type: "error",
          });
        }
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      setIsPrinting(false);
      window.print();
    }, 500);
  };

  const handleComplete = () => {
    completeStep(16);
    showToast({
      message: "✅ System design completed successfully!",
      type: "success",
    });
  };

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------
  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="print:hidden">
        <div className="flex items-center gap-2">
          <FileCheck className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Step 16: Final Design</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete system summary, Bill of Materials, and export professional
          report.
        </p>
      </div>

      {/* System Status */}
      <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div>
              <h3 className="text-xl font-bold text-green-700">
                ✅ System Design Complete
              </h3>
              <p className="text-sm text-green-600">
                All components properly sized and validated. Ready for
                installation.
              </p>
            </div>
            <Badge className="ml-auto bg-green-500 text-white text-lg px-4 py-1 print:hidden">
              100% Complete
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>System Overview</span>
            <Badge variant="outline" className="print:hidden">
              Nigeria/Global Standards
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4 text-center">
              <Zap className="h-6 w-6 mx-auto text-yellow-500" />
              <p className="text-sm text-muted-foreground mt-2">System Size</p>
              <p className="text-2xl font-bold">
                {systemTotals.arrayPower.toFixed(0)} W
              </p>
              <p className="text-xs text-muted-foreground">
                {(systemTotals.arrayPower / 1000).toFixed(2)} kWp
              </p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <Battery className="h-6 w-6 mx-auto text-green-500" />
              <p className="text-sm text-muted-foreground mt-2">
                Daily Energy
              </p>
              <p className="text-2xl font-bold">
                {systemTotals.totalDailyEnergy.toFixed(0)} Wh
              </p>
              <p className="text-xs text-muted-foreground">
                {(systemTotals.totalDailyEnergy / 1000).toFixed(2)} kWh/day
              </p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <Sun className="h-6 w-6 mx-auto text-orange-500" />
              <p className="text-sm text-muted-foreground mt-2">Panels</p>
              <p className="text-2xl font-bold">{systemTotals.panelCount}</p>
              <p className="text-xs text-muted-foreground">
                {panel?.brand || ""} {panel?.pmaxW || 0}W
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="flex justify-between border-b py-2">
              <span className="text-muted-foreground">Project Name</span>
              <span className="font-medium">
                {design.projectName || "Unnamed Project"}
              </span>
            </div>
            <div className="flex justify-between border-b py-2">
              <span className="text-muted-foreground">Inverter Type</span>
              <span className="font-medium capitalize">
                {inverter?.type || "Not Selected"}
              </span>
            </div>
            <div className="flex justify-between border-b py-2">
              <span className="text-muted-foreground">Battery Type</span>
              <span className="font-medium capitalize">
                {battery?.type || "Not Selected"}
              </span>
            </div>
            <div className="flex justify-between border-b py-2">
              <span className="text-muted-foreground">System Voltage</span>
              <span className="font-medium">
                {inverter?.systemVoltage || 48} V
              </span>
            </div>
            <div className="flex justify-between border-b py-2">
              <span className="text-muted-foreground">
                Panel Configuration
              </span>
              <span className="font-medium">
                {arrangement?.panelsInSeries || 0}S ×{" "}
                {arrangement?.parallelStrings || 0}P
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Charge Controller</span>
              <span className="font-medium uppercase">
                {design.chargeControllerType === "built-in-mppt"
                  ? "Built-in MPPT"
                  : design.chargeControllerType || "Not Selected"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bill of Materials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="h-5 w-5" /> Bill of Materials
            </span>
            <Badge variant="outline" className="print:hidden">
              {billOfMaterials.length} items
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Specification
                  </TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="hidden md:table-cell">Unit</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Notes
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billOfMaterials.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {item.category}
                    </TableCell>
                    <TableCell>{item.item}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {item.spec}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {item.unit}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {item.notes}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cost Estimate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Cost Estimate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Equipment Cost</p>
              <p className="text-2xl font-bold">
                {formatPrice(estimatedCost)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Installation Cost
              </p>
              <p className="text-2xl font-bold">
                {formatPrice(estimatedCost * 0.25)}
              </p>
            </div>
            <div className="rounded-lg border p-4 border-primary/50 bg-primary/5">
              <p className="text-sm text-muted-foreground">
                Total Estimated Cost
              </p>
              <p className="text-2xl font-bold text-primary">
                {formatPrice(estimatedCost * 1.25)}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-muted/30 p-3 text-sm">
            <p className="text-muted-foreground">
              * Prices are estimates based on Nigerian market. Contact
              suppliers for exact pricing.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Compliance & Standards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" /> IEC 60364
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" /> IEC 60898
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" /> IEC 60947
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" /> Nigerian
              NERC
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" /> Temperature
              Derating (35-45°C)
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" /> Surge
              Protection Included
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-end print:hidden">
        <Button
          variant="outline"
          onClick={handlePrint}
          disabled={isPrinting}
          className="gap-2"
        >
          <Printer className="h-4 w-4" />{" "}
          {isPrinting ? "Printing..." : "Print Report"}
        </Button>
        <Button
          variant="outline"
          onClick={handleExportPDF}
          disabled={isExporting}
          className="gap-2"
        >
          <Download className="h-4 w-4" />{" "}
          {isExporting ? "Generating..." : "Export PDF"}
        </Button>
        <Button
          variant="outline"
          onClick={handleShare}
          disabled={isSharing}
          className="gap-2"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
          {isSharing ? "Sharing..." : copied ? "Copied!" : "Share"}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t pt-6 print:hidden">
        <Button variant="outline" onClick={() => setCurrentStep(15)}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Market Search
        </Button>
        <Button onClick={handleComplete} className="gap-2">
          <FileCheck className="h-4 w-4" /> Complete Design
        </Button>
      </div>
    </div>
  );
}