import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { sendMail, isEmailConfigured } from "@/lib/email";

// Moves a reviewed contract into the signing phase.
//  mode "sign_now": on-site signing — returns the signer links to open on the
//                   rep's device (client signs first, then the rep).
//  mode "email":    emails the client their signing link.
// Both modes mark the document sent and the quote sent_for_signature.
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId, mode, recipientEmail } = await request.json();
    if (!documentId || !["sign_now", "email"].includes(mode)) {
      return NextResponse.json(
        { error: "documentId and mode ('sign_now' | 'email') required" },
        { status: 400 }
      );
    }

    // RLS scopes this to documents on quotes the user can access.
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();
    if (docError || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    if (doc.status === "signed" || doc.status === "voided") {
      return NextResponse.json(
        { error: `Document is already ${doc.status}.` },
        { status: 400 }
      );
    }

    const { data: quoteRow } = await supabase
      .from("quotes")
      .select("id, company_name")
      .eq("id", doc.quote_id)
      .single();

    if (mode === "email") {
      if (!doc.signer1_link) {
        return NextResponse.json(
          { error: "No signing link available for this document. Regenerate the contract." },
          { status: 400 }
        );
      }
      if (!isEmailConfigured()) {
        return NextResponse.json(
          { error: "Email service not configured. Please set SMTP environment variables." },
          { status: 500 }
        );
      }
      const to = recipientEmail || doc.signer1_email;
      await sendMail({
        to: [to],
        subject: `Service Agreement — ${quoteRow?.company_name || "JAN-PRO Commercial Cleaning"}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2 style="color: #003087;">JAN-PRO Franchise Development</h2>
            <p>Hi ${doc.signer1_name || ""},</p>
            <p>Your commercial cleaning service agreement${
              quoteRow?.company_name ? ` for <strong>${quoteRow.company_name}</strong>` : ""
            } is ready for signature.</p>
            <p style="margin: 24px 0;">
              <a href="${doc.signer1_link}"
                 style="background: #003087; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Review &amp; Sign Agreement
              </a>
            </p>
            <p>If the button doesn't work, copy this link into your browser:<br/>
              <a href="${doc.signer1_link}">${doc.signer1_link}</a>
            </p>
            <br />
            <p style="color: #666; font-size: 12px;">
              This email was sent from the JAN-PRO QuoteBuilder system by ${user.email}.
            </p>
          </div>
        `,
      });
    }

    const { error: updateError } = await supabase
      .from("documents")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(mode === "email" && recipientEmail ? { signer1_email: recipientEmail } : {}),
      })
      .eq("id", documentId);
    if (updateError) {
      console.error("Document update error:", updateError);
      return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
    }

    const { error: statusError } = await supabase.rpc("update_quote_status", {
      qid: doc.quote_id,
      new_status: "sent_for_signature",
    });
    if (statusError) {
      // Don't fail the request — the document is out; status is cosmetic here.
      console.error("Quote status update error:", statusError.message);
    }

    return NextResponse.json({
      success: true,
      signer1Link: doc.signer1_link,
      signer2Link: doc.signer2_link,
    });
  } catch (error) {
    console.error("Send document error:", error);
    const message = error instanceof Error ? error.message : "Failed to send document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
