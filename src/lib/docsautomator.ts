import type { Quote, RegionRecord } from "./types";
import { formatCurrency } from "./utils";
import {
  AREA_TYPES,
  SPECIAL_SERVICES_CATALOG,
  REGIONS,
  VISITS_PER_WEEK_OPTIONS,
} from "./constants";
import { calculatePorterCost, calculateSpecialServiceCost } from "./calculator";

// ─── DocsAutomator REST integration (server-only) ───────────────────────────
//
// Every assumption about the DocsAutomator API lives in this file so that
// corrections after live discovery against the real workspace are one-file
// changes.
//
// Verified from public docs:
//   POST https://api.docsautomator.co/createDocument
//   Authorization: Bearer <workspace API key>   (Settings > Workspace > API)
//   Body: { docId: <automationId>, data: { ...placeholders, line_items_x: [...] } }
//   Response: PDF URL + Google Doc URL + file id. When the template contains
//   {{esign.signature_N}} / {{esign.date_N}} placeholders the response also
//   includes a signing session and per-signer signing links, and a webhook
//   fires with the signed PDF when all signers complete.
//
// TO CONFIRM in Phase-0 discovery against the live account (then update
// normalizeCreateDocumentResponse / the request body below):
//   * exact request field names for signer names/emails and sender selection
//     (per-rep connected Gmail sender — Scale plan)
//   * exact response field names for signing session id and signer links
//   * webhook registration mechanism and payload shape

const API_BASE = "https://api.docsautomator.co";

export interface DocSigner {
  name: string;
  email: string;
}

export interface CreateDocumentResult {
  docId: string | null;
  pdfUrl: string | null;
  googleDocUrl: string | null;
  signingSessionId: string | null;
  signerLinks: string[];
  raw: Record<string, unknown>;
}

interface CreateDocumentArgs {
  automationId: string;
  data: Record<string, unknown>;
  signers?: DocSigner[];
  /** Connected sender account (per-rep Gmail) the signature request is sent from. */
  senderEmail?: string;
}

function firstString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

// Normalize across plausible response field spellings until discovery pins
// down the exact contract.
export function normalizeCreateDocumentResponse(
  raw: Record<string, unknown>
): CreateDocumentResult {
  const nested = (raw.data && typeof raw.data === "object" ? raw.data : raw) as Record<
    string,
    unknown
  >;

  const signerLinks: string[] = [];
  const linkContainers = [nested.signerLinks, nested.signingLinks, nested.signers];
  for (const container of linkContainers) {
    if (Array.isArray(container)) {
      for (const entry of container) {
        if (typeof entry === "string") signerLinks.push(entry);
        else if (entry && typeof entry === "object") {
          const link = firstString(entry as Record<string, unknown>, [
            "signingLink",
            "signing_link",
            "link",
            "url",
          ]);
          if (link) signerLinks.push(link);
        }
      }
      if (signerLinks.length > 0) break;
    }
  }

  return {
    docId: firstString(nested, ["fileId", "file_id", "documentId", "docId", "id"]),
    pdfUrl: firstString(nested, ["pdfUrl", "pdf_url", "url"]),
    googleDocUrl: firstString(nested, ["googleDocUrl", "google_doc_url", "gdocUrl"]),
    signingSessionId: firstString(nested, [
      "signingSessionId",
      "signing_session_id",
      "sessionId",
      "esignSessionId",
    ]),
    signerLinks,
    raw,
  };
}

