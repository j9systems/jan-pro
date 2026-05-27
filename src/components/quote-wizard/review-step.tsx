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
  FLOOR_TYPES_V3,
  FLOOR_RATES_SQFT_PER_HR,
  AREA_TYPES,
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

  const getFloorLabel = (val: string) =>
    FLOOR_TYPES_V3.find((f) => f.value === val)?.label ?? val;
  const getAreaTypeLabel = (val: string) =>
    AREA_TYPES.find((a) => a.value === val)?.label ?? val;

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

        {/* Floor Type Summary */}
        {(() => {
          const floorSummary = new Map<string, { sqft: number; rate: number }>();
          for (const area of quote.areas) {
            const key = area.floorType;
            const existing = floorSummary.get(key) || { sqft: 0, rate: FLOOR_RATES_SQFT_PER_HR[key] || 2500 };
            existing.sqft += area.sqftTotal;
            floorSummary.set(key, existing);
          }
          return (
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Floor Type Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium">Floor Type</th>
                        <th className="pb-2 font-medium text-right">Total Sq Ft</th>
                        <th className="pb-2 font-medium text-right">Production Rate</th>
                        <th className="pb-2 font-medium text-right">Estimated Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(floorSummary.entries()).map(([key, { sqft, rate }]) => (
                        <tr key={key} className="border-b last:border-0">
                          <td className="py-2">{getFloorLabel(key)}</td>
                          <td className="py-2 text-right">{sqft.toLocaleString()}</td>
                          <td className="py-2 text-right">{rate.toLocaleString()} sq ft/hr</td>
                          <td className="py-2 text-right">{(sqft / rate).toFixed(1)} hrs</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Areas */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Areas ({quote.areas.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Area</th>
                    <th className="pb-2 font-medium">Floor Type</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium text-right">Qty</th>
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
                      <td className="py-2 text-xs">
                        {getFloorLabel(area.floorType)}
                      </td>
                      <td className="py-2 text-xs">
                        {getAreaTypeLabel(area.areaType)}
                      </td>
                      <td className="py-2 text-right">
                        {area.quantity > 1 ? area.quantity : ""}
                      </td>
                      <td className="py-2 text-right">
                        {area.sqftTotal.toLocaleString()}
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
                    <td className="py-2" />
                    <td className="py-2" />
                    <td className="py-2" />
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
            </div>
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
        <Card className="lg:col-span-2 border-0 bg-gradient-to-br from-janpro-navy via-janpro-navy to-[#003a9e] text-white shadow-glass-xl overflow-hidden">
          <CardContent className="p-6 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,174,239,0.12),transparent_60%)]" />
            <div className="flex items-center justify-between relative">
              <div>
                <p className="text-sm text-white/70 mb-1">
                  Monthly Service Investment
                </p>
                <p className="text-4xl font-bold text-white">
                  {formatCurrency(quote.quotedMonthly || quote.calculatedMonthly)}
                </p>
                <p className="text-sm text-white/70 mt-1">per month</p>
              </div>
              <div className="text-right space-y-1 text-sm text-white/80">
                <p>
                  <span className="text-white/60">Density:</span>{" "}
                  <span className="capitalize">{quote.facilityDensityTier}</span>
                </p>
                <p>
                  <span className="text-white/60">Hours/Visit:</span>{" "}
                  {quote.hoursPerVisit.toFixed(1)}
                </p>
                <p>
                  <span className="text-white/60">Total Sq Ft:</span>{" "}
                  {quote.totalSqft.toLocaleString()}
                </p>
              </div>
            </div>
            {quote.state === "CA" && quote.cpswpaEnabled && (
              <p className="text-xs text-white/60 mt-2 relative">
                Includes $7.00 CPSWPA surcharge (California)
              </p>
            )}
            {quote.premiumTreatmentEnabled && quote.premiumMonthly > 0 && (
              <>
                <Separator className="my-4 bg-white/20" />
                <div className="flex items-center justify-between relative">
                  <div>
                    <p className="text-sm text-white/70 mb-1">Premium Monthly (with Envira Shield)</p>
                    <p className="text-3xl font-bold text-white">
                      {formatCurrency(quote.premiumMonthly)}
                    </p>
                    <p className="text-sm text-white/70 mt-1">per month</p>
                  </div>
                </div>
              </>
            )}
            {quote.notes && (
              <>
                <Separator className="my-4 bg-white/20" />
                <div className="relative">
                  <p className="text-sm text-white/60 mb-1">Notes</p>
                  <p className="text-sm text-white/90 whitespace-pre-wrap">{quote.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
