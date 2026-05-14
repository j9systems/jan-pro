export type FloorType =
  | "carpet"
  | "hard_floor_vct"
  | "hard_floor_tile"
  | "hard_floor_ceramic"
  | "hard_floor_wood"
  | "hard_floor_concrete"
  | "terrazzo"
  | "rubber"
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
  // calculated
  minsPerVisit: number;
  costPerMonth: number;
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
  | "silicon_valley_sf";

export type DensityTier = "low" | "medium" | "high";

export type QuoteStatus = "draft" | "presented" | "signed";

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
  notes: string;
  status: QuoteStatus;
  signatureData?: string;
  signedDate?: string;
  recordingTranscript: string;
  createdAt: string;
  updatedAt: string;
}
