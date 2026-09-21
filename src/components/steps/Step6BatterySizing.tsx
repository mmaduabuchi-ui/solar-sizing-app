"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Battery,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  ShieldCheck,
  Zap,
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
import { calculateBatterySizing } from "@/lib/calculations/battery";

const DEFAULT_AUTONOMY_DAYS = 1;
const DEFAULT_BATTERY_DOD = 0.8;
const DEFAULT_BATTERY_EFFICIENCY = 0.8;

function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function ValidationItem({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "pass" | "warning" | "fail";
}) {
  const Icon =
    status === "pass"
      ? CheckCircle2
      : AlertCircle;

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <Icon
        className={
          status === "pass"
            ? "mt-0.5 h-5 w-5 text-green-600"
            : status === "warning"
              ? "mt-0.5 h-5 w-5 text-amber-600"
              : "mt-0.5 h-5 w-5 text-red-600"
        }
      />

      <div className="min-w-0">
        <p className="text-sm font-medium">
          {label}
        </p>

        <p className="text-sm text-muted-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function Step6BatterySizing() {
  const {
    design,
    setBatteryType,
    setAutonomyDays,
    setBatteryDoD,
    setBatteryEfficiency,
    setBatterySizing,
    completeStep,
    setCurrentStep,
  } = useSolarStore();

  const [calculationError, setCalculationError] =
    useState<string>("");

  const selectedBatteryType =
    design.batteryType ?? "lithium";

  const autonomyDays =
    Number.isFinite(design.autonomyDays) &&
    design.autonomyDays > 0
      ? design.autonomyDays
      : DEFAULT_AUTONOMY_DAYS;

  const batteryDoD =
    Number.isFinite(design.batteryDoD) &&
    design.batteryDoD > 0 &&
    design.batteryDoD <= 1
      ? design.batteryDoD
      : DEFAULT_BATTERY_DOD;

  const batteryEfficiency =
    Number.isFinite(design.batteryEfficiency) &&
    design.batteryEfficiency > 0 &&
    design.batteryEfficiency <= 1
      ? design.batteryEfficiency
      : DEFAULT_BATTERY_EFFICIENCY;

  // ✅ Get system voltage from inverter OR design (fallback)
  const systemVoltage = useMemo(() => {
    return design.selectedInverter?.systemVoltage 
      ?? design.systemVoltage 
      ?? 48;
  }, [design.selectedInverter, design.systemVoltage]);

  // ✅ Determine voltage source for display
  const voltageSource = useMemo(() => {
    if (design.selectedInverter?.systemVoltage) {
      return `From inverter: ${design.selectedInverter.brand} ${design.selectedInverter.model}`;
    }
    if (design.systemVoltage) {
      return "From Step 3: System Voltage Selection";
    }
    return "Default (48V)";
  }, [design.selectedInverter, design.systemVoltage]);

  const calculation = useMemo(() => {
    if (!design.energyCalculation) {
      return null;
    }

    // ✅ Use effective system voltage (inverter OR selected)
    if (!design.selectedInverter && !design.systemVoltage) {
      return null;
    }

    try {
      return calculateBatterySizing({
        energyCalculation: design.energyCalculation,
        batteryType: selectedBatteryType,
        systemVoltage: systemVoltage,  // ✅ Use effective voltage
        autonomyDays,
        batteryDoD,
        batteryEfficiency,
      });
    } catch {
      return null;
    }
  }, [
    design.energyCalculation,
    design.selectedInverter,
    design.systemVoltage,
    systemVoltage,
    selectedBatteryType,
    autonomyDays,
    batteryDoD,
    batteryEfficiency,
  ]);

  const handleCalculate = () => {
    setCalculationError("");

    if (!design.energyCalculation) {
      setCalculationError(
        "Energy calculation is required. Complete Step 2 before sizing the battery."
      );
      return;
    }

    // ✅ Allow calculation with either inverter OR selected system voltage
    if (!design.selectedInverter && !design.systemVoltage) {
      setCalculationError(
        "A selected inverter or system voltage is required. Complete Step 3 or Step 5 first."
      );
      return;
    }

    try {
      const result = calculateBatterySizing({
        energyCalculation: design.energyCalculation,
        batteryType: selectedBatteryType,
        systemVoltage: systemVoltage,  // ✅ Use effective voltage
        autonomyDays,
        batteryDoD,
        batteryEfficiency,
      });

      setBatterySizing(result);
      setCalculationError("");
    } catch (error) {
      setCalculationError(
        error instanceof Error
          ? error.message
          : "Battery sizing failed."
      );
    }
  };

  const handleContinue = () => {
    if (!calculation) {
      setCalculationError(
        "Calculate the battery requirement before continuing."
      );
      return;
    }

    setBatterySizing(calculation);
    completeStep(6);
    setCurrentStep(7);
  };

  const handleBack = () => {
    setCurrentStep(5);
  };

  // ✅ Prerequisites: Either inverter OR system voltage must be set
  const hasPrerequisites =
    Boolean(design.energyCalculation) &&
    (Boolean(design.selectedInverter) || Boolean(design.systemVoltage));

  const storedCalculation =
    design.batterySizing;

  const isCalculated =
    Boolean(storedCalculation);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Battery className="h-6 w-6 text-primary" />
          </div>

          <div>
            <h2 className="text-2xl font-bold">
              Step 6: Battery Sizing
            </h2>

            <p className="text-sm text-muted-foreground">
              Determine the required battery-bank capacity from the
              calculated energy demand and system voltage.
            </p>
          </div>
        </div>
      </div>

      {!hasPrerequisites && (
        <Card className="border-amber-500/50">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />

            <div>
              <p className="font-medium">
                Previous steps are incomplete
              </p>

              <p className="text-sm text-muted-foreground">
                Complete the Energy Calculation in Step 2 and
                select a valid inverter in Step 5 (or set system voltage in Step 3)
                before continuing.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Battery Design Parameters</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Battery Type
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  setBatteryType("lithium")
                }
                className={`rounded-lg border p-4 text-left transition ${
                  selectedBatteryType === "lithium"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Battery className="h-5 w-5" />

                  <div>
                    <p className="font-semibold">
                      Lithium
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Capacity specified in kWh
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setBatteryType("tubular")
                }
                className={`rounded-lg border p-4 text-left transition ${
                  selectedBatteryType === "tubular"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Battery className="h-5 w-5" />

                  <div>
                    <p className="font-semibold">
                      Tubular
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Capacity specified in Ah
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="autonomyDays"
                className="mb-2 block text-sm font-medium"
              >
                Autonomy Days
              </label>

              <input
                id="autonomyDays"
                type="number"
                min="0.1"
                step="0.1"
                value={autonomyDays}
                onChange={(event) =>
                  setAutonomyDays(
                    Number(event.target.value)
                  )
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />

              <p className="mt-1 text-xs text-muted-foreground">
                Required backup duration without adequate solar input.
              </p>
            </div>

            <div>
              <label
                htmlFor="batteryDoD"
                className="mb-2 block text-sm font-medium"
              >
                Depth of Discharge
              </label>

              <div className="relative">
                <input
                  id="batteryDoD"
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={batteryDoD * 100}
                  onChange={(event) =>
                    setBatteryDoD(
                      Number(event.target.value) / 100
                    )
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm"
                />

                <span className="absolute right-3 top-2 text-sm text-muted-foreground">
                  %
                </span>
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Usable fraction of nominal battery capacity.
              </p>
            </div>

            <div>
              <label
                htmlFor="batteryEfficiency"
                className="mb-2 block text-sm font-medium"
              >
                Battery Efficiency
              </label>

              <div className="relative">
                <input
                  id="batteryEfficiency"
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={batteryEfficiency * 100}
                  onChange={(event) =>
                    setBatteryEfficiency(
                      Number(event.target.value) / 100
                    )
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm"
                />

                <span className="absolute right-3 top-2 text-sm text-muted-foreground">
                  %
                </span>
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Battery charge/discharge efficiency used in the design.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Design Inputs from Previous Steps</span>
            <Badge variant="outline" className="border-primary/50 bg-primary/5">
              System Voltage: {systemVoltage}V DC
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-3">
          <ValidationItem
            label="Design Energy"
            value={
              design.energyCalculation
                ? `${formatNumber(
                    design.energyCalculation.designEnergyKWh
                  )} kWh/day`
                : "Not available"
            }
            status={
              design.energyCalculation
                ? "pass"
                : "fail"
            }
          />

          <ValidationItem
            label="System Voltage"
            value={
              systemVoltage > 0
                ? `${formatNumber(systemVoltage, 0)} V DC — ${voltageSource}`
                : "Not available"
            }
            status={
              systemVoltage > 0
                ? "pass"
                : "fail"
            }
          />

          <ValidationItem
            label="Inverter"
            value={
              design.selectedInverter
                ? `${design.selectedInverter.brand} ${design.selectedInverter.model}`
                : "Not selected (using Step 3 voltage)"
            }
            status={
              design.selectedInverter
                ? "pass"
                : "warning"
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Battery Requirement</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Daily Design Energy
              </p>

              <p className="mt-1 text-2xl font-bold">
                {design.energyCalculation
                  ? `${formatNumber(
                      design.energyCalculation.designEnergyKWh
                    )} kWh`
                  : "—"}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Required Stored Energy
              </p>

              <p className="mt-1 text-2xl font-bold">
                {calculation
                  ? `${formatNumber(
                      calculation.requiredStoredEnergyKWh
                    )} kWh`
                  : "—"}
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 text-primary" />

              <div>
                <p className="font-medium">
                  Engineering calculation
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Required stored energy accounts for the selected
                  autonomy, battery depth of discharge, and battery
                  efficiency.
                </p>
              </div>
            </div>
          </div>

          {calculation && (
            <div className="grid gap-4 md:grid-cols-2">
              {selectedBatteryType === "tubular" ? (
                <div className="rounded-lg border-2 border-primary/20 p-5">
                  <p className="text-sm text-muted-foreground">
                    Required Battery Capacity
                  </p>

                  <p className="mt-1 text-3xl font-bold">
                    {formatNumber(
                      calculation.requiredCapacityAh ?? 0
                    )}{" "}
                    Ah
                  </p>

                  <p className="mt-2 text-xs text-muted-foreground">
                    At {formatNumber(systemVoltage, 0)} V DC nominal
                    system voltage.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border-2 border-primary/20 p-5">
                  <p className="text-sm text-muted-foreground">
                    Required Battery Capacity
                  </p>

                  <p className="mt-1 text-3xl font-bold">
                    {formatNumber(
                      calculation.requiredCapacityKWh ?? 0
                    )}{" "}
                    kWh
                  </p>

                  <p className="mt-2 text-xs text-muted-foreground">
                    Nominal battery-bank energy requirement.
                  </p>
                </div>
              )}

              <div className="rounded-lg border p-5">
                <p className="text-sm text-muted-foreground">
                  Battery Bank Voltage
                </p>

                <p className="mt-1 text-3xl font-bold">
                  {formatNumber(systemVoltage, 0)} V
                </p>

                <p className="mt-2 text-xs text-muted-foreground">
                  {voltageSource}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {calculationError && (
        <Card className="border-red-500/50">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />

            <div>
              <p className="font-medium text-red-700">
                Battery sizing error
              </p>

              <p className="text-sm text-muted-foreground">
                {calculationError}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isCalculated && storedCalculation && (
        <Card className="border-green-500/50">
          <CardContent className="flex items-start gap-3 pt-6">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-green-600" />

            <div>
              <p className="font-medium">
                Battery sizing calculated successfully
              </p>

              <p className="text-sm text-muted-foreground">
                The calculated battery requirement has been saved and
                will be used by Step 7 for commercial battery selection.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Design Methodology</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 text-sm">
          <div className="flex items-start gap-3">
            <Zap className="mt-0.5 h-5 w-5 text-primary" />

            <p>
              The battery bank is sized from the calculated daily
              design energy multiplied by the required autonomy.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />

            <p>
              Depth of discharge and battery efficiency are applied so
              that the nominal battery bank is large enough to provide
              the required usable energy.
            </p>
          </div>

          <div className="rounded-lg bg-muted/30 p-4">
            <p className="font-medium">
              Commercial battery selection
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Step 6 establishes the engineering requirement only.
              The actual battery brand, model, voltage, and capacity
              will be selected and validated in Step 7.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Step 5
        </Button>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCalculate}
            disabled={!hasPrerequisites}
          >
            <Battery className="mr-2 h-4 w-4" />
            Calculate Battery Size
          </Button>

          <Button
            type="button"
            onClick={handleContinue}
            disabled={!calculation}
          >
            Continue to Step 7
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}