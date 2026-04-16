"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import { useQuoteStore } from "@/lib/store";
import { getRegionalMinimum, calculatePorterCost, calculateSpecialServiceCost } from "@/lib/calculator";
import { formatCurrency } from "@/lib/utils";
import { REGIONS, SPECIAL_SERVICES_CATALOG } from "@/lib/constants";

export function SummaryStep() {
  const quote = useQuoteStore((s) => s.currentQuote);
  const updateQuote = useQuoteStore((s) => s.updateQuote);

  if (!quote) return null;

  const regionalMinimum = getRegionalMinimum(quote.region, quote.visitsPerWeek);
  const regionLabel = REGIONS.find((r) => r.value === quote.region)?.label ?? quote.region;
  const subtotalMonthly = quote.areas.reduce((sum, a) => sum + a.costPerMonth, 0);
  const porterTotal = quote.porters.reduce((sum, p) => sum + calculatePorterCost(p), 0);
  const specialServicesMonthly = quote.specialServices
    .filter((s) => s.includedInMonthly)
    .reduce((sum, s) => sum + calculateSpecialServiceCost(s), 0);

  const belowMinimum = quote.quotedMonthly > 0 && quote.quotedMonthly < regionalMinimum;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-janpro-navy mb-1">
          Quote Summary
        </h2>
        <p className="text-sm text-muted-foreground">
          Review calculated costs and set the quoted monthly amount.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Input Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Prospect & Facility</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Company:</span>{" "}
                {quote.companyName || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Contact:</span>{" "}
                {quote.contactName || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Location:</span>{" "}
                {[quote.address, quote.city, quote.state].filter(Boolean).join(", ") || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Type:</span>{" "}
                {quote.facilityType}
              </p>
              <p>
                <span className="text-muted-foreground">Region:</span>{" "}
                {regionLabel}
              </p>
              <p>
                <span className="text-muted-foreground">Visits/Week:</span>{" "}
                {quote.visitsPerWeek}x
              </p>
              {quote.restrictedClean && (
                <p className="text-amber-600 font-medium">
                  Restricted Clean (+20%)
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Area Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">Area</th>
                      <th className="pb-2 font-medium text-right">Sq Ft</th>
                      <th className="pb-2 font-medium text-right">Min/Visit</th>
                      <th className="pb-2 font-medium text-right">Monthly</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.areas.map((area) => (
                      <tr key={area.id} className="border-b last:border-0">
                        <td className="py-2">
                          {area.areaName || `Area ${area.sortOrder}`}
                        </td>
                        <td className="py-2 text-right">
                          {area.totalSqft.toLocaleString()}
                        </td>
                        <td className="py-2 text-right">
                          {Math.round(area.minsPerVisit)}
                        </td>
                        <td className="py-2 text-right">
                          {formatCurrency(area.costPerMonth)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quote Output */}
        <div>
          <Card className="border-janpro-navy/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-janpro-navy">
                Quote Calculation
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Sq Ft</p>
                  <p className="text-lg font-semibold">
                    {quote.totalSqft.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hours/Visit</p>
                  <p className="text-lg font-semibold">
                    {quote.hoursPerVisit.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Facility Density</p>
                  <p className="text-lg font-semibold">
                    {quote.facilityDensity > 0
                      ? Math.round(quote.facilityDensity)
                      : "—"}{" "}
                    <Badge variant="outline" className="ml-1 text-xs capitalize">
                      {quote.facilityDensityTier}
                    </Badge>
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">SUTM Count</p>
                  <p className="text-lg font-semibold">{quote.sutmTotal}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal (Areas)</span>
                  <span>{formatCurrency(subtotalMonthly)}</span>
                </div>
                {porterTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Day Porter(s)</span>
                    <span>{formatCurrency(porterTotal)}</span>
                  </div>
                )}
                {specialServicesMonthly > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Special Services (in monthly)
                    </span>
                    <span>{formatCurrency(specialServicesMonthly)}</span>
                  </div>
                )}
                {quote.restrictedClean && (
                  <div className="flex justify-between text-amber-600">
                    <span>Restricted Clean Uplift (+20%)</span>
                    <span>Applied</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="font-medium">Calculated Monthly</span>
                <span className="text-2xl font-bold text-janpro-navy">
                  {formatCurrency(quote.calculatedMonthly)}
                </span>
              </div>

              {regionalMinimum > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Regional Minimum ({regionLabel})
                  </span>
                  <span>{formatCurrency(regionalMinimum)}</span>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Quoted Monthly Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step={0.01}
                    min={0}
                    value={quote.quotedMonthly || ""}
                    onChange={(e) =>
                      updateQuote({
                        quotedMonthly: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="pl-8 text-xl font-bold h-14 text-janpro-navy"
                    placeholder={quote.calculatedMonthly.toFixed(2)}
                  />
                </div>
                {belowMinimum && (
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    Below regional minimum of {formatCurrency(regionalMinimum)}
                  </div>
                )}
              </div>

              {quote.initialCleanData.enabled &&
                quote.initialCleanData.totalCost > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Initial Clean (one-time)
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(quote.initialCleanData.totalCost)}
                      </span>
                    </div>
                  </>
                )}

              {quote.specialServices.filter((s) => !s.includedInMonthly).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Special Services (not in monthly)
                    </p>
                    {quote.specialServices
                      .filter((s) => !s.includedInMonthly)
                      .map((s) => {
                        const catalog = SPECIAL_SERVICES_CATALOG.find(
                          (c) => c.key === s.serviceType
                        );
                        return (
                          <div
                            key={s.id}
                            className="flex justify-between text-sm mb-1"
                          >
                            <span className="text-muted-foreground">
                              {catalog?.label ?? s.serviceType} ({s.frequency})
                            </span>
                            <span>
                              {formatCurrency(calculateSpecialServiceCost(s))}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={quote.notes}
                  onChange={(e) => updateQuote({ notes: e.target.value })}
                  placeholder="Any additional notes for this quote..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
