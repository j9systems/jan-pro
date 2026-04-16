"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useQuoteStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

export default function SignPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const sigRef = useRef<SignatureCanvas>(null);
  const { savedQuotes, currentQuote, loadQuote, updateQuote, saveQuote } =
    useQuoteStore();
  const [mounted, setMounted] = useState(false);
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    setMounted(true);
    if (!currentQuote || currentQuote.id !== id) {
      loadQuote(id);
    }
  }, [id, currentQuote, loadQuote]);

  if (!mounted) return null;

  const quote =
    currentQuote?.id === id
      ? currentQuote
      : savedQuotes.find((q) => q.id === id);

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

  const handleClear = () => {
    sigRef.current?.clear();
  };

  const handleConfirm = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      return;
    }
    const signatureData = sigRef.current.toDataURL("image/png");
    updateQuote({
      signatureData,
      signedDate: new Date().toISOString(),
      status: "signed",
    });
    saveQuote();
    router.push("/dashboard");
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="text-center mb-6">
        <div className="inline-block bg-janpro-navy text-white px-4 py-2 rounded mb-3">
          <span className="font-bold text-lg tracking-tight">JAN-PRO</span>
        </div>
        <h1 className="text-xl font-bold text-janpro-navy">
          Service Agreement
        </h1>
      </div>

      {/* Agreement Summary */}
      <Card className="mb-6">
        <CardContent className="p-6 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Company</span>
            <span className="font-medium">{quote.companyName || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Monthly Service Investment
            </span>
            <span className="font-bold text-lg text-janpro-navy">
              {formatCurrency(quote.quotedMonthly || quote.calculatedMonthly)}
            </span>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="startDate">Proposed Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="max-w-[200px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Signature Pad */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <Label className="mb-3 block">Client Signature</Label>
          <div className="border-2 border-dashed border-muted rounded-lg bg-white">
            <SignatureCanvas
              ref={sigRef}
              canvasProps={{
                className: "w-full",
                style: { width: "100%", height: "200px" },
              }}
              penColor="#003087"
            />
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          size="lg"
          className="bg-janpro-navy hover:bg-janpro-navy/90"
          onClick={handleConfirm}
        >
          Confirm Signature
        </Button>
      </div>
    </div>
  );
}
