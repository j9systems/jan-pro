import { createClient } from "./client";
import type { Quote, QuoteArea } from "../types";

// Lazy client — only created when first called at runtime, not at build time
function getSupabase() {
  return createClient();
}

// Convert camelCase Quote to snake_case DB row
function quoteToRow(quote: Quote, userId: string) {
  return {
    id: quote.id,
    user_id: userId,
    company_name: quote.companyName,
    contact_name: quote.contactName,
    contact_email: quote.contactEmail,
    contact_phone: quote.contactPhone,
    address: quote.address,
    city: quote.city,
    state: quote.state,
    facility_type: quote.facilityType,
    region: quote.region,
    num_employees: quote.numEmployees,
    num_floors: quote.numFloors,
    num_restrooms: quote.numRestrooms,
    num_stairwells: quote.numStairwells,
    num_elevators: quote.numElevators,
    condition_rating: quote.conditionRating,
    visits_per_week: quote.visitsPerWeek,
    new_construction: quote.newConstruction,
    initial_clean: quote.initialClean,
    special_equipment: quote.specialEquipment,
    restricted_clean: quote.restrictedClean,
    total_sqft: quote.totalSqft,
    facility_density: quote.facilityDensity,
    facility_density_tier: quote.facilityDensityTier,
    hours_per_visit: quote.hoursPerVisit,
    sutm_total: quote.sutmTotal,
    calculated_monthly: quote.calculatedMonthly,
    quoted_monthly: quote.quotedMonthly,
    notes: quote.notes,
    recording_transcript: quote.recordingTranscript,
    status: quote.status,
    signature_data: quote.signatureData || null,
    signed_date: quote.signedDate || null,
    porters: quote.porters,
    initial_clean_data: quote.initialCleanData,
    special_services: quote.specialServices,
  };
}

