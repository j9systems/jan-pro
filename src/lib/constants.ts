import type { FloorType, AreaType } from "./types";

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

// Floor rate lookup keyed by FloorType value
export const FLOOR_RATES_SQFT_PER_HR: Record<string, number> = {
  carpet: 2600,
  hard_floor_vct: 2500,
  hard_floor_tile: 2500,
  hard_floor_ceramic: 2500,
  hard_floor_wood: 2500,
  hard_floor_concrete: 2500,
  terrazzo: 2500,
  rubber: 2500,
  other: 2500,
};

export const UNIT_RATES_MINS_PER_UNIT: Record<string, number> = {
  toilets: 2.5,
  urinals: 2.5,
  mirrors: 1,
  sinks: 2,
  small_sudums: 2.5,
  large_sudums: 5,
  partitions: 1.5,
  blinds: 10,
  windows: 3,
  whiteboards: 2,
  picture_frames: 3,
  refrigerators: 10,
  microwaves: 5,
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

// --- V3 Floor Types ---

export const FLOOR_TYPES_V3: { value: FloorType; label: string }[] = [
  { value: "carpet", label: "Carpet" },
  { value: "hard_floor_vct", label: "Hard Floor — VCT" },
  { value: "hard_floor_tile", label: "Hard Floor — Tile" },
  { value: "hard_floor_ceramic", label: "Hard Floor — Ceramic" },
  { value: "hard_floor_wood", label: "Hard Floor — Wood" },
  { value: "hard_floor_concrete", label: "Hard Floor — Concrete" },
  { value: "terrazzo", label: "Terrazzo" },
  { value: "rubber", label: "Rubber" },
  { value: "other", label: "Other" },
];

// --- V3 Area Types ---

export const AREA_TYPES: { value: AreaType; label: string }[] = [
  { value: "office", label: "Office" },
  { value: "conference_room", label: "Conference Room" },
  { value: "hallway_corridor", label: "Hallway / Corridor" },
  { value: "lobby_entry", label: "Lobby / Entry" },
  { value: "restroom", label: "Restroom" },
  { value: "classroom", label: "Classroom" },
  { value: "medical_exam", label: "Medical Exam Room" },
  { value: "production_plant", label: "Production / Plant" },
  { value: "break_room_kitchen", label: "Break Room / Kitchen" },
  { value: "stairwell", label: "Stairwell" },
  { value: "storage", label: "Storage" },
  { value: "common_area", label: "Common Area" },
  { value: "other", label: "Other" },
];

// --- V3 Unit Items ---

export const ALL_UNIT_ITEMS: { key: string; label: string }[] = [
  { key: "toilets", label: "Toilets" },
  { key: "urinals", label: "Urinals" },
  { key: "mirrors", label: "Mirrors" },
  { key: "sinks", label: "Sinks" },
  { key: "small_sudums", label: "Small Sudums" },
  { key: "large_sudums", label: "Large Sudums (Bradley)" },
  { key: "partitions", label: "Partitions" },
  { key: "blinds", label: "Blinds" },
  { key: "windows", label: "Windows" },
  { key: "whiteboards", label: "Whiteboards" },
  { key: "picture_frames", label: "Picture Frames" },
  { key: "refrigerators", label: "Refrigerators" },
  { key: "microwaves", label: "Microwaves" },
];

export const UNIT_ITEMS_BY_AREA_TYPE: Record<AreaType, string[]> = {
  restroom: ["toilets", "urinals", "mirrors", "sinks", "small_sudums", "large_sudums", "partitions"],
  office: ["blinds", "windows", "whiteboards", "picture_frames"],
  conference_room: ["blinds", "windows", "whiteboards", "picture_frames"],
  classroom: ["blinds", "windows", "whiteboards", "picture_frames"],
  hallway_corridor: ["windows", "picture_frames"],
  lobby_entry: ["windows", "mirrors", "picture_frames"],
  medical_exam: ["sinks", "mirrors", "blinds", "windows"],
  production_plant: ["sinks"],
  break_room_kitchen: ["refrigerators", "microwaves", "sinks"],
  stairwell: [],
  storage: [],
  common_area: ["blinds", "windows", "picture_frames"],
  other: [],
};

// --- Existing ---

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
