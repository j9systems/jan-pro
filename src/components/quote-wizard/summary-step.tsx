"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Camera,
  Mic,
  Ruler,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuoteStore } from "@/lib/store";
import { getRegionalMinimum, calculatePorterCost, calculateSpecialServiceCost } from "@/lib/calculator";
import { formatCurrency } from "@/lib/utils";
import { REGIONS, SPECIAL_SERVICES_CATALOG, FLOOR_TYPES_V3, AREA_TYPES } from "@/lib/constants";

// Placeholder suggestions demonstrating what the AI will do.
interface AISuggestion {
  id: string;
  type: "warning" | "info" | "success";
  icon: "ruler" | "camera" | "mic" | "mappin";
  area: string;
  areaIndex: number;
  message: string;
  detail: string;
}

const PLACEHOLDER_SUGGESTIONS: AISuggestion[] = [
  {
    id: "1",
    type: "warning",
    icon: "ruler",
    area: "Main Lobby",
    areaIndex: 0,
    message: "Dimensions may be incorrect",
    detail:
      'The photo shows a small reception area, but dimensions calculate to 3,000 sq ft. Did you mean 30 x 10 instead of 300 x 10?',
  },
  {
    id: "2",
    type: "warning",
    icon: "camera",
    area: "Break Room",
    areaIndex: 1,
    message: "Floor type mismatch",
    detail:
      "The uploaded photo appears to show VCT flooring, but this area is tagged as Carpet.",
  },
  {
    id: "3",
    type: "info",
    icon: "mic",
    area: "Restrooms",
    areaIndex: 2,
    message: "Voice note mentions additional fixtures",
    detail:
      'Your voice note says "there are 4 sinks and 2 hand dryers" but no unit items are entered for this area.',
  },
  {
    id: "4",
    type: "success",
    icon: "mappin",
    area: "Office Wing",
    areaIndex: 3,
    message: "Looks good",
    detail:
      "Photo, notes, and measurements all align for this area. No issues detected.",
  },
];

const ICON_MAP = {
  ruler: Ruler,
  camera: Camera,
  mic: Mic,
  mappin: MapPin,
};

const TYPE_STYLES = {
  warning: "border-amber-200 bg-amber-50/50",
  info: "border-blue-200 bg-blue-50/50",
  success: "border-emerald-200 bg-emerald-50/50",
};

const TYPE_ICON_STYLES = {
  warning: "text-amber-600 bg-amber-100",
  info: "text-blue-600 bg-blue-100",
  success: "text-emerald-600 bg-emerald-100",
};

function AISummaryCard() {
  const setStep = useQuoteStore((s) => s.setStep);
  const suggestions = PLACEHOLDER_SUGGESTIONS;
  const warningCount = suggestions.filter((s) => s.type === "warning").length;
  const infoCount = suggestions.filter((s) => s.type === "info").length;
  const successCount = suggestions.filter((s) => s.type === "success").length;

  const handleGoToArea = (areaIndex: number) => {
    sessionStorage.setItem("janpro-goto-area", String(areaIndex));
    setStep(2);
  };

  return (
    <Card className="border-janpro-navy/30 bg-gradient-to-br from-slate-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-janpro-navy/10">
              <Sparkles className="h-5 w-5 text-janpro-navy" />
            </div>
            <div>
              <CardTitle className="text-base text-janpro-navy">
                AI Review
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cross-referencing photos, voice notes, and measurements
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {warningCount > 0 && (
              <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 text-xs">
                {warningCount} {warningCount === 1 ? "issue" : "issues"}
              </Badge>
            )}
            {infoCount > 0 && (
              <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 text-xs">
                {infoCount} {infoCount === 1 ? "suggestion" : "suggestions"}
              </Badge>
            )}
            {successCount > 0 && (
              <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 text-xs">
                {successCount} verified
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {suggestions.map((s) => {
          const Icon = ICON_MAP[s.icon];
          return (
            <div
              key={s.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${TYPE_STYLES[s.type]}`}
            >
              <div className={`p-1.5 rounded-md shrink-0 mt-0.5 ${TYPE_ICON_STYLES[s.type]}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium">{s.area}</span>
                  <span className="text-xs text-muted-foreground">
                    &mdash; {s.message}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {s.detail}
                </p>
              </div>
              {s.type !== "success" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-xs h-8 gap-1"
                  onClick={() => handleGoToArea(s.areaIndex)}
                >
                  Revise
                  <ArrowRight className="h-3 w-3" />
                </Button>
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-1" />
              )}
            </div>
          );
        })}

        <div className="pt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          <span>AI analysis will run automatically once connected</span>
        </div>
      </CardContent>
    </Card>
  );
}

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

  const getFloorLabel = (val: string) =>
    FLOOR_TYPES_V3.find((f) => f.value === val)?.label ?? val;
  const getAreaTypeLabel = (val: string) =>
    AREA_TYPES.find((a) => a.value === val)?.label ?? val;

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

      {/* AI Summary */}
      <AISummaryCard />

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
              <CardTitle className="text-base">
                Area Breakdown ({quote.areas.length} areas)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">Area</th>
                      <th className="pb-2 font-medium">Floor</th>
                      <th className="pb-2 font-medium text-right">Qty</th>
                      <th className="pb-2 font-medium text-right">Total Sq Ft</th>
                      <th className="pb-2 font-medium text-right">Min/Visit</th>
                      <th className="pb-2 font-medium text-right">Monthly</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.areas.map((area) => (
                      <tr key={area.id} className="border-b last:border-0">
                        <td className="py-2">
                          <div>
                            {area.areaName || `Area ${area.sortOrder}`}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({getAreaTypeLabel(area.areaType)})
                            </span>
                          </div>
                        </td>
                        <td className="py-2 text-xs">
                          {getFloorLabel(area.floorType)}
                        </td>
                        <td className="py-2 text-right">
                          {area.quantity > 1 ? `${area.quantity}x` : ""}
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
