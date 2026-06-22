export type FloorType =
  | "carpet"
  | "tile"
  | "hard_floor_lvt_vinyl"
  | "composite_flooring"
  | "laminate"
  | "stained_concrete"
  | "polished_concrete"
  | "hardwood"
  | "other";

export type AreaType =
  | "office"
  | "conference_room"
  | "hallway_corridor"
  | "lobby_entry"
  | "restroom"
  | "classroom"
  | "medical_exam"
  | "production_plant"
  | "break_room_kitchen"
  | "stairwell"
  | "storage"
  | "common_area"
  | "other";

export interface AIFlag {
  id: string;
  type: "warning" | "info" | "success";
  message: string;
  detail: string;
}

export interface ChecklistSnapshot {
  itemId: string;
  task: string;
  frequency: "nightly" | "weekly" | "monthly" | "excluded";
}

export interface QuoteArea {
  id: string;
  sortOrder: number;
  areaName: string;
  floorType: FloorType;
  floorTypeCustomLabel: string;
  areaType: AreaType;
  lengthFt: number;
  widthFt: number;
  sqft: number;
  sqftOverride: boolean;
  quantity: number;
  sqftTotal: number;
  unitItems: Record<string, number>;
  photos: string[];
  videos: string[];
  voiceMemos: string[];
  notes: string;
  aiFlags: AIFlag[];
  aiGenerated: Record<string, boolean>;
  aiCitations: Record<string, string>;
  visitsPerWeek?: number;
  productionRateOverride?: number;
  frozenChecklist: ChecklistSnapshot[];
  areaTemplateId?: string;
  rateLevel: number; // 1-5, ISSA-anchored. 3 = midpoint (default)
  specialTasks: Array<{ id: string; name: string; minutes: number; rate: number }>;
  // calculated
  minsPerVisit: number;
  costPerMonth: number;
}

export interface FacilityTypeRecord {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface AreaTemplate {
  id: string;
  facilityTypeId: string;
  name: string;
  displayOrder: number;
  defaultFloorType: string | null;
  isActive: boolean;
}

export interface ChecklistItem {
  id: string;
  areaTemplateId: string;
  task: string;
  defaultFrequency: "nightly" | "weekly" | "monthly";
  displayOrder: number;
  isActive: boolean;
}

export interface AreaOverride {
  id: string;
  areaId: string;
  checklistItemId: string;
  overriddenFrequency: "nightly" | "weekly" | "monthly" | "excluded";
}

export interface EstimateShare {
  id: string;
  quoteId: string;
  sharedWithUserId: string;
  permission: "view" | "edit";
}

export interface RegionRecord {
  id: string;
  key: string;
  operatingEntity: string;
  franchiseDevelopmentName: string;
  isActive: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: "sales_rep" | "sales_manager" | "super_user";
  defaultRegionId: string | null;
}

export interface Porter {
  porterNumber: 1 | 2;
  hoursPerDay: number;
  daysPerWeek: number;
  costPerMonth: number;
}

export interface InitialClean {
  enabled: boolean;
  officesSqft: number;
  machineScrubSqft: number;
  showerCount: number;
  blindCount: number;
  sutmCount: number;
  additionalServices: number;
  totalCost: number;
}

export interface SpecialService {
  id: string;
  serviceType: string;
  sqftOrUnits: number;
  rate: number;
  costPerVisit: number;
  frequency: string;
  includedInMonthly: boolean;
}

export type Region =
  | "southern_california"
  | "los_angeles"
  | "greater_bay_area"
  | "silicon_valley_sf"
  | "silicon_valley"
  | "san_francisco"
  | "madrock";

export type DensityTier = "low" | "medium" | "high";

export type QuoteStatus =
  | "draft"
  | "presented"
  | "sent_for_signature"
  | "signed"
  | "lost";

export type DocumentType = "contract" | "bid_sheet";

export type DocumentStatus =
  | "pending_review"
  | "sent"
  | "partially_signed"
  | "signed"
  | "voided";

export interface QuoteDocument {
  id: string;
  quoteId: string;
  type: DocumentType;
  automationId: string;
  docsautomatorDocId: string | null;
  pdfUrl: string | null;
  googleDocUrl: string | null;
  signingSessionId: string | null;
  signer1Name: string | null;
  signer1Email: string | null;
  signer1Link: string | null;
  signer1SignedAt: string | null;
  signer2Name: string | null;
  signer2Email: string | null;
  signer2Link: string | null;
  signer2SignedAt: string | null;
  status: DocumentStatus;
  signedPdfUrl: string | null;
  signedPdfStoragePath: string | null;
  sentAt: string | null;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: string;
  // Prospect
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  state: string;
  // Facility
  facilityType: string;
  region: Region;
  regionId?: string;
  numEmployees: number;
  numFloors: number;
  numRestrooms: number;
  numStairwells: number;
  numElevators: number;
  conditionRating: number;
  visitsPerWeek: number;
  newConstruction: boolean;
  initialClean: boolean;
  specialEquipment: boolean;
  restrictedClean: boolean;
  cpswpaEnabled: boolean;
  premiumTreatmentEnabled: boolean;
  premiumMonthly: number;
  // Areas
  areas: QuoteArea[];
  // Add-ons
  porters: Porter[];
  initialCleanData: InitialClean;
  specialServices: SpecialService[];
  // Output
  totalSqft: number;
  facilityDensity: number;
  facilityDensityTier: DensityTier;
  hoursPerVisit: number;
  sutmTotal: number;
  calculatedMonthly: number;
  quotedMonthly: number;
  // Transient (not persisted): true once the user manually edits the quoted
  // amount, which stops it from auto-syncing to calculatedMonthly.
  quotedMonthlyManual?: boolean;
  notes: string;
  status: QuoteStatus;
  signatureData?: string;
  signedDate?: string;
  serviceStartDate?: string;
  recordingTranscript: string;
  createdAt: string;
  updatedAt: string;
}
