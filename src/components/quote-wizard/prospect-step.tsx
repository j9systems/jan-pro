"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuoteStore } from "@/lib/store";

export function ProspectStep() {
  const quote = useQuoteStore((s) => s.currentQuote);
  const updateQuote = useQuoteStore((s) => s.updateQuote);

  if (!quote) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-janpro-navy mb-1">
          Prospect Information
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter the prospect&apos;s contact and location details.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            value={quote.companyName}
            onChange={(e) => updateQuote({ companyName: e.target.value })}
            placeholder="Acme Corp"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactName">Contact Name</Label>
          <Input
            id="contactName"
            value={quote.contactName}
            onChange={(e) => updateQuote({ contactName: e.target.value })}
            placeholder="John Smith"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactEmail">Email</Label>
          <Input
            id="contactEmail"
            type="email"
            value={quote.contactEmail}
            onChange={(e) => updateQuote({ contactEmail: e.target.value })}
            placeholder="john@acme.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactPhone">Phone</Label>
          <Input
            id="contactPhone"
            type="tel"
            value={quote.contactPhone}
            onChange={(e) => updateQuote({ contactPhone: e.target.value })}
            placeholder="(555) 123-4567"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={quote.address}
            onChange={(e) => updateQuote({ address: e.target.value })}
            placeholder="123 Main St"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={quote.city}
            onChange={(e) => updateQuote({ city: e.target.value })}
            placeholder="Los Angeles"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={quote.state}
            onChange={(e) => updateQuote({ state: e.target.value })}
            placeholder="CA"
          />
        </div>
      </div>
    </div>
  );
}