// Convert snake_case DB row to camelCase Quote
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToQuote(row: any, areas: QuoteArea[]): Quote {
  return {
    id: row.id,
    companyName: row.company_name,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    address: row.address,
    city: row.city,
    state: row.state,
    facilityType: row.facility_type,
    region: row.region,
    numEmployees: row.num_employees,
    numFloors: row.num_floors,
    numRestrooms: row.num_restrooms,
    numStairwells: row.num_stairwells,
    numElevators: row.num_elevators,
    conditionRating: row.condition_rating,
    visitsPerWeek: Number(row.visits_per_week),
    newConstruction: row.new_construction,
    initialClean: row.initial_clean,
    specialEquipment: row.special_equipment,
    restrictedClean: row.restricted_clean,
    areas,
    porters: row.porters || [],
    initialCleanData: row.initial_clean_data || {
      enabled: false, officesSqft: 0, machineScrubSqft: 0,
      showerCount: 0, blindCount: 0, sutmCount: 0,
      additionalServices: 0, totalCost: 0,
    },
    specialServices: row.special_services || [],
    totalSqft: row.total_sqft,
    facilityDensity: Number(row.facility_density),
    facilityDensityTier: row.facility_density_tier,
    hoursPerVisit: Number(row.hours_per_visit),
    sutmTotal: row.sutm_total,
    calculatedMonthly: Number(row.calculated_monthly),
    quotedMonthly: Number(row.quoted_monthly),
    notes: row.notes,
    recordingTranscript: row.recording_transcript,
    status: row.status,
    signatureData: row.signature_data,
    signedDate: row.signed_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function areaToRow(area: QuoteArea, quoteId: string) {
  return {
    id: area.id,
    quote_id: quoteId,
    sort_order: area.sortOrder,
    area_name: area.areaName,
    floor_type: area.floorType,
    floor_type_custom_label: area.floorTypeCustomLabel,
    area_type: area.areaType,
    length_ft: area.lengthFt,
    width_ft: area.widthFt,
    sqft: area.sqft,
    sqft_override: area.sqftOverride,
    quantity: area.quantity,
    sqft_total: area.sqftTotal,
    unit_items: area.unitItems,
    notes: area.notes,
    ai_flags: area.aiFlags,
    ai_generated: area.aiGenerated,
    ai_citations: area.aiCitations,
    mins_per_visit: area.minsPerVisit,
    cost_per_month: area.costPerMonth,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToArea(row: any): QuoteArea {
  return {
    id: row.id,
    sortOrder: row.sort_order,
    areaName: row.area_name,
    floorType: row.floor_type,
    floorTypeCustomLabel: row.floor_type_custom_label,
    areaType: row.area_type,
    lengthFt: Number(row.length_ft),
    widthFt: Number(row.width_ft),
    sqft: Number(row.sqft),
    sqftOverride: row.sqft_override,
    quantity: row.quantity,
    sqftTotal: Number(row.sqft_total),
    unitItems: row.unit_items || {},
    photos: [],  // loaded separately from storage
    videos: [],
    voiceMemos: [],
    notes: row.notes,
    aiFlags: row.ai_flags || [],
    aiGenerated: row.ai_generated || {},
    aiCitations: row.ai_citations || {},
    minsPerVisit: Number(row.mins_per_visit),
    costPerMonth: Number(row.cost_per_month),
  };
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser();
  return data.user?.id ?? null;
}

export async function fetchQuotes(): Promise<Quote[]> {
  const { data: rows, error } = await getSupabase()
    .from("quotes")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error || !rows) return [];

  // Fetch all areas for these quotes
  const quoteIds = rows.map((r) => r.id);
  const { data: areaRows } = await getSupabase()
    .from("areas")
    .select("*")
    .in("quote_id", quoteIds)
    .order("sort_order");

  const areasByQuote: Record<string, QuoteArea[]> = {};
  for (const row of areaRows || []) {
    const qid = row.quote_id;
    if (!areasByQuote[qid]) areasByQuote[qid] = [];
    areasByQuote[qid].push(rowToArea(row));
  }

  return rows.map((r) => rowToQuote(r, areasByQuote[r.id] || []));
}

export async function fetchQuote(id: string): Promise<Quote | null> {
  const { data: row, error } = await getSupabase()
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !row) return null;

  const { data: areaRows } = await getSupabase()
    .from("areas")
    .select("*")
    .eq("quote_id", id)
    .order("sort_order");

  const areas = (areaRows || []).map(rowToArea);
  return rowToQuote(row, areas);
}

export async function saveQuoteToDb(quote: Quote): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  // Upsert quote
  const { error: quoteError } = await getSupabase()
    .from("quotes")
    .upsert(quoteToRow(quote, userId));

  if (quoteError) {
    console.error("Save quote error:", quoteError);
    return false;
  }

  // Delete existing areas and re-insert (simplest for reordering)
  await getSupabase().from("areas").delete().eq("quote_id", quote.id);

  if (quote.areas.length > 0) {
    const areaRows = quote.areas.map((a) => areaToRow(a, quote.id));
    const { error: areasError } = await getSupabase().from("areas").insert(areaRows);
    if (areasError) {
      console.error("Save areas error:", areasError);
      return false;
    }
  }

  return true;
}

export async function deleteQuoteFromDb(id: string): Promise<boolean> {
  const { error } = await getSupabase().from("quotes").delete().eq("id", id);
  return !error;
}

// Photo upload to Supabase Storage
export async function uploadPhoto(
  file: File,
  userId: string,
  quoteId: string,
  areaId: string
): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${quoteId}/${areaId}/${Date.now()}.${ext}`;

  const { error } = await getSupabase().storage
    .from("area-media")
    .upload(path, file, { contentType: file.type });

  if (error) {
    console.error("Upload error:", error);
    return null;
  }

  return path;
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await getSupabase().storage
    .from("area-media")
    .createSignedUrl(path, 3600); // 1 hour

  if (error) return null;
  return data.signedUrl;
}

export async function deletePhoto(path: string): Promise<boolean> {
  const { error } = await getSupabase().storage
    .from("area-media")
    .remove([path]);
  return !error;
}
