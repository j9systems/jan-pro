"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useQuoteStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import {
  REGIONS,
  VISITS_PER_WEEK_OPTIONS,
  SPECIAL_SERVICES_CATALOG,
} from "@/lib/constants";
import { calculatePorterCost, calculateSpecialServiceCost } from "@/lib/calculator";

export function ReviewStep() {
  const quote = useQuoteStore((s) => s.currentQuote);

  if (!quote) return null;

  const regionLabel =
    REGIONS.find((r) => r.value === quote.region)?.label ?? quote.region;
  const visitsLabel =
    VISITS_PER_WEEK_OPTIONS.find((v) => v.value === quote.visitsPerWeek)
      ?.label ?? `${quote.visitsPerWeek}x`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-janpro-navy mb-1">
          Review & Finalize
        </h2>
        <p className="text-sm text-muted-foreground">
          Review all details before saving and presenting the quote.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prospect Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Prospect</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm space-y-1">
            <p className="text-lg font-semibold">
              {quote.companyName || "Untitled"}
            </p>
            <p>{quote.contactName}</p>
            <p>{quote.contactEmail}</p>
            <p>{quote.contactPhone}</p>
            <p>
              {[quote.address, quote.city, quote.state]
                .filter(Boolean)
                .join(", ")}
            </p>
          </CardContent>
        </Card>

        {/* Facility Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Facility</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Type:</span>{" "}
              {quote.facilityType}
            </p>
            <p>
              <span className="text-muted-foreground">Region:</span>{" "}
              {regionLabel}
            </p>
            <p>
              <span className="text-muted-foreground">Employees:</span>{" "}
              {quote.numEmployees}
            </p>
            <p>
              <span className="text-muted-foreground">Floors:</span>{" "}
              {quote.numFloors} | Restrooms: {quote.numRestrooms}
            </p>
            <p>
              <span className="text-muted-foreground">Visits:</span>{" "}
              {visitsLabel}/week
            </p>
            <p>
              <span className="text-muted-foreground">Condition:</span>{" "}
              {quote.conditionRating}/10
            </p>
            {quote.newConstruction && (
              <Badge variant="outline" className="mt-1">
                New Construction
              </Badge>
            )}
            {quote.restrictedClean && (
              <Badge variant="outline" className="mt-1 ml-1 text-amber-600">
                Restricted Clean (+20%)
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Areas */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Areas ({quote.areas.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
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
                <tr className="font-semibold">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right">
                    {quote.totalSqft.toLocaleString()}
                  </td>
                  <td className="py-2 text-right">
                    {Math.round(
                      quote.areas.reduce((s, a) => s + a.minsPerVisit, 0)
                    )}
                  </td>
                  <td className="py-2 text-right">
                    {formatCurrency(
                      quote.areas.reduce((s, a) => s + a.costPerMonth, 0)
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Add-ons */}
        {(quote.porters.length > 0 ||
          quote.initialCleanData.enabled ||
          quote.specialServices.length > 0) && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Add-Ons</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm space-y-3">
              {quote.initialCleanData.enabled && (
                <div className="flex justify-between">
                  <span>Initial Clean (one-time)</span>
                  <span className="font-semibold">
                    {formatCurrency(quote.initialCleanData.totalCost)}
                  </span>
                </div>
              )}
              {quote.porters.map((p) => (
                <div key={p.porterNumber} className="flex justify-between">
                  <span>
                    Porter {p.porterNumber} ({p.hoursPerDay}hr/day,{" "}
                    {p.daysPerWeek}d/wk)
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(calculatePorterCost(p))}/mo
                  </span>
                </div>
              ))}
              {quote.specialServices.map((s) => {
                const catalog = SPECIAL_SERVICES_CATALOG.find(
                  (c) => c.key === s.serviceType
                );
                return (
                  <div key={s.id} className="flex justify-between">
                    <span>
                      {catalog?.label ?? s.serviceType} — {s.sqftOrUnits}{" "}
                      {catalog?.unit ?? "units"} ({s.frequency})
                      {s.includedInMonthly && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          In Monthly
                        </Badge>
                      )}
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(calculateSpecialServiceCost(s))}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Final Quote */}
        <Card className="lg:col-span-2 border-janpro-navy/30 bg-janpro-navy/[0.02]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Monthly Service Investment
                </p>
                <p className="text-4xl font-bold text-janpro-navy">
                  {formatCurrency(quote.quotedMonthly || quote.calculatedMonthly)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">per month</p>
              </div>
              <div className="text-right space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Density:</span>{" "}
                  <span className="capitalize">{quote.facilityDensityTier}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Hours/Visit:</span>{" "}
                  {quote.hoursPerVisit.toFixed(1)}
                </p>
                <p>
                  <span className="text-muted-foreground">Total Sq Ft:</span>{" "}
                  {quote.totalSqft.toLocaleString()}
                </p>
              </div>
            </div>
            {quote.notes && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
