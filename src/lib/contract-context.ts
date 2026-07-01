import type { SupabaseClient } from "@supabase/supabase-js";
import { rowToQuote, rowToArea } from "./supabase/queries";
import { buildContractPayload } from "./docsautomator";
import type { Quote, RegionRecord } from "./types";

// Derive a display name from an email local part, e.g.
// "carter.josephson@j9systems.com" -> "Carter Josephson".
export function emailToName(email: string): string {
  const local = (email.split("@")[0] || "").trim();
  if (!local) return "";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export interface ContractContext {
  quote: Quote;
  region: RegionRecord | null;
  rep: { name: string; email: string };
  payload: Record<string, unknown>;
  automationId: string;
}

export type ContractContextResult =
  | { ok: true; context: ContractContext }
  | { ok: false; status: number; error: string };

// Shared loader for the contract preview ("generate") and "send" routes: pulls
// the quote + areas + region + rep profile and builds the DocsAutomator payload.
// Both routes must produce identical document content, so this lives in one place.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadContractContext(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  quoteId: string,
  serviceStartDate?: string
): Promise<ContractContextResult> {
  const automationId = process.env.DOCSAUTOMATOR_AUTOMATION_ID_CONTRACT;
  if (!automationId || !process.env.DOCSAUTOMATOR_API_KEY) {
    return {
      ok: false,
      status: 500,
      error:
        "DocsAutomator is not configured. Set DOCSAUTOMATOR_API_KEY and DOCSAUTOMATOR_AUTOMATION_ID_CONTRACT.",
    };
  }

  // RLS on the session client enforces the user can access this quote.
  const { data: quoteRow, error: quoteError } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .single();
  if (quoteError || !quoteRow) {
    return { ok: false, status: 404, error: "Quote not found" };
  }

  const { data: areaRows } = await supabase
    .from("areas")
    .select("*")
    .eq("quote_id", quoteId)
    .order("sort_order");
  const quote = rowToQuote(quoteRow, (areaRows || []).map(rowToArea));

  if (!quote.contactName || !quote.contactEmail) {
    return {
      ok: false,
      status: 400,
      error: "Quote needs a contact name and email before generating a contract.",
    };
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
    .eq("id", userId)
    .single();
  const repEmail = profile?.email || userEmail || "";
  const rep = {
    // Prefer the profile's full name; otherwise derive a readable name from
    // the email so the contract/signer never shows a raw email as the name.
    name: profile?.full_name || emailToName(repEmail) || repEmail,
    email: repEmail,
  };

  const payload = buildContractPayload(quote, region, { serviceStartDate, rep });

  return { ok: true, context: { quote, region, rep, payload, automationId } };
}
