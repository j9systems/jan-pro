import { createClient } from "./client";
import type {
  Quote,
  QuoteArea,
  ChecklistSnapshot,
  FacilityTypeRecord,
  AreaTemplate,
  ChecklistItem,
  AreaOverride,
  EstimateShare,
  RegionRecord,
  UserProfile,
} from "../types";

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
    region_id: quote.regionId || null,
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
    cpswpa_enabled: quote.cpswpaEnabled,
    premium_treatment_enabled: quote.premiumTreatmentEnabled,
    premium_monthly: quote.premiumMonthly,
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
    regionId: row.region_id ?? undefined,
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
    cpswpaEnabled: row.cpswpa_enabled ?? true,
    premiumTreatmentEnabled: row.premium_treatment_enabled ?? false,
    premiumMonthly: Number(row.premium_monthly ?? 0),
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
    visits_per_week: area.visitsPerWeek ?? null,
    production_rate_override: area.productionRateOverride ?? null,
    frozen_checklist: area.frozenChecklist,
    area_template_id: area.areaTemplateId ?? null,
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
    visitsPerWeek: row.visits_per_week ?? undefined,
    productionRateOverride: row.production_rate_override ?? undefined,
    frozenChecklist: (row.frozen_checklist as ChecklistSnapshot[]) || [],
    areaTemplateId: row.area_template_id ?? undefined,
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

  if (error) {
    console.error("fetchQuotes error:", error.message, error.code);
    return [];
  }
  if (!rows) return [];

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

// ─── Area Media (DB records) ─────────────────────────────────────────────────

export interface AreaMediaRecord {
  id: string;
  areaId: string;
  kind: "photo" | "video" | "voice";
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  recordedAt: string;
  signedUrl?: string;
}

export async function fetchAreaMedia(areaId: string): Promise<AreaMediaRecord[]> {
  const { data, error } = await getSupabase()
    .from("area_media")
    .select("*")
    .eq("area_id", areaId)
    .order("recorded_at", { ascending: true });

  if (error || !data) return [];

  // Generate signed URLs for each media item
  const records: AreaMediaRecord[] = [];
  for (const row of data) {
    const signedUrl = await getSignedUrl(row.storage_path);
    records.push({
      id: row.id,
      areaId: row.area_id,
      kind: row.kind,
      storagePath: row.storage_path,
      fileName: row.file_name,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      recordedAt: row.recorded_at,
      signedUrl: signedUrl ?? undefined,
    });
  }
  return records;
}

export async function createAreaMedia(
  areaId: string,
  kind: "photo" | "video" | "voice",
  storagePath: string,
  fileName: string,
  fileSize: number,
  mimeType: string
): Promise<AreaMediaRecord | null> {
  const { data, error } = await getSupabase()
    .from("area_media")
    .insert({
      area_id: areaId,
      kind,
      storage_path: storagePath,
      file_name: fileName,
      file_size: fileSize,
      mime_type: mimeType,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("createAreaMedia error:", error);
    return null;
  }

  const signedUrl = await getSignedUrl(storagePath);
  return {
    id: data.id,
    areaId: data.area_id,
    kind: data.kind,
    storagePath: data.storage_path,
    fileName: data.file_name,
    fileSize: data.file_size,
    mimeType: data.mime_type,
    recordedAt: data.recorded_at,
    signedUrl: signedUrl ?? undefined,
  };
}

export async function deleteAreaMedia(id: string, storagePath: string): Promise<boolean> {
  // Delete DB record first (this is the source of truth)
  const { error } = await getSupabase()
    .from("area_media")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("deleteAreaMedia DB error:", error);
    return false;
  }
  // Then delete from storage (best-effort — orphaned files are low cost)
  const storageDeleted = await deletePhoto(storagePath);
  if (!storageDeleted) {
    console.warn("Storage file not deleted (orphaned):", storagePath);
  }
  return true;
}

// ─── Facility Types ───────────────────────────────────────────────────────────

export async function fetchFacilityTypes(): Promise<FacilityTypeRecord[]> {
  const { data, error } = await getSupabase()
    .from("facility_types")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    isActive: row.is_active,
  }));
}

export async function createFacilityType(
  name: string,
  description?: string
): Promise<FacilityTypeRecord | null> {
  const { data, error } = await getSupabase()
    .from("facility_types")
    .insert({ name, description: description ?? null })
    .select()
    .single();

  if (error || !data) {
    console.error("Create facility type error:", error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description ?? null,
    isActive: data.is_active,
  };
}

export async function updateFacilityType(
  id: string,
  data: Partial<FacilityTypeRecord>
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: Record<string, any> = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.description !== undefined) row.description = data.description;
  if (data.isActive !== undefined) row.is_active = data.isActive;

  const { error } = await getSupabase()
    .from("facility_types")
    .update(row)
    .eq("id", id);

  if (error) {
    console.error("Update facility type error:", error);
    return false;
  }
  return true;
}

