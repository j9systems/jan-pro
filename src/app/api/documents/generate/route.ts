import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { rowToQuote, rowToArea } from "@/lib/supabase/queries";
import { createDocument, buildContractPayload } from "@/lib/docsautomator";
import type { RegionRecord } from "@/lib/types";

// Derive a display name from an email local part, e.g.
// "carter.josephson@j9systems.com" -> "Carter Josephson".
function emailToName(email: string): string {
  const local = (email.split("@")[0] || "").trim();
  if (!local) return "";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

// Generates the Services Agreement + SOW contract for a quote via
// DocsAutomator and records it as a documents row in pending_review.
// Does NOT change quote status — the rep must preview before sending.
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

    const automationId = process.env.DOCSAUTOMATOR_AUTOMATION_ID_CONTRACT;
    if (!automationId || !process.env.DOCSAUTOMATOR_API_KEY) {
      return NextResponse.json(
        { error: "DocsAutomator is not configured. Set DOCSAUTOMATOR_API_KEY and DOCSAUTOMATOR_AUTOMATION_ID_CONTRACT." },
        { status: 500 }
      );
    }

    // RLS on the session client enforces the user can access this quote.
    const { data: quoteRow, error: quoteError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();
    if (quoteError || !quoteRow) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const { data: areaRows } = await supabase
      .from("areas")
      .select("*")
      .eq("quote_id", quoteId)
      .order("sort_order");
    const quote = rowToQuote(quoteRow, (areaRows || []).map(rowToArea));

    if (!quote.contactName || !quote.contactEmail) {
      return NextResponse.json(
        { error: "Quote needs a contact name and email before generating a contract." },
        { status: 400 }
      );
    }

    // Persist the start date on the quote (collected in the generate dialog)
    if (serviceStartDate) {
      await supabase
        .from("quotes")
        .update({ service_start_date: serviceStartDate })
        .eq("id", quoteId);
    }

    let region: RegionRecord | null = null;
    if (quote.regionId) {
      const { data: regionRow } = await supabase
        .from("regions")
        .select("*")
        .eq("id", quote.regionId)
        .single();
      if (regionRow) {
        region = {
          id: regionRow.id,
          key: regionRow.key,
          operatingEntity: regionRow.operating_entity,
          franchiseDevelopmentName: regionRow.franchise_development_name,
          isActive: regionRow.is_active,
        };
      }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();
    const repEmail = profile?.email || user.email || "";
    const rep = {
      // Prefer the profile's full name; otherwise derive a readable name from
      // the email so the contract/signer never shows a raw email as the name.
      name: profile?.full_name || emailToName(repEmail) || repEmail,
      email: repEmail,
    };

    const payload = buildContractPayload(quote, region, { serviceStartDate, rep });

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

    const { data: docRow, error: insertError } = await supabase
      .from("documents")
      .insert({
        quote_id: quoteId,
        type: "contract",
        automation_id: automationId,
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
        // DocsAutomator is in "Send via Email" mode: creating the document
        // emails the client the signing invitation immediately, so the
        // document is already out the door at generation time.
        status: "sent",
        sent_at: new Date().toISOString(),
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

    // Generation == sent (DocsAutomator emailed the client), so advance the
    // quote into the signature pipeline.
    const { error: statusError } = await supabase.rpc("update_quote_status", {
      qid: quoteId,
      new_status: "sent_for_signature",
    });
    if (statusError) {
      console.error("Quote status update error:", statusError.message);
    }

    return NextResponse.json({
      documentId: docRow.id,
      pdfUrl: result.pdfUrl,
      signer1Link: result.signerLinks[0] ?? null,
      signer2Link: result.signerLinks[1] ?? null,
    });
  } catch (error) {
    console.error("Generate document error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
