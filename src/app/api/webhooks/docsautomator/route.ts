import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSecret } from "@/lib/docsautomator";
import { sendMail, isEmailConfigured } from "@/lib/email";

// DocsAutomator signing webhook. No user session — authenticated by shared
// secret (header x-webhook-secret or ?secret= query param), writes via the
// service-role client.
//
// Payload field names are normalized defensively below; confirm exact shape
// during Phase-0 discovery (see src/lib/docsautomator.ts).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pick(obj: any, keys: string[]): any {
  if (!obj || typeof obj !== "object") return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

export async function POST(request: Request) {
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const body = payload?.data && typeof payload.data === "object" ? payload.data : payload;
    const sessionId = pick(body, [
      "signingSessionId",
      "signing_session_id",
      "sessionId",
      "esignSessionId",
    ]);
    const docsautomatorDocId = pick(body, ["fileId", "file_id", "documentId", "docId", "id"]);
    const signedPdfUrl = pick(body, [
      "signedPdfUrl",
      "signed_pdf_url",
      "pdfUrl",
      "pdf_url",
      "url",
    ]);
    const eventStatus = String(
      pick(body, ["status", "event", "eventType", "type"]) ?? ""
    ).toLowerCase();
    const signerEmail = pick(body, ["signerEmail", "signer_email", "email"]);

    const supabase = createAdminClient();

    // Locate the document by signing session, falling back to the doc id.
    let query = supabase.from("documents").select("*").limit(1);
    if (sessionId) {
      query = query.eq("signing_session_id", sessionId);
    } else if (docsautomatorDocId) {
      query = query.eq("docsautomator_doc_id", docsautomatorDocId);
    } else {
      console.error("DocsAutomator webhook: no session/document identifier", payload);
      return NextResponse.json({ received: true });
    }
    const { data: docs } = await query;
    const doc = docs?.[0];
    if (!doc) {
      console.error("DocsAutomator webhook: document not found", { sessionId, docsautomatorDocId });
      return NextResponse.json({ received: true });
    }

    const now = new Date().toISOString();
    const isComplete =
      ["signed", "completed", "complete", "document.signed", "executed"].some((s) =>
        eventStatus.includes(s)
      ) || (!eventStatus && Boolean(signedPdfUrl));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = { updated_at: now };

    // Per-signer timestamps when the payload tells us who signed
    if (signerEmail && signerEmail === doc.signer1_email && !doc.signer1_signed_at) {
      updates.signer1_signed_at = now;
    }
    if (signerEmail && signerEmail === doc.signer2_email && !doc.signer2_signed_at) {
      updates.signer2_signed_at = now;
    }

    if (!isComplete) {
      if (Object.keys(updates).length > 1) {
        updates.status = "partially_signed";
        await supabase.from("documents").update(updates).eq("id", doc.id);
      }
      return NextResponse.json({ received: true });
    }

    // ── Fully executed ───────────────────────────────────────────────────────
    updates.status = "signed";
    updates.signed_at = now;
    updates.signer1_signed_at = doc.signer1_signed_at ?? now;
    updates.signer2_signed_at = doc.signer2_signed_at ?? now;
    if (signedPdfUrl) updates.signed_pdf_url = signedPdfUrl;

    // Archive the executed PDF in our own storage (DocsAutomator PDF links
    // can expire per the automation's pdfExpiration setting).
    if (signedPdfUrl) {
      try {
        const pdfRes = await fetch(signedPdfUrl);
        if (pdfRes.ok) {
          const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
          const storagePath = `${doc.quote_id}/${doc.id}-signed.pdf`;
          const { error: uploadError } = await supabase.storage
            .from("contracts")
            .upload(storagePath, pdfBuffer, {
              contentType: "application/pdf",
              upsert: true,
            });
          if (!uploadError) {
            updates.signed_pdf_storage_path = storagePath;
          } else {
            console.error("Signed PDF upload error:", uploadError);
          }
        }
      } catch (err) {
        console.error("Signed PDF download error:", err);
      }
    }

    await supabase.from("documents").update(updates).eq("id", doc.id);

    const { data: quoteRow } = await supabase
      .from("quotes")
      .select("id, company_name, status")
      .eq("id", doc.quote_id)
      .single();
    await supabase
      .from("quotes")
      .update({ status: "signed", signed_date: now, updated_at: now })
      .eq("id", doc.quote_id);

    // Notify the rep that created the contract ("James needs to know the
    // second it's executed" — June 4 call).
    if (isEmailConfigured() && doc.created_by) {
      const { data: repProfile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", doc.created_by)
        .single();
      const recipients = [repProfile?.email, process.env.SIGNED_CONTRACT_NOTIFY_EMAIL]
        .filter(Boolean) as string[];
      if (recipients.length > 0) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
        try {
          await sendMail({
            to: recipients,
            subject: `Contract signed — ${quoteRow?.company_name || "JAN-PRO quote"}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h2 style="color: #003087;">Contract fully executed</h2>
                <p>The service agreement for <strong>${
                  quoteRow?.company_name || "a quote"
                }</strong> has been signed by all parties.</p>
                ${
                  appUrl
                    ? `<p><a href="${appUrl}/quotes/${doc.quote_id}">View the quote in QuoteBuilder</a></p>`
                    : ""
                }
                ${
                  signedPdfUrl
                    ? `<p><a href="${signedPdfUrl}">Download the signed PDF</a></p>`
                    : ""
                }
              </div>
            `,
          });
        } catch (err) {
          console.error("Signed-contract notification error:", err);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Always acknowledge quickly; DocsAutomator retry behavior is unconfirmed.
    console.error("DocsAutomator webhook error:", error);
    return NextResponse.json({ received: true });
  }
}