export async function deleteFacilityType(id: string): Promise<boolean> {
  // Soft delete: set is_active = false
  const { error } = await getSupabase()
    .from("facility_types")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("Delete facility type error:", error);
    return false;
  }
  return true;
}

// ─── Area Templates ───────────────────────────────────────────────────────────

export async function fetchAreaTemplates(facilityTypeId: string): Promise<AreaTemplate[]> {
  const { data, error } = await getSupabase()
    .from("area_templates")
    .select("*")
    .eq("facility_type_id", facilityTypeId)
    .eq("is_active", true)
    .order("display_order");

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    facilityTypeId: row.facility_type_id,
    name: row.name,
    displayOrder: row.display_order,
    defaultFloorType: row.default_floor_type ?? null,
    isActive: row.is_active,
  }));
}

export async function createAreaTemplate(
  facilityTypeId: string,
  name: string,
  displayOrder: number
): Promise<AreaTemplate | null> {
  const { data, error } = await getSupabase()
    .from("area_templates")
    .insert({ facility_type_id: facilityTypeId, name, display_order: displayOrder })
    .select()
    .single();

  if (error || !data) {
    console.error("Create area template error:", error);
    return null;
  }

  return {
    id: data.id,
    facilityTypeId: data.facility_type_id,
    name: data.name,
    displayOrder: data.display_order,
    defaultFloorType: data.default_floor_type ?? null,
    isActive: data.is_active,
  };
}

export async function updateAreaTemplate(
  id: string,
  data: Partial<AreaTemplate>
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: Record<string, any> = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.displayOrder !== undefined) row.display_order = data.displayOrder;
  if (data.defaultFloorType !== undefined) row.default_floor_type = data.defaultFloorType;
  if (data.isActive !== undefined) row.is_active = data.isActive;
  if (data.facilityTypeId !== undefined) row.facility_type_id = data.facilityTypeId;

  const { error } = await getSupabase()
    .from("area_templates")
    .update(row)
    .eq("id", id);

  if (error) {
    console.error("Update area template error:", error);
    return false;
  }
  return true;
}

export async function deleteAreaTemplate(id: string): Promise<boolean> {
  // Soft delete
  const { error } = await getSupabase()
    .from("area_templates")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("Delete area template error:", error);
    return false;
  }
  return true;
}

export async function reorderAreaTemplates(
  updates: { id: string; displayOrder: number }[]
): Promise<boolean> {
  const supabase = getSupabase();
  for (const update of updates) {
    const { error } = await supabase
      .from("area_templates")
      .update({ display_order: update.displayOrder })
      .eq("id", update.id);

    if (error) {
      console.error("Reorder area templates error:", error);
      return false;
    }
  }
  return true;
}

// ─── Checklist Items ──────────────────────────────────────────────────────────

export async function fetchChecklistItems(areaTemplateId: string): Promise<ChecklistItem[]> {
  const { data, error } = await getSupabase()
    .from("area_checklist_items")
    .select("*")
    .eq("area_template_id", areaTemplateId)
    .eq("is_active", true)
    .order("display_order");

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    areaTemplateId: row.area_template_id,
    task: row.task,
    defaultFrequency: row.default_frequency,
    displayOrder: row.display_order,
    isActive: row.is_active,
  }));
}

export async function createChecklistItem(
  areaTemplateId: string,
  task: string,
  frequency: string,
  displayOrder: number
): Promise<ChecklistItem | null> {
  const { data, error } = await getSupabase()
    .from("area_checklist_items")
    .insert({
      area_template_id: areaTemplateId,
      task,
      default_frequency: frequency,
      display_order: displayOrder,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Create checklist item error:", error);
    return null;
  }

  return {
    id: data.id,
    areaTemplateId: data.area_template_id,
    task: data.task,
    defaultFrequency: data.default_frequency,
    displayOrder: data.display_order,
    isActive: data.is_active,
  };
}

export async function updateChecklistItem(
  id: string,
  data: Partial<ChecklistItem>
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: Record<string, any> = {};
  if (data.task !== undefined) row.task = data.task;
  if (data.defaultFrequency !== undefined) row.default_frequency = data.defaultFrequency;
  if (data.displayOrder !== undefined) row.display_order = data.displayOrder;
  if (data.isActive !== undefined) row.is_active = data.isActive;
  if (data.areaTemplateId !== undefined) row.area_template_id = data.areaTemplateId;

  const { error } = await getSupabase()
    .from("area_checklist_items")
    .update(row)
    .eq("id", id);

  if (error) {
    console.error("Update checklist item error:", error);
    return false;
  }
  return true;
}

export async function deleteChecklistItem(id: string): Promise<boolean> {
  // Soft delete
  const { error } = await getSupabase()
    .from("area_checklist_items")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("Delete checklist item error:", error);
    return false;
  }
  return true;
}

