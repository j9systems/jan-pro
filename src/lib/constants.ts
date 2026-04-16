export const HOURLY_RATE = 31;
export const INITIAL_CLEAN_RATE = 50;
export const PORTER_RATE = 30;
export const WEEKS_PER_MONTH = 4.33;

export const FREQUENCY_HOURLY_RATES: Record<number, number> = {
  0.25: 31,
  0.5: 31,
  1: 30,
  2: 29,
  3: 27,
  4: 26,
  5: 25,
  6: 25,
  7: 25,
};

export const REGIONAL_MONTHLY_MINIMUMS: Record<string, Record<number, number>> = {
  southern_california: { 1: 350, 2: 395, 3: 475, 4: 550, 5: 649 },
  los_angeles: { 1: 295, 2: 375, 3: 475, 4: 575, 5: 675 },
  greater_bay_area: { 1: 300, 2: 400, 3: 525, 4: 650, 5: 800, 6: 950, 7: 1100 },
  silicon_valley_sf: { 1: 285, 2: 380, 3: 575 },
};

export const CARPET_RUN_RATES: Record<number, { lo: number; hi: number }> = {
  1: { lo: 2000, hi: 2600 },
  2: { lo: 2000, hi: 2600 },
  3: { lo: 2000, hi: 2800 },
  4: { lo: 2200, hi: 3000 },
  5: { lo: 3000, hi: 3800 },
  6: { lo: 3600, hi: 4200 },
  7: { lo: 3600, hi: 4200 },
};

export const FLOOR_RATES_SQFT_PER_HR: Record<string, number> = {
  carpet: 2600,
  vct: 2500,
  tile: 2500,
  ceramic: 2500,
  wood: 2500,
  concrete: 2500,
  hard_surface_other: 2500,
  linoleum: 3500,
};

export const UNIT_RATES_MINS_PER_UNIT: Record<string, number> = {
  shower: 10,
  blind: 10,
  sutm: 2.5,
  picture_frame: 3,
};

export const INITIAL_CLEAN_RATES: Record<string, number> = {
  offices: 500,
  machine_scrub: 500,
  shower: 120,
  blind: 60,
  sutm: 5,
};

export const SPECIAL_SERVICE_RATES: Record<string, number> = {
  sniper: 0.12,
  endure: 0.25,
  bonnet: 0.12,
  extraction: 0.22,
  scotchgard: 0.5,
  strip_refinish: 0.5,
  spray_buff: 0.15,
  scrub_recoat: 0.25,
  window_pane: 7.5,
  fridge_interior: 25,
  grout_light: 0.52,
  grout_heavy: 0.81,
};

export const FACILITY_TYPES = [
  "Office",
  "Medical/Healthcare",
  "Industrial",
  "Retail",
  "School/Education",
  "Gym/Fitness",
  "Other",
] as const;

export const REGIONS: { value: string; label: string }[] = [
  { value: "southern_california", label: "Southern California" },
  { value: "los_angeles", label: "Los Angeles" },
  { value: "greater_bay_area", label: "Greater Bay Area" },
  { value: "silicon_valley_sf", label: "Silicon Valley/SF" },
];

export const VISITS_PER_WEEK_OPTIONS: { value: number; label: string }[] = [
  { value: 0.5, label: "2x/month" },
  { value: 1, label: "1x" },
  { value: 2, label: "2x" },
  { value: 3, label: "3x" },
  { value: 4, label: "4x" },
  { value: 5, label: "5x" },
  { value: 6, label: "6x" },
  { value: 7, label: "7x" },
];

export const SPECIAL_SERVICES_CATALOG = [
  { key: "bonnet", label: "Bonnet Clean", category: "Carpet", unit: "sqft" },
  { key: "extraction", label: "Extraction", category: "Carpet", unit: "sqft" },
  { key: "scotchgard", label: "ScotchGard", category: "Carpet", unit: "sqft" },
  { key: "strip_refinish", label: "Strip & Refinish", category: "Hard Surface", unit: "sqft" },
  { key: "spray_buff", label: "Spray Buff", category: "Hard Surface", unit: "sqft" },
  { key: "scrub_recoat", label: "Top Scrub & Recoat", category: "Hard Surface", unit: "sqft" },
  { key: "window_pane", label: "Window Panes (Inside/Outside)", category: "Windows", unit: "panes" },
  { key: "fridge_interior", label: "Refrigerator Interior", category: "Other", unit: "units" },
  { key: "sniper", label: "Sniper Treatment", category: "EnviroShield", unit: "sqft" },
  { key: "endure", label: "Endure Treatment", category: "EnviroShield", unit: "sqft" },
  { key: "grout_light", label: "Grout Cleaning (Light)", category: "Grout", unit: "sqft" },
  { key: "grout_heavy", label: "Grout Cleaning (Heavy)", category: "Grout", unit: "sqft" },
] as const;

export const FREQUENCY_OPTIONS = [
  "Monthly",
  "Quarterly",
  "Semi-Annually",
  "Annually",
  "As Needed",
] as const;
