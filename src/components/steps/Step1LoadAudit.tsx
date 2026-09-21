import { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
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

import { useSolarStore } from "@/store/solarStore";

import {
  calculateLoadAudit,
  type LoadAuditResult,
} from "@/lib/calculations/loadAudit";

import type { LoadItem } from "@/types/solar";

interface Step1LoadAuditProps {
  onNext?: () => void;
}

function createLoad(): LoadItem {
  return {
    id: crypto.randomUUID(),
    appliance: "",
    powerW: 0,
    quantity: 1,
    hoursPerDay: 0,
    surgeW: undefined,
    critical: false,
  };
}

export default function Step1LoadAudit({
  onNext,
}: Step1LoadAuditProps) {
  const {
    design,
    setProjectName,
    setLoads,
    completeStep,
    setCurrentStep,
    setWarnings,
    setErrors,
  } = useSolarStore();

  const [auditError, setAuditError] = useState("");
  const [hasAudited, setHasAudited] = useState(false);

  const loads: LoadItem[] = design.loads;

  const auditResult = useMemo<LoadAuditResult | null>(() => {
    if (loads.length === 0) {
      return null;
    }

    try {
      return calculateLoadAudit(loads);
    } catch {
      return null;
    }
  }, [loads]);

  const formatNumber = (value: number): string =>
    new Intl.NumberFormat("en-NG", {
      maximumFractionDigits: 2,
    }).format(value);

  const updateLoad = (
    id: string,
    updates: Partial<LoadItem>,
  ): void => {
    const updatedLoads: LoadItem[] = loads.map(
      (load: LoadItem): LoadItem =>
        load.id === id
          ? {
              ...load,
              ...updates,
            }
          : load,
    );

    setLoads(updatedLoads);
    setHasAudited(false);
    setAuditError("");
    setErrors([]);
    setWarnings([]);
  };

  const addLoad = (): void => {
    setLoads([...loads, createLoad()]);
    setHasAudited(false);
    setAuditError("");
    setErrors([]);
    setWarnings([]);
  };

  const removeLoad = (id: string): void => {
    const updatedLoads =
      loads.length === 1
        ? []
        : loads.filter(
            (load: LoadItem): boolean =>
              load.id !== id,
          );

    setLoads(updatedLoads);
    setHasAudited(false);
    setAuditError("");
    setErrors([]);
    setWarnings([]);
  };

  const runAudit = (): void => {
    setAuditError("");
    setErrors([]);
    setWarnings([]);

    try {
      const result = calculateLoadAudit(loads);

      setHasAudited(true);

      console.log("Load Audit Result:", result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to calculate load audit.";

      setAuditError(message);
      setHasAudited(false);
      setErrors([message]);
    }
  };

  const handleContinue = (): void => {
    setAuditError("");

    if (!hasAudited) {
      const message =
        "Please calculate the load audit before continuing.";

      setAuditError(message);
      setErrors([message]);

      return;
    }

    if (!auditResult) {
      const message =
        "The load audit is not valid. Please correct the appliance data.";

      setAuditError(message);
      setErrors([message]);
      setHasAudited(false);

      return;
    }

    try {
      const result = calculateLoadAudit(loads);

      setErrors([]);
      setWarnings([]);

      completeStep(1);
      setCurrentStep(2);

      onNext?.();

      console.log("Step 1 completed:", result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Please correct the load audit before continuing.";

      setAuditError(message);
      setErrors([message]);
      setHasAudited(false);
    }
  };

  const canContinue =
    hasAudited &&
    loads.length > 0 &&
    auditResult !== null &&
    auditResult.loads.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Step 1: Load Audit
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Enter all appliances and electrical loads that
          the solar system will supply.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="projectName">
              Project Name
            </Label>

            <Input
              id="projectName"
              placeholder="e.g. 3 Bedroom Residential Solar System"
              value={design.projectName}
              onChange={(event) => {
                setProjectName(event.target.value);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Appliance Load List</CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              Enter the normal operating power, quantity,
              daily operating hours and starting surge where
              known.
            </p>
          </div>

          <Button
            type="button"
            onClick={addLoad}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Appliance
          </Button>
        </CardHeader>

        <CardContent>
          {loads.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">
                No appliances added yet.
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Add at least one appliance to begin the
                load audit.
              </p>

              <Button
                type="button"
                className="mt-4"
                onClick={addLoad}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add First Appliance
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {loads.map(
                (
                  load: LoadItem,
                  index: number,
                ) => (
                  <div
                    key={load.id}
                    className="rounded-lg border p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-semibold">
                        Appliance {index + 1}
                      </h3>

                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          removeLoad(load.id)
                        }
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-2">
                        <Label
                          htmlFor={`appliance-${load.id}`}
                        >
                          Appliance
                        </Label>

                        <Input
                          id={`appliance-${load.id}`}
                          placeholder="e.g. Refrigerator"
                          value={load.appliance}
                          onChange={(event) =>
                            updateLoad(load.id, {
                              appliance:
                                event.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor={`power-${load.id}`}
                        >
                          Power (W)
                        </Label>

                        <Input
                          id={`power-${load.id}`}
                          type="number"
                          min="0"
                          step="1"
                          placeholder="e.g. 150"
                          value={
                            load.powerW === 0
                              ? ""
                              : load.powerW
                          }
                          onChange={(event) =>
                            updateLoad(load.id, {
                              powerW:
                                Number(
                                  event.target.value,
                                ) || 0,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor={`quantity-${load.id}`}
                        >
                          Quantity
                        </Label>

                        <Input
                          id={`quantity-${load.id}`}
                          type="number"
                          min="1"
                          step="1"
                          value={load.quantity}
                          onChange={(event) =>
                            updateLoad(load.id, {
                              quantity:
                                Number(
                                  event.target.value,
                                ) || 0,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor={`hours-${load.id}`}
                        >
                          Hours / Day
                        </Label>

                        <Input
                          id={`hours-${load.id}`}
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          placeholder="0 - 24"
                          value={
                            load.hoursPerDay === 0
                              ? ""
                              : load.hoursPerDay
                          }
                          onChange={(event) =>
                            updateLoad(load.id, {
                              hoursPerDay:
                                Number(
                                  event.target.value,
                                ) || 0,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor={`surge-${load.id}`}
                        >
                          Starting Surge (W)
                        </Label>

                        <Input
                          id={`surge-${load.id}`}
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Optional"
                          value={
                            load.surgeW === undefined ||
                            load.surgeW === 0
                              ? ""
                              : load.surgeW
                          }
                          onChange={(event) => {
                            const value =
                              event.target.value;

                            updateLoad(load.id, {
                              surgeW:
                                value.trim() === ""
                                  ? undefined
                                  : Number(value),
                            });
                          }}
                        />

                        <p className="text-xs text-muted-foreground">
                          Use the manufacturer&apos;s
                          measured or specified starting
                          surge where available.
                        </p>
                      </div>

                      <div className="flex items-end">
                        <div className="flex items-center gap-2 pb-2">
                          <input
                            id={`critical-${load.id}`}
                            type="checkbox"
                            checked={
                              load.critical ?? false
                            }
                            onChange={(event) =>
                              updateLoad(load.id, {
                                critical:
                                  event.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-gray-300"
                          />

                          <Label
                            htmlFor={`critical-${load.id}`}
                          >
                            Critical Load
                          </Label>
                        </div>
                      </div>
                    </div>

                    {auditResult && (
                      <div className="mt-4 grid gap-3 rounded-lg bg-muted/50 p-3 text-sm md:grid-cols-3">
                        <div>
                          <span className="text-muted-foreground">
                            Running Power
                          </span>

                          <p className="font-semibold">
                            {formatNumber(
                              auditResult.loads[index]
                                ?.runningPowerW ?? 0,
                            )}{" "}
                            W
                          </p>
                        </div>

                        <div>
                          <span className="text-muted-foreground">
                            Daily Energy
                          </span>

                          <p className="font-semibold">
                            {formatNumber(
                              auditResult.loads[index]
                                ?.dailyEnergyWh ?? 0,
                            )}{" "}
                            Wh/day
                          </p>
                        </div>

                        <div>
                          <span className="text-muted-foreground">
                            Surge Contribution
                          </span>

                          <p className="font-semibold">
                            {formatNumber(
                              auditResult.loads[index]
                                ?.surgeContributionW ?? 0,
                            )}{" "}
                            W
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ),
              )}

              {/* ✅ NEW: Add-another-appliance button below the last card */}
              <div className="flex justify-center pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addLoad}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Another Appliance
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {auditError && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />

          <div>
            <p className="font-semibold text-destructive">
              Load Audit Error
            </p>

            <p className="mt-1 text-sm">
              {auditError}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={runAudit}
          disabled={loads.length === 0}
        >
          Calculate Load Audit
        </Button>
      </div>

      {auditResult && (
        <Card>
          <CardHeader>
            <CardTitle>Load Audit Summary</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Total Running Power
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {formatNumber(
                    auditResult.totalRunningPowerW,
                  )}{" "}
                  W
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Total Daily Energy
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {formatNumber(
                    auditResult.totalDailyEnergyWh,
                  )}{" "}
                  Wh/day
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Total Starting Surge
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {formatNumber(
                    auditResult.totalSurgePowerW,
                  )}{" "}
                  W
                </p>
              </div>
            </div>

            {hasAudited && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                <CheckCircle2 className="h-5 w-5" />

                <span className="text-sm font-medium">
                  Load audit completed successfully.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end border-t pt-6">
        <Button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
        >
          Continue to Energy Calculation
        </Button>
      </div>
    </div>
  );
}