// ─── Area Overrides ───────────────────────────────────────────────────────────

export async function fetchAreaOverrides(areaId: string): Promise<AreaOverride[]> {
  const { data, error } = await getSupabase()
    .from("estimate_area_overrides")
    .select("*")
    .eq("area_id", areaId);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    areaId: row.area_id,
    checklistItemId: row.checklist_item_id,
    overriddenFrequency: row.overridden_frequency,
  }));
}

export async function upsertAreaOverride(
  areaId: string,
  checklistItemId: string,
  frequency: string
): Promise<boolean> {
  const { error } = await getSupabase()
    .from("estimate_area_overrides")
    .upsert(
      {
        area_id: areaId,
        checklist_item_id: checklistItemId,
        overridden_frequency: frequency,
      },
      { onConflict: "area_id,checklist_item_id" }
    );

  if (error) {
    console.error("Upsert area override error:", error);
    return false;
  }
  return true;
}

export async function deleteAreaOverride(id: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from("estimate_area_overrides")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete area override error:", error);
    return false;
  }
  return true;
}

export async function resetAreaOverrides(areaId: string): Promise<boolean> {
  // Delete all overrides for an area
  const { error } = await getSupabase()
    .from("estimate_area_overrides")
    .delete()
    .eq("area_id", areaId);

  if (error) {
    console.error("Reset area overrides error:", error);
    return false;
  }
  return true;
}

// ─── Regions ──────────────────────────────────────────────────────────────────

export async function fetchRegions(): Promise<RegionRecord[]> {
  const { data, error } = await getSupabase()
    .from("regions")
    .select("*")
    .eq("is_active", true)
    .order("operating_entity");

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    key: row.key,
    operatingEntity: row.operating_entity,
    franchiseDevelopmentName: row.franchise_development_name,
    isActive: row.is_active,
  }));
}

// ─── Sharing ──────────────────────────────────────────────────────────────────

export async function fetchEstimateShares(
  quoteId: string
): Promise<(EstimateShare & { email?: string })[]> {
  const { data, error } = await getSupabase()
    .from("estimate_shares")
    .select("*, profiles:shared_with_user_id(email)")
    .eq("quote_id", quoteId);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    quoteId: row.quote_id,
    sharedWithUserId: row.shared_with_user_id,
    permission: row.permission,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    email: (row.profiles as any)?.email ?? undefined,
  }));
}

export async function shareEstimate(
  quoteId: string,
  userId: string,
  permission: string
): Promise<boolean> {
  const { error } = await getSupabase()
    .from("estimate_shares")
    .upsert(
      {
        quote_id: quoteId,
        shared_with_user_id: userId,
        permission,
      },
      { onConflict: "quote_id,shared_with_user_id" }
    );

  if (error) {
    console.error("Share estimate error:", error);
    return false;
  }
  return true;
}

export async function removeEstimateShare(id: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from("estimate_shares")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Remove estimate share error:", error);
    return false;
  }
  return true;
}

export async function searchUsers(query: string): Promise<UserProfile[]> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("*")
    .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(10);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name ?? null,
    role: row.role,
    defaultRegionId: row.default_region_id ?? null,
  }));
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function fetchUserProfile(): Promise<UserProfile | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await getSupabase()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name ?? null,
    role: data.role,
    defaultRegionId: data.default_region_id ?? null,
  };
}

export async function updateUserProfile(data: Partial<UserProfile>): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: Record<string, any> = {};
  if (data.fullName !== undefined) row.full_name = data.fullName;
  if (data.role !== undefined) row.role = data.role;
  if (data.defaultRegionId !== undefined) row.default_region_id = data.defaultRegionId;
  if (data.email !== undefined) row.email = data.email;

  const { error } = await getSupabase()
    .from("profiles")
    .update(row)
    .eq("id", userId);

  if (error) {
    console.error("Update user profile error:", error);
    return false;
  }
  return true;
}

// ─── Admin User Management ──────────────────────────────────────────────────

export interface AdminUserRecord {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  status: string;
  defaultRegionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function fetchAllUsers(): Promise<AdminUserRecord[]> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("fetchAllUsers error:", error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    status: row.status ?? "active",
    defaultRegionId: row.default_region_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function adminUpdateUser(
  userId: string,
  data: { role?: string; status?: string; fullName?: string; defaultRegionId?: string | null }
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: Record<string, any> = {};
  if (data.role !== undefined) row.role = data.role;
  if (data.status !== undefined) row.status = data.status;
  if (data.fullName !== undefined) row.full_name = data.fullName;
  if (data.defaultRegionId !== undefined) row.default_region_id = data.defaultRegionId;

  const { error } = await getSupabase()
    .from("profiles")
    .update(row)
    .eq("id", userId);

  if (error) {
    console.error("adminUpdateUser error:", error);
    return false;
  }
  return true;
}
