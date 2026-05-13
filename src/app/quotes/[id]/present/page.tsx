"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuoteStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { REGIONS, VISITS_PER_WEEK_OPTIONS, FLOOR_TYPES_V3 } from "@/lib/constants";
import { calculatePorterCost } from "@/lib/calculator";

export default function PresentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { savedQuotes, currentQuote, loadQuote } = useQuoteStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!currentQuote || currentQuote.id !== id) {
      loadQuote(id);
    }
  }, [id, currentQuote, loadQuote]);

  if (!mounted) return null;

  const quote = currentQuote?.id === id ? currentQuote : savedQuotes.find((q) => q.id === id);
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

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-block bg-janpro-navy text-white px-4 py-2 rounded mb-4">
          <span className="font-bold text-xl tracking-tight">JAN-PRO</span>
        </div>
        <h1 className="text-2xl font-bold text-janpro-navy">
          Commercial Cleaning Proposal
        </h1>
        <p className="text-lg text-muted-foreground mt-1">
          Prepared for{" "}
          <span className="font-semibold text-foreground">
            {quote.companyName || "—"}
          </span>
        </p>
      </div>

      {/* Service Summary */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-janpro-navy mb-4">
            Service Summary
          </h2>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Visits Per Week</p>
              <p className="text-2xl font-bold text-janpro-navy">
                {visitsLabel}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Sq Ft</p>
              <p className="text-2xl font-bold text-janpro-navy">
                {quote.totalSqft.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hours Per Visit</p>
              <p className="text-2xl font-bold text-janpro-navy">
                {quote.hoursPerVisit.toFixed(1)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Investment */}
      <Card className="mb-6 border-janpro-navy/30 bg-janpro-navy/[0.02]">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Monthly Service Investment
          </p>
          <p className="text-5xl font-bold text-janpro-navy mb-2">
            {formatCurrency(quote.quotedMonthly || quote.calculatedMonthly)}
          </p>
          <p className="text-sm text-muted-foreground">per month</p>
        </CardContent>
      </Card>

      {/* Area Breakdown */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-janpro-navy mb-4">
            Area Breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Area</th>
                  <th className="pb-2 font-medium">Floor Type</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                  <th className="pb-2 font-medium text-right">Square Feet</th>
                  <th className="pb-2 font-medium text-right">Min/Visit</th>
                </tr>
              </thead>
              <tbody>
                {quote.areas.map((area) => (
                  <tr key={area.id} className="border-b last:border-0">
                    <td className="py-3">
                      {area.areaName || `Area ${area.sortOrder}`}
                    </td>
                    <td className="py-3 text-xs">
                      {FLOOR_TYPES_V3.find((f) => f.value === area.floorType)?.label ?? area.floorType}
                    </td>
                    <td className="py-3 text-right">
                      {area.quantity > 1 ? area.quantity : ""}
                    </td>
                    <td className="py-3 text-right">
                      {area.sqftTotal.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      {Math.round(area.minsPerVisit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Initial Clean */}
      {quote.initialCleanData.enabled && quote.initialCleanData.totalCost > 0 && (
        <Card className="mb-6">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-janpro-navy">
                Initial Clean
              </h2>
              <p className="text-sm text-muted-foreground">
                One-time deep cleaning service
              </p>
            </div>
            <p className="text-2xl font-bold text-janpro-navy">
              {formatCurrency(quote.initialCleanData.totalCost)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Day Porter */}
      {quote.porters.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-janpro-navy mb-3">
              Day Porter Service
            </h2>
            {quote.porters.map((p) => (
              <div
                key={p.porterNumber}
                className="flex justify-between items-center"
              >
                <span className="text-sm">
                  Porter {p.porterNumber}: {p.hoursPerDay} hrs/day,{" "}
                  {p.daysPerWeek} days/week
                </span>
                <span className="font-semibold">
                  {formatCurrency(calculatePorterCost(p))}/mo
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {quote.notes && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-janpro-navy mb-2">
              Notes
            </h2>
            <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center py-6 border-t mt-8">
        <p className="text-sm text-muted-foreground">
          {regionLabel} &bull; {quote.facilityType}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Jan-Pro Franchise Development
        </p>
      </div>

      {/* Action Button */}
      <div className="sticky bottom-0 bg-white border-t p-4 -mx-6">
        <div className="max-w-4xl mx-auto flex justify-end">
          <Button
            size="lg"
            className="bg-janpro-navy hover:bg-janpro-navy/90"
            onClick={() => router.push(`/quotes/${quote.id}/sign`)}
          >
            Client Signature &rarr;
          </Button>
        </div>
      </div>
    </div>
  );
}
