import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createDocument } from "@/lib/docsautomator";
import { loadContractContext } from "@/lib/contract-context";

// Generates the Services Agreement + SOW contract for a quote via DocsAutomator
// as a PREVIEW only and records it as a documents row in pending_review.
//
// IMPORTANT: this does NOT pass signers to DocsAutomator, so no signing session
// is created and the client is NOT emailed. The rep reviews the PDF first and
// then explicitly sends it via /api/documents/send. Generation does not change
// the quote status.
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quoteId, serviceStartDate } = await request.json();
    if (!quoteId) {
      return NextResponse.json({ error: "quoteId required" }, { status: 400 });
    }

    const ctx = await loadContractContext(
      supabase,
      user.id,
      user.email || "",
      quoteId,
      serviceStartDate
    );
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }
    const { payload, automationId } = ctx.context;

    // Preview render only — no signers, so DocsAutomator does not email anyone.
    const result = await createDocument({
      automationId,
      data: payload,
    });

    const { data: docRow, error: insertError } = await supabase
      .from("documents")
      .insert({
        quote_id: quoteId,
        type: "contract",
        automation_id: automationId,
        docsautomator_doc_id: result.docId,
        pdf_url: result.pdfUrl,
        google_doc_url: result.googleDocUrl,
        signer1_name: ctx.context.quote.contactName,
        signer1_email: ctx.context.quote.contactEmail,
        signer2_name: ctx.context.rep.name,
        signer2_email: ctx.context.rep.email,
        // Preview only — not yet sent to the client.
        status: "pending_review",
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError || !docRow) {
      console.error("Document insert error:", insertError);
      return NextResponse.json(
        { error: "Document generated but could not be saved." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      documentId: docRow.id,
      pdfUrl: result.pdfUrl,
    });
  } catch (error) {
    console.error("Generate document error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
