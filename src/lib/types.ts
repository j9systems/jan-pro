export interface QuoteArea {
  id: string;
  sortOrder: number;
  areaName: string;
  carpetSqft: number;
  vctSqft: number;
  tileSqft: number;
  ceramicSqft: number;
  woodSqft: number;
  concreteSqft: number;
  hardSurfaceOtherSqft: number;
  linoleumSqft: number;
  showerCount: number;
  blindCount: number;
  sutmCount: number;
  pictureFrames: number;
  // photos (base64)
  photos: string[];
  // voice note transcription
  notes: string;
  // calculated
  totalSqft: number;
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
  numAreas: number;
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
  createdAt: string;
  updatedAt: string;
}
