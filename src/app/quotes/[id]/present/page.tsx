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
  }, []);

  useEffect(() => {
    if (!currentQuote || currentQuote.id !== id) {
      loadQuote(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-janpro-navy via-janpro-navy to-[#003a9e] p-8 md:p-10 mb-8 shadow-glass-xl text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,174,239,0.15),transparent_60%)]" />
        <div className="relative">
          <p className="text-janpro-cyan/70 text-xs font-semibold uppercase tracking-[0.2em] mb-3">Commercial Cleaning Proposal</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
            {quote.companyName || "—"}
          </h1>
          <p className="text-white/50 text-sm">
            Prepared by JAN-PRO Franchise Development
          </p>

          {/* Service Summary — inline */}
          <div className="grid grid-cols-3 gap-6 mt-8 pt-8 border-t border-white/10">
            <div>
              <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">Visits/Week</p>
              <p className="text-2xl font-bold text-white">{visitsLabel}</p>
            </div>
            <div>
              <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">Total Sq Ft</p>
              <p className="text-2xl font-bold text-white">{quote.totalSqft.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">Hours/Visit</p>
              <p className="text-2xl font-bold text-white">{quote.hoursPerVisit.toFixed(1)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Investment */}
      <div className="relative rounded-2xl bg-white/70 backdrop-blur-xl border border-white/60 shadow-glass-lg p-10 mb-8 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-janpro-navy-light/30 to-transparent" />
        <div className="relative">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Monthly Service Investment
          </p>
          <p className="text-6xl md:text-7xl font-bold text-janpro-navy tracking-tight mb-2">
            {formatCurrency(quote.quotedMonthly || quote.calculatedMonthly)}
          </p>
          <p className="text-muted-foreground">per month</p>
          {quote.state === "CA" && quote.cpswpaEnabled && (
            <p className="text-xs text-muted-foreground mt-2">
              Includes $7.00 CPSWPA surcharge (California)
            </p>
          )}
        </div>
      </div>

      {/* Premium Monthly with Envira Shield */}
      {quote.premiumTreatmentEnabled && quote.premiumMonthly > 0 && (
        <div className="relative rounded-2xl bg-white/70 backdrop-blur-xl border border-white/60 shadow-glass-lg p-10 mb-8 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-janpro-navy-light/30 to-transparent" />
          <div className="relative">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Premium Monthly (with Envira Shield)
            </p>
            <p className="text-5xl md:text-6xl font-bold text-janpro-navy tracking-tight mb-2">
              {formatCurrency(quote.premiumMonthly)}
            </p>
            <p className="text-muted-foreground">per month</p>
          </div>
        </div>
      )}

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

      {/* Action Button — contract generation + signature happens through the
          DocsAutomator flow on the quote page, not natively in the app. */}
      <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-border/50 p-4 -mx-6">
        <div className="max-w-4xl mx-auto flex justify-end">
          <Button
            size="lg"
            onClick={() => router.push(`/quotes/${quote.id}`)}
          >
            Generate Contract &rarr;
          </Button>
        </div>
      </div>
    </div>
  );
}
