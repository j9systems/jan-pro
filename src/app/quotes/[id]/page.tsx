"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Edit, Presentation, Share2, X, UserPlus, Loader2, FileText } from "lucide-react";
import { useQuoteStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { REGIONS, VISITS_PER_WEEK_OPTIONS, FLOOR_TYPES_V3, SPECIAL_SERVICES_CATALOG, QUOTE_STATUSES } from "@/lib/constants";
import { ContractPanel } from "@/components/contract-panel";
import { calculatePorterCost, calculateSpecialServiceCost } from "@/lib/calculator";
import {
  fetchEstimateShares,
  shareEstimate,
  removeEstimateShare,
  searchUsers,
} from "@/lib/supabase/queries";
import type { EstimateShare, UserProfile } from "@/lib/types";

function getStatusBadge(status: string) {
  const opt = QUOTE_STATUSES.find((o) => o.value === status);
  if (!opt) return <Badge variant="outline" className="text-sm">{status}</Badge>;
  return <Badge className={`text-sm ${opt.badgeClass}`}>{opt.label}</Badge>;
}

function StatusSelector({
  quoteId,
  currentStatus,
  onChanged,
}: {
  quoteId: string;
  currentStatus: string;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleChange = async (newStatus: string) => {
    setOpen(false);
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { error } = await supabase.rpc("update_quote_status", { qid: quoteId, new_status: newStatus });
      if (error) {
        console.error("Status update error:", error.message, error);
        alert(`Failed to update status: ${error.message}`);
      }
    } catch (err) {
      console.error("Status update exception:", err);
      alert("Failed to update status. Check console.");
    }
    onChanged();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button type="button" onClick={() => setOpen(!open)} className="cursor-pointer">
        {getStatusBadge(currentStatus)}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-44 rounded-xl border border-white/60 bg-white/95 backdrop-blur-xl shadow-glass-lg overflow-hidden animate-fadeIn z-50">
          {QUOTE_STATUSES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleChange(opt.value)}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${
                currentStatus === opt.value ? "bg-muted/30 font-medium" : ""
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${opt.dotClass}`} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ShareModal({
  quoteId,
  open,
  onOpenChange,
}: {
  quoteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [shares, setShares] = useState<(EstimateShare & { email?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetchEstimateShares(quoteId).then((data) => {
      if (!cancelled) {
        setShares(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [open, quoteId]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchUsers(query);
      // Filter out already-shared users
      const sharedIds = new Set(shares.map((s) => s.sharedWithUserId));
      setSearchResults(results.filter((u) => !sharedIds.has(u.id)));
      setSearching(false);
    }, 300);
  };

  const handleAdd = async (user: UserProfile) => {
    const success = await shareEstimate(quoteId, user.id, "view");
    if (success) {
      // Refresh shares
      const updated = await fetchEstimateShares(quoteId);
      setShares(updated);
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const handleRemove = async (shareId: string) => {
    const success = await removeEstimateShare(shareId);
    if (success) {
      setShares((prev) => prev.filter((s) => s.id !== shareId));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Quote
          </DialogTitle>
          <DialogDescription>
            Share this quote with other users in your organization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search users by email or name..."
              className="pr-8"
            />
            {searching && (
              <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{user.fullName || user.email}</p>
                    {user.fullName && (
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 h-7 gap-1 text-xs"
                    onClick={() => handleAdd(user)}
                  >
                    <UserPlus className="h-3 w-3" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Existing shares */}
          <div>
            <p className="text-sm font-medium mb-2">Shared with</p>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : shares.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Not shared with anyone yet.
              </p>
            ) : (
              <div className="border rounded-md divide-y">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <div>
                      <span>{share.email || share.sharedWithUserId}</span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {share.permission}
                      </Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(share.id)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { savedQuotes, loadQuote, loadQuotes, setStep } = useQuoteStore();
  const [mounted, setMounted] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadQuotes();
  }, [loadQuotes]);

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
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Back + Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard")}
          className="shrink-0 self-start"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold text-janpro-navy tracking-tight truncate">
              {quote.companyName || "Untitled Quote"}
            </h1>
            <StatusSelector
              quoteId={quote.id}
              currentStatus={quote.status}
              onChanged={() => loadQuotes()}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Created {new Date(quote.createdAt).toLocaleDateString()} &bull;
            Updated {new Date(quote.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={handleEdit} className="gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" onClick={() => setShareOpen(true)} className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/quotes/${id}/bid-sheet`)}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Bid Sheet
          </Button>
          <Button
            onClick={() => router.push(`/quotes/${id}/present`)}
            className="gap-2"
          >
            <Presentation className="h-4 w-4" />
            Present
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
        <Card className="lg:col-span-2 border-0 bg-gradient-to-br from-janpro-navy via-janpro-navy to-[#003a9e] text-white shadow-glass-xl overflow-hidden">
          <CardContent className="p-6 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,174,239,0.12),transparent_60%)]" />
            <div className="flex items-center justify-between mb-4 relative">
              <div>
                <p className="text-sm text-white/70">
                  Monthly Service Investment
                </p>
                <p className="text-4xl font-bold text-white">
                  {formatCurrency(
                    quote.quotedMonthly || quote.calculatedMonthly
                  )}
                </p>
                <p className="text-xs text-white/70 mt-1">per month</p>
              </div>
              <div className="text-right text-sm space-y-1 text-white/80">
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

        {/* Contract generation + e-signature (DocsAutomator) */}
        <ContractPanel quote={quote} />

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

      <ShareModal quoteId={id} open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}