export async function createDocument({
  automationId,
  data,
  signers,
  senderEmail,
}: CreateDocumentArgs): Promise<CreateDocumentResult> {
  const apiKey = process.env.DOCSAUTOMATOR_API_KEY;
  if (!apiKey) {
    throw new Error("DOCSAUTOMATOR_API_KEY is not configured");
  }

  const body: Record<string, unknown> = { docId: automationId, data };
  if (signers && signers.length > 0) {
    // Signer N maps to the {{esign.*_N}} placeholders in the template.
    body.signers = signers.map((s, i) => ({
      name: s.name,
      email: s.email,
      order: i + 1,
    }));
  }
  if (senderEmail) {
    body.senderEmail = senderEmail;
  }

  const res = await fetch(`${API_BASE}/createDocument`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DocsAutomator createDocument failed (${res.status}): ${text}`);
  }

  const raw = (await res.json()) as Record<string, unknown>;
  return normalizeCreateDocumentResponse(raw);
}

export function verifyWebhookSecret(request: Request): boolean {
  const secret = process.env.DOCSAUTOMATOR_WEBHOOK_SECRET;
  if (!secret) return false;
  const url = new URL(request.url);
  const provided =
    request.headers.get("x-webhook-secret") ||
    request.headers.get("x-docsautomator-secret") ||
    url.searchParams.get("secret");
  return provided === secret;
}

// ─── Contract payload ────────────────────────────────────────────────────────
//
// Placeholder names below are the contract template's vocabulary. The Google
// Doc template (rebuilt from Corey's red-marked Services Agreement) must use
// exactly these {{placeholders}}.

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

function formatDate(value?: string): string {
  if (!value) return "";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", DATE_FORMAT);
}

// Short MM/DD/YY date in JanPro's (Pacific) timezone, e.g. "06/15/26".
function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export interface ContractPayloadOptions {
  serviceStartDate?: string;
  rep: { name: string; email: string };
}

export function buildContractPayload(
  quote: Quote,
  region: RegionRecord | null,
  { serviceStartDate, rep }: ContractPayloadOptions
): Record<string, unknown> {
  const regionLabel =
    REGIONS.find((r) => r.value === quote.region)?.label ?? quote.region;
  const visitsLabel =
    VISITS_PER_WEEK_OPTIONS.find((v) => v.value === quote.visitsPerWeek)?.label ??
    `${quote.visitsPerWeek}x`;
  const monthly = quote.quotedMonthly || quote.calculatedMonthly;

  const porterMonthly = quote.porters.reduce(
    (sum, p) => sum + calculatePorterCost(p),
    0
  );

  // Document title, e.g. "Jan-Pro Service Agreement - J9 Systems (06/15/26)".
  // Mapped to the automation's newDocumentNameField via {{document_title}}.
  const documentTitle = `Jan-Pro Service Agreement - ${
    quote.companyName || "Client"
  } (${formatShortDate(new Date())})`;

  return {
    // Region / operating entity (Corey's May 26 mapping, from regions table)
    operating_entity: region?.operatingEntity ?? "",
    franchise_development_name: region?.franchiseDevelopmentName ?? "",
    region_name: regionLabel,
    document_title: documentTitle,

    // Client
    company_name: quote.companyName,
    contact_name: quote.contactName,
    contact_email: quote.contactEmail,
    contact_phone: quote.contactPhone,
    billing_email: quote.contactEmail,
    service_address: [quote.address, quote.city, quote.state]
      .filter(Boolean)
      .join(", "),

    // Service terms
    monthly_price: formatCurrency(monthly),
    visits_per_week: visitsLabel,
    service_frequency: `${visitsLabel} per week`,
    service_start_date: formatDate(serviceStartDate ?? quote.serviceStartDate),
    agreement_date: formatDate(new Date().toISOString()),
    facility_type: quote.facilityType,
    total_sqft: quote.totalSqft.toLocaleString(),
    num_restrooms: String(quote.numRestrooms),
    // Not captured in the quote wizard yet — blank in the doc until JanPro
    // asks for a field (rep catches it in the mandatory preview).
    cleaning_time: "",
    // Per-region notice address isn't stored in the regions table yet.
    region_office_address: "",
    cpswpa_surcharge: quote.state === "CA" && quote.cpswpaEnabled ? "$7.00" : "",
    premium_monthly:
      quote.premiumTreatmentEnabled && quote.premiumMonthly > 0
        ? formatCurrency(quote.premiumMonthly)
        : "",
    initial_clean_cost: quote.initialCleanData.enabled
      ? formatCurrency(quote.initialCleanData.totalCost)
      : "",
    porter_monthly: porterMonthly > 0 ? formatCurrency(porterMonthly) : "",

    // Rep
    rep_name: rep.name,
    rep_email: rep.email,

    // Line items use DocsAutomator's numbered group convention.
    // line_items_1 = cleaning schedule (SOW). Prefer the per-area frozen
    // checklist (task-level rows); when an area has no checklist snapshot,
    // still emit one summary row so every area appears on the schedule.
    line_items_1: quote.areas.flatMap((area) => {
      const areaName = area.areaName || `Area ${area.sortOrder}`;
      const tasks = (area.frozenChecklist || []).filter(
        (item) => item.frequency !== "excluded"
      );
      if (tasks.length > 0) {
        return tasks.map((item) => ({
          area: areaName,
          task: item.task,
          frequency:
            item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1),
        }));
      }
      const v = area.visitsPerWeek ?? quote.visitsPerWeek;
      const freqLabel =
        VISITS_PER_WEEK_OPTIONS.find((o) => o.value === v)?.label ?? `${v}x`;
      const typeLabel =
        AREA_TYPES.find((t) => t.value === area.areaType)?.label ?? "Area";
      return [
        {
          area: areaName,
          task: `Standard ${typeLabel.toLowerCase()} cleaning per scope of work`,
          frequency: `${freqLabel} per week`,
        },
      ];
    }),
    // line_items_2 = additional / special services.
    line_items_2: quote.specialServices.map((s) => {
      const catalog = SPECIAL_SERVICES_CATALOG.find((c) => c.key === s.serviceType);
      return {
        service: catalog?.label ?? s.serviceType,
        quantity: `${s.sqftOrUnits} ${catalog?.unit ?? "units"}`,
        frequency: s.frequency,
        price: formatCurrency(calculateSpecialServiceCost(s)),
      };
    }),
  };
}
