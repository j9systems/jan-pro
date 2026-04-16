"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useQuoteStore } from "@/lib/store";
import {
  SPECIAL_SERVICES_CATALOG,
  SPECIAL_SERVICE_RATES,
  FREQUENCY_OPTIONS,
} from "@/lib/constants";
import { calculateInitialClean, calculatePorterCost, calculateSpecialServiceCost } from "@/lib/calculator";
import { formatCurrency, generateId } from "@/lib/utils";
import type { InitialClean, SpecialService } from "@/lib/types";

function InitialCleanSection() {
  const [isOpen, setIsOpen] = useState(true);
  const quote = useQuoteStore((s) => s.currentQuote);
  const updateQuote = useQuoteStore((s) => s.updateQuote);

  if (!quote) return null;

  const data = quote.initialCleanData;

  const updateIC = (partial: Partial<InitialClean>) => {
    updateQuote({
      initialCleanData: { ...data, ...partial },
    });
  };

  const totalCost = calculateInitialClean({ ...data });

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button type="button" className="flex items-center gap-2 text-left">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <CardTitle className="text-lg">Initial Clean</CardTitle>
              </button>
            </CollapsibleTrigger>
            <Switch
              checked={data.enabled}
              onCheckedChange={(checked) => updateIC({ enabled: checked })}
            />
          </div>
        </CardHeader>
        <CollapsibleContent>
          {data.enabled && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Offices/General (sq ft)</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={data.officesSqft || ""}
                    onChange={(e) =>
                      updateIC({ officesSqft: parseInt(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Machine Scrub (sq ft)</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={data.machineScrubSqft || ""}
                    onChange={(e) =>
                      updateIC({ machineScrubSqft: parseInt(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Showers</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={data.showerCount || ""}
                    onChange={(e) =>
                      updateIC({ showerCount: parseInt(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Blinds</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={data.blindCount || ""}
                    onChange={(e) =>
                      updateIC({ blindCount: parseInt(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">SUTMs</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={data.sutmCount || ""}
                    onChange={(e) =>
                      updateIC({ sutmCount: parseInt(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Additional Services ($)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.01}
                    value={data.additionalServices || ""}
                    onChange={(e) =>
                      updateIC({
                        additionalServices: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="mt-4 text-right">
                <span className="text-sm text-muted-foreground">Total: </span>
                <span className="text-lg font-semibold text-janpro-navy">
                  {formatCurrency(totalCost)}
                </span>
              </div>
            </CardContent>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function PorterSection() {
  const [isOpen, setIsOpen] = useState(true);
  const quote = useQuoteStore((s) => s.currentQuote);
  const addPorter = useQuoteStore((s) => s.addPorter);
  const removePorter = useQuoteStore((s) => s.removePorter);
  const updatePorter = useQuoteStore((s) => s.updatePorter);

  if (!quote) return null;

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <button type="button" className="flex items-center gap-2 text-left">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <CardTitle className="text-lg">Day Porter</CardTitle>
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {quote.porters.map((porter) => (
              <div
                key={porter.porterNumber}
                className="flex items-end gap-4 mb-4 pb-4 border-b last:border-0"
              >
                <div className="space-y-1 flex-1">
                  <Label className="text-xs">
                    Porter {porter.porterNumber} — Hours/Day
                  </Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={24}
                    value={porter.hoursPerDay || ""}
                    onChange={(e) =>
                      updatePorter(porter.porterNumber, {
                        hoursPerDay: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="8"
                  />
                </div>
                <div className="space-y-1 flex-1">
                  <Label className="text-xs">Days/Week</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={7}
                    value={porter.daysPerWeek || ""}
                    onChange={(e) =>
                      updatePorter(porter.porterNumber, {
                        daysPerWeek: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="5"
                  />
                </div>
                <div className="text-right min-w-[100px]">
                  <span className="text-sm font-semibold text-janpro-navy">
                    {formatCurrency(calculatePorterCost(porter))}/mo
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removePorter(porter.porterNumber)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {quote.porters.length < 2 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPorter}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Porter
              </Button>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function SpecialServicesSection() {
  const [isOpen, setIsOpen] = useState(true);
  const quote = useQuoteStore((s) => s.currentQuote);
  const addSpecialService = useQuoteStore((s) => s.addSpecialService);
  const updateSpecialService = useQuoteStore((s) => s.updateSpecialService);
  const removeSpecialService = useQuoteStore((s) => s.removeSpecialService);

  if (!quote) return null;

  const addService = (key: string) => {
    const catalog = SPECIAL_SERVICES_CATALOG.find((s) => s.key === key);
    if (!catalog) return;
    const existing = quote.specialServices.find((s) => s.serviceType === key);
    if (existing) return;

    const service: SpecialService = {
      id: generateId(),
      serviceType: key,
      sqftOrUnits: 0,
      rate: SPECIAL_SERVICE_RATES[key] ?? 0,
      costPerVisit: 0,
      frequency: "Monthly",
      includedInMonthly: false,
    };
    addSpecialService(service);
  };

  // Group catalog by category
  const categories = SPECIAL_SERVICES_CATALOG.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, typeof SPECIAL_SERVICES_CATALOG[number][]>
  );

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <button type="button" className="flex items-center gap-2 text-left">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <CardTitle className="text-lg">Special Services</CardTitle>
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Active services */}
            {quote.specialServices.length > 0 && (
              <div className="mb-6 space-y-3">
                {quote.specialServices.map((service) => {
                  const catalog = SPECIAL_SERVICES_CATALOG.find(
                    (s) => s.key === service.serviceType
                  );
                  const cost = calculateSpecialServiceCost(service);
                  return (
                    <div
                      key={service.id}
                      className="flex items-end gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {catalog?.label ?? service.serviceType}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Rate: ${service.rate}/{catalog?.unit ?? "unit"}
                        </p>
                      </div>
                      <div className="space-y-1 w-24">
                        <Label className="text-xs">
                          {catalog?.unit === "sqft" ? "Sq Ft" : "Units"}
                        </Label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={service.sqftOrUnits || ""}
                          onChange={(e) =>
                            updateSpecialService(service.id, {
                              sqftOrUnits: parseInt(e.target.value) || 0,
                            })
                          }
                          placeholder="0"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1 w-32">
                        <Label className="text-xs">Frequency</Label>
                        <Select
                          value={service.frequency}
                          onValueChange={(val) =>
                            updateSpecialService(service.id, { frequency: val })
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FREQUENCY_OPTIONS.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">In Monthly</Label>
                        <Switch
                          checked={service.includedInMonthly}
                          onCheckedChange={(checked) =>
                            updateSpecialService(service.id, {
                              includedInMonthly: checked,
                            })
                          }
                        />
                      </div>
                      <div className="text-right min-w-[80px]">
                        <span className="text-sm font-semibold">
                          {formatCurrency(cost)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSpecialService(service.id)}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add service buttons by category */}
            <div className="space-y-4">
              {Object.entries(categories).map(([category, items]) => (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    {category}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => {
                      const isAdded = quote.specialServices.some(
                        (s) => s.serviceType === item.key
                      );
                      return (
                        <Button
                          key={item.key}
                          type="button"
                          variant={isAdded ? "secondary" : "outline"}
                          size="sm"
                          disabled={isAdded}
                          onClick={() => addService(item.key)}
                          className="text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {item.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function AddOnsStep() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-janpro-navy mb-1">
          Add-On Services
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure initial clean, day porters, and special services.
        </p>
      </div>

      <InitialCleanSection />
      <PorterSection />
      <SpecialServicesSection />
    </div>
  );
}
