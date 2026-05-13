"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Presentation } from "lucide-react";
import { useQuoteStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { REGIONS, VISITS_PER_WEEK_OPTIONS, FLOOR_TYPES_V3, SPECIAL_SERVICES_CATALOG } from "@/lib/constants";
import { calculatePorterCost, calculateSpecialServiceCost } from "@/lib/calculator";

function getStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="secondary" className="text-sm">Draft</Badge>;
    case "presented":
      return <Badge className="bg-janpro-cyan text-white text-sm">Presented</Badge>;
    case "signed":
      return <Badge className="bg-green-600 text-white text-sm">Signed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { savedQuotes, loadQuote, setStep } = useQuoteStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const quote = savedQuotes.find((q) => q.id === id);

  if (!quote) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <p className="text-muted-foreground">Quote not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard")}
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const regionLabel =
    REGIONS.find((r) => r.value === quote.region)?.label ?? quote.region;
  const visitsLabel =
    VISITS_PER_WEEK_OPTIONS.find((v) => v.value === quote.visitsPerWeek)
      ?.label ?? `${quote.visitsPerWeek}x`;

  const handleEdit = () => {
    loadQuote(id);
    setStep(0);
    router.push("/quotes/new");
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Back + Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-janpro-navy">
              {quote.companyName || "Untitled Quote"}
            </h1>
            {getStatusBadge(quote.status)}
          </div>
          <p className="text-sm text-muted-foreground">
            Created {new Date(quote.createdAt).toLocaleDateString()} &bull;
            Updated {new Date(quote.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            className="bg-janpro-navy hover:bg-janpro-navy/90"
            onClick={() => router.push(`/quotes/${id}/present`)}
          >
            <Presentation className="h-4 w-4 mr-2" />
            Present Again
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prospect */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Prospect</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm space-y-1">
            <p className="font-semibold text-lg">{quote.companyName}</p>
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

        {/* Facility */}
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
              <span className="text-muted-foreground">Visits:</span>{" "}
              {visitsLabel}/week
            </p>
            <p>
              <span className="text-muted-foreground">Condition:</span>{" "}
              {quote.conditionRating}/10
            </p>
          </CardContent>
        </Card>

        {/* Quote Output */}
        <Card className="lg:col-span-2 border-janpro-navy/30 bg-janpro-navy/[0.02]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Monthly Service Investment
                </p>
                <p className="text-4xl font-bold text-janpro-navy">
                  {formatCurrency(
                    quote.quotedMonthly || quote.calculatedMonthly
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">per month</p>
              </div>
              <div className="text-right text-sm space-y-1">
                <p>
                  Total Sq Ft: {quote.totalSqft.toLocaleString()}
                </p>
                <p>
                  Hours/Visit: {quote.hoursPerVisit.toFixed(1)}
                </p>
                <p className="capitalize">
                  Density: {quote.facilityDensityTier}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Areas */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Areas ({quote.areas.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Area</th>
                    <th className="pb-2 font-medium">Floor Type</th>
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
                        {FLOOR_TYPES_V3.find((f) => f.value === area.floorType)?.label ?? area.floorType}
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
            <CardContent className="pt-0 text-sm space-y-2">
              {quote.initialCleanData.enabled && (
                <div className="flex justify-between">
                  <span>Initial Clean</span>
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
                    <span>{catalog?.label ?? s.serviceType}</span>
                    <span className="font-semibold">
                      {formatCurrency(calculateSpecialServiceCost(s))}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {quote.notes && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Signature */}
        {quote.status === "signed" && quote.signatureData && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Signature</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="border rounded-lg p-4 bg-white inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                  src={quote.signatureData}
                  alt="Client signature"
                  className="max-h-[120px]"
                />
              </div>
              {quote.signedDate && (
                <p className="text-sm text-muted-foreground mt-2">
                  Signed on {new Date(quote.signedDate).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
