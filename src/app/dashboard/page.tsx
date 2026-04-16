"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FileText, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuoteStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

function getStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="secondary">Draft</Badge>;
    case "presented":
      return <Badge className="bg-janpro-cyan text-white">Presented</Badge>;
    case "signed":
      return <Badge className="bg-green-600 text-white">Signed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const { savedQuotes, initNewQuote } = useQuoteStore();

  const handleNewQuote = () => {
    initNewQuote();
    router.push("/quotes/new");
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-janpro-navy">My Quotes</h1>
        <Button
          onClick={handleNewQuote}
          size="lg"
          className="bg-janpro-navy hover:bg-janpro-navy/90"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Quote
        </Button>
      </div>

      {savedQuotes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No quotes yet
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Create your first quote to get started.
            </p>
            <Button
              onClick={handleNewQuote}
              className="bg-janpro-navy hover:bg-janpro-navy/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Quote
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {savedQuotes
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .map((quote) => (
              <Link key={quote.id} href={`/quotes/${quote.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="flex items-center justify-between p-5">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-lg">
                          {quote.companyName || "Untitled Quote"}
                        </h3>
                        {getStatusBadge(quote.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(quote.updatedAt).toLocaleDateString()}
                        </span>
                        {quote.contactName && (
                          <span>{quote.contactName}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xl font-bold text-janpro-navy">
                        <DollarSign className="h-5 w-5" />
                        {quote.quotedMonthly
                          ? formatCurrency(quote.quotedMonthly).replace("$", "")
                          : "—"}
                      </div>
                      <span className="text-xs text-muted-foreground">per month</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
