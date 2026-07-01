import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createDocument } from "@/lib/docsautomator";
import { loadContractContext } from "@/lib/contract-context";

// Sends a previously generated contract to the client for signature. This is
// the explicit, rep-approved follow-up to /api/documents/generate (which only
// renders a preview). Passing signers + senderEmail makes DocsAutomator create
// the signing session and email the client, so the document goes out the door
// only here — never at preview time.
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await request.json();
    if (!documentId) {
      return NextResponse.json({ error: "documentId required" }, { status: 400 });
    }

    // Load the preview document row (RLS enforces access via the quote).
    const { data: docRow, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();
    if (docError || !docRow) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    if (docRow.status !== "pending_review") {
      return NextResponse.json(
        { error: "This contract has already been sent." },
        { status: 409 }
      );
    }

    const ctx = await loadContractContext(
      supabase,
      user.id,
      user.email || "",
      docRow.quote_id
    );
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }
    const { quote, rep, payload, automationId } = ctx.context;

    // Signer 1 = client contact, Signer 2 = sales rep (per June 4 decision).
    // Signature email is sent from the rep's connected sender (Scale plan).
    const result = await createDocument({
      automationId,
      data: payload,
      signers: [
        { name: quote.contactName, email: quote.contactEmail },
        { name: rep.name, email: rep.email },
      ],
      senderEmail: rep.email,
    });

    const { error: updateError } = await supabase
      .from("documents")
      .update({
        docsautomator_doc_id: result.docId,
        pdf_url: result.pdfUrl,
        google_doc_url: result.googleDocUrl,
        signing_session_id: result.signingSessionId,
        signer1_name: quote.contactName,
        signer1_email: quote.contactEmail,
        signer1_link: result.signerLinks[0] ?? null,
        signer2_name: rep.name,
        signer2_email: rep.email,
        signer2_link: result.signerLinks[1] ?? null,
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    if (updateError) {
      console.error("Document update error:", updateError);
      return NextResponse.json(
        { error: "Contract sent but the record could not be updated." },
        { status: 500 }
      );
    }

    // Now that the client has been emailed, advance the quote into the
    // signature pipeline.
    const { error: statusError } = await supabase.rpc("update_quote_status", {
      qid: docRow.quote_id,
      new_status: "sent_for_signature",
    });
    if (statusError) {
      console.error("Quote status update error:", statusError.message);
    }

    return NextResponse.json({
      documentId,
      pdfUrl: result.pdfUrl,
      signer1Link: result.signerLinks[0] ?? null,
      signer2Link: result.signerLinks[1] ?? null,
    });
  } catch (error) {
    console.error("Send document error:", error);
    const message = error instanceof Error ? error.message : "Failed to send document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
