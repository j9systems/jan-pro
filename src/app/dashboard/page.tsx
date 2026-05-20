"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Calendar, ClipboardList, ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuoteStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

function getStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge className="border-slate-300/50 bg-slate-100/80 text-slate-600 text-xs">Draft</Badge>;
    case "presented":
      return <Badge className="border-janpro-cyan/30 bg-janpro-cyan/10 text-janpro-cyan text-xs">Presented</Badge>;
    case "signed":
      return <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-xs">Signed</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const { savedQuotes, initNewQuote, loadQuotes } = useQuoteStore();

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  const handleNewQuote = () => {
    initNewQuote();
    router.push("/quotes/new");
  };

  const totalQuotes = savedQuotes.length;
  const totalMonthly = savedQuotes.reduce((sum, q) => sum + (q.quotedMonthly || q.calculatedMonthly || 0), 0);
  const signedCount = savedQuotes.filter((q) => q.status === "signed").length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-janpro-navy via-janpro-navy to-[#0040b0] p-8 md:p-10 mb-8 shadow-glass-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,174,239,0.2),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,174,239,0.08),transparent_50%)]" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-janpro-cyan/80 text-sm font-medium mb-2 tracking-wide uppercase">Dashboard</p>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
              QuoteBuilder
            </h1>
            <p className="text-white/60 text-base max-w-md">
              Create, manage, and present commercial cleaning estimates.
            </p>
          </div>
          <Button
            onClick={handleNewQuote}
            size="lg"
            className="bg-white text-janpro-navy hover:bg-white/90 shadow-lg font-semibold gap-2 h-14 px-8 text-base shrink-0"
          >
            <Plus className="h-5 w-5" />
            New Quote
          </Button>
        </div>

        {/* Stats */}
        {totalQuotes > 0 && (
          <div className="relative grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/10">
            <div>
              <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">Quotes</p>
              <p className="text-2xl font-bold text-white">{totalQuotes}</p>
            </div>
            <div>
              <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">Pipeline</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalMonthly)}<span className="text-sm font-normal text-white/50">/mo</span></p>
            </div>
            <div>
              <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">Signed</p>
              <p className="text-2xl font-bold text-white">{signedCount}</p>
            </div>
          </div>
        )}
      </div>

      {/* Quotes List */}
      {savedQuotes.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border/60 bg-white/40 backdrop-blur-sm p-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-janpro-navy-light/50 mb-6">
            <ClipboardList className="h-8 w-8 text-janpro-navy/60" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No quotes yet
          </h3>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
            Start your first estimate to see it here. Quotes are saved locally on this device.
          </p>
          <Button onClick={handleNewQuote} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Create Your First Quote
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-foreground">Recent Quotes</h2>
            <span className="text-sm text-muted-foreground">{totalQuotes} total</span>
          </div>
          {savedQuotes
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .map((quote, i) => (
              <Link key={quote.id} href={`/quotes/${quote.id}`}>
                <div
                  className="group relative rounded-xl border border-white/60 bg-white/70 backdrop-blur-xl p-5 shadow-glass hover:shadow-glass-lg hover:border-janpro-navy/15 transition-all duration-300 cursor-pointer"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-xl bg-janpro-navy-light/40 group-hover:bg-janpro-navy-light/60 transition-colors shrink-0">
                      <Building2 className="h-5 w-5 text-janpro-navy/70" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1">
                        <h3 className="font-semibold text-base truncate">
                          {quote.companyName || "Untitled Quote"}
                        </h3>
                        {getStatusBadge(quote.status)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(quote.updatedAt).toLocaleDateString()}
                        </span>
                        {quote.contactName && (
                          <span className="truncate">{quote.contactName}</span>
                        )}
                        {quote.totalSqft > 0 && (
                          <span className="hidden md:inline">{quote.totalSqft.toLocaleString()} sqft</span>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-janpro-navy tracking-tight">
                        {quote.quotedMonthly
                          ? formatCurrency(quote.quotedMonthly)
                          : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">per month</p>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-janpro-navy group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block" />
                  </div>
                </div>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
