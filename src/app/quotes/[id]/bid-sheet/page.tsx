"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useQuoteStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import {
  FLOOR_TYPES_V3,
  REGIONS,
  VISITS_PER_WEEK_OPTIONS,
} from "@/lib/constants";
import {
  calculatePorterCost,
  calculateSpecialServiceCost,
} from "@/lib/calculator";
import { ArrowLeft, Download, Home, Send, Plus, X, Loader2 } from "lucide-react";

export default function BidSheetPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { savedQuotes, currentQuote, loadQuote, loadQuotes } = useQuoteStore();
  const [mounted, setMounted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emails, setEmails] = useState<string[]>([""]);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    loadQuotes();
  }, [loadQuotes]);

  useEffect(() => {
    if (mounted && (!currentQuote || currentQuote.id !== id)) {
      loadQuote(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, id]);

  if (!mounted) return null;

  const quote = currentQuote?.id === id ? currentQuote : savedQuotes.find((q) => q.id === id);
  if (!quote) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <p className="text-muted-foreground">Quote not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (!contentRef.current) return null;
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const canvas = await html2canvas(contentRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF("p", "mm", "a4");

    let position = 0;
    const pageHeight = 297; // A4 height in mm

    // Add pages as needed for long content
    while (position < imgHeight) {
      if (position > 0) pdf.addPage();
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.95),
        "JPEG", 0, -position, imgWidth, imgHeight
      );
      position += pageHeight;
    }

    return pdf.output("blob");
  };

  const handleDownloadPdf = async () => {
    setGenerating(true);
    const blob = await generatePdfBlob();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quote.companyName || "Quote"} - Bid Sheet.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setGenerating(false);
  };

  const handleSendEmail = async () => {
    const validEmails = emails.filter((e) => e.trim() && e.includes("@"));
    if (validEmails.length === 0) return;

    setSending(true);
    setSendResult(null);

    const blob = await generatePdfBlob();
    if (!blob) {
      setSendResult({ type: "error", message: "Failed to generate PDF." });
      setSending(false);
      return;
    }

    // Convert blob to base64
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve) => {
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]); // Remove data:application/pdf;base64, prefix
      };
      reader.readAsDataURL(blob);
    });

    try {
      const res = await fetch("/api/send-bid-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: validEmails,
          companyName: quote.companyName || "Quote",
          pdfBase64: base64,
        }),
      });

      if (res.ok) {
        setSendResult({ type: "success", message: `Bid sheet sent to ${validEmails.join(", ")}` });
        setEmails([""]);
      } else {
        const data = await res.json();
        setSendResult({ type: "error", message: data.error || "Failed to send email." });
      }
    } catch {
      setSendResult({ type: "error", message: "Failed to send email." });
    }
    setSending(false);
  };

  const regionLabel = REGIONS.find((r) => r.value === quote.region)?.label ?? quote.region;
  // visitsLabel available if needed
  // const visitsLabel = VISITS_PER_WEEK_OPTIONS.find((v) => v.value === quote.visitsPerWeek)?.label ?? `${quote.visitsPerWeek}x`;
  const getFloorLabel = (val: string) => FLOOR_TYPES_V3.find((f) => f.value === val)?.label ?? val;

  // Floor type rollup
  const floorBreakdown = new Map<string, number>();
  for (const area of quote.areas) {
    const key = area.floorType;
    floorBreakdown.set(key, (floorBreakdown.get(key) || 0) + area.sqftTotal);
  }

  const visitsLabel = VISITS_PER_WEEK_OPTIONS.find((v) => v.value === quote.visitsPerWeek)?.label ?? `${quote.visitsPerWeek}x`;

  const porterTotal = quote.porters.reduce((sum, p) => sum + calculatePorterCost(p), 0);
  const specialServicesTotal = quote.specialServices.reduce((sum, s) => sum + calculateSpecialServiceCost(s), 0);
  const monthlyTotal = quote.quotedMonthly || quote.calculatedMonthly;

  return (
    <div>
      {/* Print-hidden action bar */}
      <div className="print:hidden sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={generating} className="gap-2">
              <Download className="h-4 w-4" /> {generating ? "Generating..." : "Save PDF"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)} className="gap-2">
              <Send className="h-4 w-4" /> Email
            </Button>
            <Button size="sm" onClick={() => router.push("/dashboard")} className="gap-2">
              <Home className="h-4 w-4" /> Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      <Dialog open={emailOpen} onOpenChange={(v) => { setEmailOpen(v); if (!v) setSendResult(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-janpro-navy" />
              Email Bid Sheet
            </DialogTitle>
            <DialogDescription>
              Send the bid presentation as a PDF attachment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Recipients</Label>
              {emails.map((email, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      const updated = [...emails];
                      updated[i] = e.target.value;
                      setEmails(updated);
                    }}
                    placeholder="name@company.com"
                  />
                  {emails.length > 1 && (
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setEmails(emails.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setEmails([...emails, ""])}>
                <Plus className="h-3 w-3" /> Add recipient
              </Button>
            </div>

            {sendResult && (
              <div className={`text-sm p-3 rounded-lg ${
                sendResult.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {sendResult.message}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEmailOpen(false)}>Cancel</Button>
              <Button onClick={handleSendEmail} disabled={sending || emails.every((e) => !e.trim())} className="gap-2">
                {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : <><Send className="h-4 w-4" /> Send</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Printable content */}
      <div ref={contentRef} className="max-w-4xl mx-auto px-8 py-10 print:px-0 print:py-0 print:max-w-none">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-janpro-navy">
          <div>
            <h1 className="text-2xl font-bold text-janpro-navy tracking-tight">
              Prospective Client Bid Breakdown
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Prepared {new Date(quote.updatedAt).toLocaleDateString()} — {regionLabel}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-janpro-navy">JAN-PRO</p>
            <p className="text-xs text-muted-foreground">Franchise Development</p>
          </div>
        </div>

        {/* General Information */}
        <section className="mb-8" style={{ breakInside: "avoid" }}>
          <h2 className="text-lg font-bold text-janpro-navy mb-4 pb-1 border-b">
            General Information
          </h2>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-border/30">
              <span className="text-muted-foreground">Company</span>
              <span className="font-medium">{quote.companyName || "—"}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/30">
              <span className="text-muted-foreground">Contact</span>
              <span className="font-medium">{quote.contactName || "—"}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/30">
              <span className="text-muted-foreground">Type of Facility</span>
              <span className="font-medium">{quote.facilityType}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/30">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium">{[quote.address, quote.city, quote.state].filter(Boolean).join(", ") || "—"}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/30">
              <span className="text-muted-foreground">Est. Foot Traffic (per day)</span>
              <span className="font-medium">{quote.numEmployees}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/30">
              <span className="text-muted-foreground">Number of Floors</span>
              <span className="font-medium">{quote.numFloors}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/30">
              <span className="text-muted-foreground">Number of Restrooms</span>
              <span className="font-medium">{quote.numRestrooms}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/30">
              <span className="text-muted-foreground">Stairwells</span>
              <span className="font-medium">{quote.numStairwells}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/30">
              <span className="text-muted-foreground">Elevators</span>
              <span className="font-medium">{quote.numElevators}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/30">
              <span className="text-muted-foreground">Current Condition</span>
              <span className="font-medium">{quote.conditionRating} / 10</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/30">
              <span className="text-muted-foreground">Initial Clean</span>
              <span className="font-medium">{quote.initialCleanData.enabled ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/30">
              <span className="text-muted-foreground">Special Equipment Needed</span>
              <span className="font-medium">{quote.specialEquipment ? "Yes" : "No"}</span>
            </div>
          </div>
        </section>

        {/* Scope of Service — high-level only (no per-area or rate math) */}
        <section className="mb-8" style={{ breakInside: "avoid" }}>
          <h2 className="text-lg font-bold text-janpro-navy mb-4 pb-1 border-b">
            Scope of Service
          </h2>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm mb-5">
            <div className="flex justify-between py-1.5 border-b border-border/30">
              <span className="text-muted-foreground">Service Frequency</span>
              <span className="font-medium">{visitsLabel} per week</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/30">
              <span className="text-muted-foreground">Total Cleanable Sq. Ft.</span>
              <span className="font-medium">{quote.totalSqft.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/30">
              <span className="text-muted-foreground">Sanitary Units (SUTM)</span>
              <span className="font-medium">{quote.sutmTotal}</span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-janpro-navy/20 text-left">
                <th className="pb-2 font-semibold">Floor Type</th>
                <th className="pb-2 text-right font-semibold">Square Footage</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(floorBreakdown.entries()).map(([type, sqft]) => (
                <tr key={type} className="border-b border-border/30">
                  <td className="py-2">{getFloorLabel(type)}</td>
                  <td className="py-2 text-right tabular-nums">{sqft.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-janpro-navy/20 font-bold">
                <td className="py-2">Total</td>
                <td className="py-2 text-right">{quote.totalSqft.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Investment — the total amount and high-level add-ons only */}
        <section className="mb-8" style={{ breakInside: "avoid" }}>
          <h2 className="text-lg font-bold text-janpro-navy mb-4 pb-1 border-b">
            Investment
          </h2>
          <div className="bg-janpro-navy-light/20 rounded-lg p-6 space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold">Monthly Service Investment</span>
              <span className="text-2xl font-bold text-janpro-navy">{formatCurrency(monthlyTotal)}</span>
            </div>

            {quote.state === "CA" && quote.cpswpaEnabled && (
              <div className="flex justify-between pt-1">
                <span>CPSWPA Surcharge (CA)</span>
                <span className="font-medium">$7.00/mo</span>
              </div>
            )}

            {quote.premiumTreatmentEnabled && quote.premiumMonthly > 0 && (
              <div className="flex justify-between items-center pt-2 border-t border-border/30 mt-2">
                <span className="font-semibold">Premium Monthly (w/ EnviroShield)</span>
                <span className="text-xl font-bold text-janpro-navy">{formatCurrency(quote.premiumMonthly)}</span>
              </div>
            )}

            {quote.initialCleanData.enabled && quote.initialCleanData.totalCost > 0 && (
              <div className="flex justify-between pt-1">
                <span>Initial Clean (one-time)</span>
                <span className="font-medium">{formatCurrency(quote.initialCleanData.totalCost)}</span>
              </div>
            )}

            {porterTotal > 0 && (
              <div className="flex justify-between pt-1">
                <span>Day Porter Service</span>
                <span className="font-medium">{formatCurrency(porterTotal)}/mo</span>
              </div>
            )}

            {specialServicesTotal > 0 && (
              <div className="flex justify-between pt-1">
                <span>Special Services</span>
                <span className="font-medium">{formatCurrency(specialServicesTotal)}</span>
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <div className="text-center pt-6 border-t-2 border-janpro-navy/20 text-xs text-muted-foreground">
          <p>JAN-PRO Franchise Development — {regionLabel}</p>
          <p className="mt-1">Generated {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
