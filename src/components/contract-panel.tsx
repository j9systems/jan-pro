"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FileSignature,
  Loader2,
  ExternalLink,
  RefreshCw,
  FileCheck2,
  MailCheck,
} from "lucide-react";
import { fetchDocuments, getContractSignedUrl } from "@/lib/supabase/queries";
import type { Quote, QuoteDocument } from "@/lib/types";

const DOC_STATUS: Record<string, { label: string; badgeClass: string }> = {
  pending_review: {
    label: "Ready",
    badgeClass: "border-slate-300/50 bg-slate-100/80 text-slate-600",
  },
  sent: {
    label: "Emailed for signature",
    badgeClass: "border-amber-400/40 bg-amber-50 text-amber-600",
  },
  partially_signed: {
    label: "Partially signed",
    badgeClass: "border-amber-400/40 bg-amber-50 text-amber-600",
  },
  signed: {
    label: "Signed",
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  },
  voided: {
    label: "Voided",
    badgeClass: "border-red-300/50 bg-red-50 text-red-600",
  },
};

interface GeneratedDoc {
  documentId: string;
  pdfUrl: string | null;
}

export function ContractPanel({
  quote,
  onBeforeGenerate,
  onChanged,
}: {
  quote: Quote;
  onBeforeGenerate?: () => Promise<void>;
  onChanged?: () => void;
}) {
  const [documents, setDocuments] = useState<QuoteDocument[]>([]);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [startDate, setStartDate] = useState(quote.serviceStartDate || "");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedDoc | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    const docs = await fetchDocuments(quote.id);
    setDocuments(docs);
  }, [quote.id]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      if (onBeforeGenerate) await onBeforeGenerate();
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.id,
          serviceStartDate: startDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate contract");
      setGenerated(data);
      setStartDateOpen(false);
      setPreviewOpen(true);
      await loadDocuments();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate contract");
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenSignedPdf = async (doc: QuoteDocument) => {
    if (doc.signedPdfStoragePath) {
      const url = await getContractSignedUrl(doc.signedPdfStoragePath);
      if (url) {
        window.open(url, "_blank");
        return;
      }
    }
    if (doc.signedPdfUrl) window.open(doc.signedPdfUrl, "_blank");
  };

  const docStatusBadge = (status: string) => {
    const cfg = DOC_STATUS[status];
    if (!cfg) return <Badge variant="outline" className="text-xs">{status}</Badge>;
    return <Badge className={`text-xs ${cfg.badgeClass}`}>{cfg.label}</Badge>;
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            Contract &amp; Signature
          </CardTitle>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              setStartDate(quote.serviceStartDate || "");
              setError(null);
              setStartDateOpen(true);
            }}
          >
            <FileSignature className="h-4 w-4" />
            Generate Contract
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {error && !startDateOpen && !previewOpen && (
          <p className="text-sm text-red-600 mb-3">{error}</p>
        )}
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No contract generated yet. Generating the agreement emails it to the
            client for signature from your connected email.
          </p>
        ) : (
          <div className="border rounded-md divide-y">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium">
                    {doc.type === "contract" ? "Service Agreement" : "Bid Sheet"}
                  </span>
                  {docStatusBadge(doc.status)}
                  <span className="text-xs text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {doc.status === "signed" &&
                  (doc.signedPdfStoragePath || doc.signedPdfUrl) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => handleOpenSignedPdf(doc)}
                    >
                      <FileCheck2 className="h-3 w-3" />
                      Signed PDF
                    </Button>
                  ) : (
                    doc.pdfUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => window.open(doc.pdfUrl!, "_blank")}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Preview
                      </Button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Start date dialog — generation also emails the client, so confirm here */}
      <Dialog open={startDateOpen} onOpenChange={setStartDateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate &amp; Send Service Agreement</DialogTitle>
            <DialogDescription>
              This generates the agreement from the quote and emails it to the
              client{quote.contactEmail ? ` (${quote.contactEmail})` : ""} for
              signature, from your connected email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="service-start-date">Proposed Start Date</Label>
              <Input
                id="service-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStartDateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={generating} className="gap-2">
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSignature className="h-4 w-4" />
                )}
                {generating ? "Generating..." : "Generate & Send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview dialog — review the sent agreement */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MailCheck className="h-5 w-5 text-emerald-600" />
              Contract Sent
            </DialogTitle>
            <DialogDescription>
              The agreement has been emailed to the client for signature. Review
              the copy below; if anything is wrong, regenerate to resend a
              corrected version.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-muted/30">
            {generated?.pdfUrl ? (
              <iframe
                src={generated.pdfUrl}
                title="Contract preview"
                className="w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No preview available.
              </div>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setPreviewOpen(false);
                setStartDateOpen(true);
              }}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate &amp; Resend
            </Button>
            <div className="flex-1" />
            <Button onClick={() => setPreviewOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
