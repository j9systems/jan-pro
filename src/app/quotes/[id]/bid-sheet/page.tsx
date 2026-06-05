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
  SPECIAL_SERVICES_CATALOG,
} from "@/lib/constants";
import {
  calculatePorterCost,
  calculateSpecialServiceCost,
  getEffectiveHourlyRate,
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

  // Calculate facility density
  const facilityDensity = quote.numEmployees > 0 ? Math.round(quote.totalSqft / quote.numEmployees) : 0;
  const densityLabel = facilityDensity < 200 ? "Low" : facilityDensity < 400 ? "Medium" : "High";

  const effectiveRate = getEffectiveHourlyRate(quote.visitsPerWeek);
  const hoursPerVisit = quote.hoursPerVisit;

  const porterTotal = quote.porters.reduce((sum, p) => sum + calculatePorterCost(p), 0);
  const specialServicesTotal = quote.specialServices.reduce((sum, s) => sum + calculateSpecialServiceCost(s), 0);

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

        {/* Bid Calculations */}
        <section className="mb-8" style={{ breakInside: "avoid" }}>
          <h2 className="text-lg font-bold text-janpro-navy mb-4 pb-1 border-b">
            Bid Calculations
          </h2>
          <div className="bg-janpro-navy-light/20 rounded-lg p-6 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-8">
              <div className="flex justify-between">
                <span>Total Square Feet</span>
                <span className="font-bold text-lg">{quote.totalSqft.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>SUTM Count</span>
                <span className="font-bold text-lg">{quote.sutmTotal}</span>
              </div>
            </div>

            <div className="border-t border-border/30 pt-3 mt-3 space-y-2">
              <div className="flex items-center justify-center gap-4 text-center font-mono">
                <div>
                  <p className="text-xs text-muted-foreground">Time/Visit</p>
                  <p className="text-lg font-bold">{hoursPerVisit.toFixed(2)} hrs</p>
                </div>
                <span className="text-xl text-muted-foreground">×</span>
                <div>
                  <p className="text-xs text-muted-foreground">Freq/Week</p>
                  <p className="text-lg font-bold">{quote.visitsPerWeek}</p>
                </div>
                <span className="text-xl text-muted-foreground">×</span>
                <div>
                  <p className="text-xs text-muted-foreground">Eff. Rate</p>
                  <p className="text-lg font-bold">{formatCurrency(effectiveRate)}/hr</p>
                </div>
                <span className="text-xl text-muted-foreground">×</span>
                <div>
                  <p className="text-xs text-muted-foreground">Weeks/Mo</p>
                  <p className="text-lg font-bold">4.33</p>
                </div>
              </div>
            </div>

            <div className="border-t-2 border-janpro-navy/20 pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold">Monthly Billing</span>
                <span className="text-2xl font-bold text-janpro-navy">
                  {formatCurrency(quote.calculatedMonthly)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                (Time per Visit × Frequency × Rate × Weeks/Month = Monthly Billing)
              </p>
            </div>

            {quote.quotedMonthly > 0 && quote.quotedMonthly !== quote.calculatedMonthly && (
              <div className="flex justify-between items-center pt-2">
                <span className="font-semibold">Quoted Monthly</span>
                <span className="text-2xl font-bold text-janpro-navy">
                  {formatCurrency(quote.quotedMonthly)}
                </span>
              </div>
            )}

            {quote.state === "CA" && quote.cpswpaEnabled && (
              <div className="flex justify-between text-sm pt-1">
                <span>CPSWPA Surcharge (CA)</span>
                <span className="font-medium">$7.00/mo</span>
              </div>
            )}

            {quote.premiumTreatmentEnabled && quote.premiumMonthly > 0 && (
              <div className="flex justify-between items-center pt-2">
                <span className="font-semibold">Premium Monthly (w/ Envira Shield)</span>
                <span className="text-xl font-bold text-janpro-navy">
                  {formatCurrency(quote.premiumMonthly)}
                </span>
              </div>
            )}

            {specialServicesTotal > 0 && (
              <div className="flex justify-between text-sm pt-1">
                <span>Proposed Special Services</span>
                <span className="font-medium">{formatCurrency(specialServicesTotal)}</span>
              </div>
            )}

            {quote.initialCleanData.enabled && quote.initialCleanData.totalCost > 0 && (
              <div className="flex justify-between text-sm pt-1">
                <span>Initial Clean</span>
                <span className="font-medium">{formatCurrency(quote.initialCleanData.totalCost)}</span>
              </div>
            )}

            {porterTotal > 0 && (
              <div className="flex justify-between text-sm pt-1">
                <span>Day Porter Service</span>
                <span className="font-medium">{formatCurrency(porterTotal)}/mo</span>
              </div>
            )}

            {quote.restrictedClean && (
              <div className="flex justify-between text-sm pt-1 text-amber-700">
                <span>Restricted Clean Uplift</span>
                <span className="font-medium">+20%</span>
              </div>
            )}
          </div>
        </section>

        {/* Flooring Breakdown */}
        <section className="mb-8" style={{ breakInside: "avoid" }}>
          <h2 className="text-lg font-bold text-janpro-navy mb-4 pb-1 border-b">
            Flooring Breakdown
          </h2>
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

        {/* Density Calculation */}
        <section className="mb-8" style={{ breakInside: "avoid" }}>
          <h2 className="text-lg font-bold text-janpro-navy mb-4 pb-1 border-b">
            Estimated Cleaning Rate Calculation
          </h2>
          <div className="text-sm space-y-2">
            <p>
              Total Sq. Ft. / Est. Foot Traffic = Facility Density
            </p>
            <p className="font-mono text-base">
              {quote.totalSqft.toLocaleString()} / {quote.numEmployees} = <span className="font-bold text-janpro-navy">{facilityDensity}</span>
            </p>
            <p className="text-muted-foreground text-xs">
              {densityLabel} rate (Low: 0-200, Medium: 200-399, High: 400+)
            </p>
          </div>
        </section>

        {/* Special Services Detail */}
        {quote.specialServices.length > 0 && (
          <section className="mb-8" style={{ breakInside: "avoid" }}>
            <h2 className="text-lg font-bold text-janpro-navy mb-4 pb-1 border-b">
              Special Services
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-janpro-navy/20 text-left">
                  <th className="pb-2 font-semibold">Service</th>
                  <th className="pb-2 text-right font-semibold">Units/Sqft</th>
                  <th className="pb-2 text-right font-semibold">Rate</th>
                  <th className="pb-2 text-right font-semibold">Frequency</th>
                  <th className="pb-2 text-right font-semibold">Cost</th>
                </tr>
              </thead>
              <tbody>
                {quote.specialServices.map((s) => {
                  const catalog = SPECIAL_SERVICES_CATALOG.find((c) => c.key === s.serviceType);
                  return (
                    <tr key={s.id} className="border-b border-border/30">
                      <td className="py-2">{catalog?.label ?? s.serviceType}</td>
                      <td className="py-2 text-right tabular-nums">{s.sqftOrUnits.toLocaleString()}</td>
                      <td className="py-2 text-right tabular-nums">${s.rate}</td>
                      <td className="py-2 text-right">{s.frequency}</td>
                      <td className="py-2 text-right tabular-nums font-medium">{formatCurrency(calculateSpecialServiceCost(s))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* Signature */}
        {quote.signatureData && (
          <section className="mb-8" style={{ breakInside: "avoid" }}>
            <h2 className="text-lg font-bold text-janpro-navy mb-4 pb-1 border-b">
              Client Signature
            </h2>
            <div className="flex items-end gap-8">
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={quote.signatureData} alt="Client signature" className="max-h-[80px] border-b border-janpro-navy/30 pb-1" />
                <p className="text-xs text-muted-foreground mt-1">
                  {quote.contactName} — {quote.signedDate ? new Date(quote.signedDate).toLocaleDateString() : ""}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="text-center pt-6 border-t-2 border-janpro-navy/20 text-xs text-muted-foreground">
          <p>JAN-PRO Franchise Development — {regionLabel}</p>
          <p className="mt-1">Generated {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
