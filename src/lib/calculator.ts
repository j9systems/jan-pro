import {
  FREQUENCY_HOURLY_RATES,
  CARPET_RUN_RATES,
  FLOOR_RATES_SQFT_PER_HR,
  UNIT_RATES_MINS_PER_UNIT,
  INITIAL_CLEAN_RATE,
  INITIAL_CLEAN_RATES,
  PORTER_RATE,
  WEEKS_PER_MONTH,
  REGIONAL_MONTHLY_MINIMUMS,
  SPECIAL_SERVICE_RATES,
  CPSWPA_SURCHARGE,
  PREMIUM_RATE_PER_SQFT,
  ISSA_RATE_LEVELS,
} from "./constants";
import type { Quote, QuoteArea, InitialClean, Porter, SpecialService, DensityTier } from "./types";

export function calculateFacilityDensity(totalSqft: number, numEmployees: number): number {
  if (numEmployees === 0) return 0;
  return totalSqft / numEmployees;
}

export function getDensityTier(density: number): DensityTier {
  if (density < 200) return "low";
  if (density < 400) return "medium";
  return "high";
}

export function getEffectiveHourlyRate(visitsPerWeek: number): number {
  return FREQUENCY_HOURLY_RATES[visitsPerWeek] ?? 31;
}

export function getCarpetRate(
  visitsPerWeek: number,
  densityTier: DensityTier
): number {
  const rates = CARPET_RUN_RATES[Math.max(1, Math.round(visitsPerWeek))] ?? CARPET_RUN_RATES[1];
  if (densityTier === "low") return rates.hi;
  if (densityTier === "high") return rates.lo;
  return (rates.lo + rates.hi) / 2;
}

// Get the effective production rate for an area, considering:
// 1. Manual override (productionRateOverride) — highest priority
// 2. ISSA level-based rate (rateLevel 1-5) — second priority
// 3. Default floor type rate — fallback
export function getEffectiveProductionRate(area: QuoteArea): number {
  if (area.productionRateOverride && area.productionRateOverride > 0) {
    return area.productionRateOverride;
  }
  const levels = ISSA_RATE_LEVELS[area.floorType];
  if (levels && area.rateLevel >= 1 && area.rateLevel <= 5) {
    return levels[area.rateLevel - 1]; // 0-indexed
  }
  return FLOOR_RATES_SQFT_PER_HR[area.floorType] ?? 2500;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function calculateAreaMinsPerVisit(area: QuoteArea, visitsPerWeek: number, densityTier: DensityTier): number {
  let mins = 0;
  const totalSqft = area.sqftTotal;

  if (totalSqft > 0) {
    const rate = getEffectiveProductionRate(area);
    mins += (totalSqft / rate) * 60;
  }

  // Unit-based items from flexible record
  for (const [itemKey, count] of Object.entries(area.unitItems)) {
    if (count > 0) {
      const minsPerUnit = UNIT_RATES_MINS_PER_UNIT[itemKey] ?? 2.5;
      mins += count * minsPerUnit;
    }
  }

  // Special tasks — additional time per area
  if (area.specialTasks) {
    for (const task of area.specialTasks) {
      if (task.minutes > 0) {
        mins += task.minutes;
      }
    }
  }

  return mins;
}

// Calculate cost including special tasks with their own rates
export function calculateAreaCostWithSpecialTasks(
  area: QuoteArea,
  minsPerVisit: number,
  visitsPerWeek: number,
  hourlyRate: number
): number {
  // Base cost from floor + unit items (use the standard mins minus special task mins)
  const specialTaskMins = (area.specialTasks || []).reduce((sum, t) => sum + (t.minutes || 0), 0);
  const baseMins = minsPerVisit - specialTaskMins;
  const baseCost = (baseMins / 60) * visitsPerWeek * hourlyRate * WEEKS_PER_MONTH;

  // Special tasks at their own rates
  let specialCost = 0;
  for (const task of area.specialTasks || []) {
    if (task.minutes > 0 && task.rate > 0) {
      specialCost += (task.minutes / 60) * task.rate * visitsPerWeek * WEEKS_PER_MONTH;
    }
  }

  return baseCost + specialCost;
}

export function calculateAreaCostPerMonth(
  minsPerVisit: number,
  visitsPerWeek: number,
  hourlyRate: number
): number {
  const hours = minsPerVisit / 60;
  const weekly = hours * visitsPerWeek * hourlyRate;
  return weekly * WEEKS_PER_MONTH;
}

export function calculateInitialClean(data: InitialClean): number {
  if (!data.enabled) return 0;

  let totalHours = 0;

  if (data.officesSqft > 0) {
    totalHours += data.officesSqft / INITIAL_CLEAN_RATES.offices;
  }
  if (data.machineScrubSqft > 0) {
    totalHours += data.machineScrubSqft / INITIAL_CLEAN_RATES.machine_scrub;
  }
  if (data.showerCount > 0) {
    totalHours += data.showerCount * (10 / 60);
  }
  if (data.blindCount > 0) {
    totalHours += data.blindCount * (10 / 60);
  }
  if (data.sutmCount > 0) {
    totalHours += data.sutmCount * (2.5 / 60);
  }

  return totalHours * INITIAL_CLEAN_RATE + data.additionalServices;
}

export function calculatePorterCost(porter: Porter): number {
  return porter.hoursPerDay * porter.daysPerWeek * WEEKS_PER_MONTH * PORTER_RATE;
}

export function calculateSpecialServiceCost(service: SpecialService): number {
  return service.sqftOrUnits * (SPECIAL_SERVICE_RATES[service.serviceType] ?? service.rate ?? 0);
}

export function getRegionalMinimum(region: string, visitsPerWeek: number): number {
  const regionMins = REGIONAL_MONTHLY_MINIMUMS[region];
  if (!regionMins) return 0;

  const lookupKey = visitsPerWeek < 1 ? 1 : Math.round(visitsPerWeek);
  return regionMins[lookupKey] ?? 0;
}

export function calculateQuote(quote: Quote): Partial<Quote> {
  // Compute sqftTotal for each area
  const updatedAreas = quote.areas.map((area) => {
    const sqft = area.sqftOverride ? area.sqft : (area.lengthFt * area.widthFt || area.sqft);
    const sqftTotal = sqft * (area.quantity || 1);
    return { ...area, sqft, sqftTotal };
  });

  const totalSqft = updatedAreas.reduce((sum, a) => sum + a.sqftTotal, 0);
  const facilityDensity = calculateFacilityDensity(totalSqft, quote.numEmployees);
  const facilityDensityTier = getDensityTier(facilityDensity);

  // Calculate each area's mins and cost using per-area visitsPerWeek if set
  const areasWithCalcs = updatedAreas.map((area) => {
    const areaVisitsPerWeek = area.visitsPerWeek ?? quote.visitsPerWeek;
    const minsPerVisit = calculateAreaMinsPerVisit(area, areaVisitsPerWeek, facilityDensityTier);
    const areaHourlyRate = getEffectiveHourlyRate(areaVisitsPerWeek);
    const costPerMonth = area.specialTasks?.length > 0
      ? calculateAreaCostWithSpecialTasks(area, minsPerVisit, areaVisitsPerWeek, areaHourlyRate)
      : calculateAreaCostPerMonth(minsPerVisit, areaVisitsPerWeek, areaHourlyRate);
    return { ...area, minsPerVisit, costPerMonth };
  });

  const totalMinsPerVisit = areasWithCalcs.reduce((sum, a) => sum + a.minsPerVisit, 0);
  const hoursPerVisit = totalMinsPerVisit / 60;

  // Sum all unit items named "small_sutm" or "large_sutm" or "toilets" etc. for SUTM total
  const sutmTotal = areasWithCalcs.reduce((sum, a) => {
    return sum + (a.unitItems.small_sutm || 0) + (a.unitItems.large_sutm || 0);
  }, 0);

  // Subtotal from areas
  const subtotalMonthly = areasWithCalcs.reduce((sum, a) => sum + a.costPerMonth, 0);

  // Porter costs
  const porterTotal = quote.porters.reduce(
    (sum, p) => sum + calculatePorterCost(p),
    0
  );

  // Special services included in monthly
  const specialServicesMonthly = quote.specialServices
    .filter((s) => s.includedInMonthly)
    .reduce((sum, s) => sum + calculateSpecialServiceCost(s), 0);

  // Initial clean
  const initialCleanTotal = calculateInitialClean(quote.initialCleanData);

  // Calculated monthly
  let calculatedMonthly = subtotalMonthly + porterTotal + specialServicesMonthly;

  // Apply 20% uplift for restricted clean
  if (quote.restrictedClean) {
    calculatedMonthly *= 1.2;
  }

  // Enforce regional minimum
  const regionalMin = getRegionalMinimum(quote.region, quote.visitsPerWeek);
  if (calculatedMonthly < regionalMin) {
    calculatedMonthly = regionalMin;
  }

  // CPSWPA surcharge for California
  if (quote.state === "CA" && quote.cpswpaEnabled) {
    calculatedMonthly += CPSWPA_SURCHARGE;
  }

  // Premium treatment (Envira Shield sniper treatment)
  let premiumMonthly = 0;
  if (quote.premiumTreatmentEnabled) {
    premiumMonthly = calculatedMonthly + (totalSqft * PREMIUM_RATE_PER_SQFT);
  }

  const roundedCalculatedMonthly = Math.round(calculatedMonthly * 100) / 100;

  // The quoted amount tracks the calculated amount, but a manual override is
  // allowed to "stick" — including across reloads, since it lives in the
  // persisted quotedMonthly value. The override is only dropped when the
  // calculation itself changes (e.g. an area is added, removed, or modified),
  // at which point the quoted amount re-syncs to the new calculated value.
  // (Previously `quote.quotedMonthly || calculated` made any value stick
  // forever, masking later calculation changes.)
  const calculatedChanged = roundedCalculatedMonthly !== quote.calculatedMonthly;
  const quotedMonthly = calculatedChanged
    ? roundedCalculatedMonthly
    : quote.quotedMonthly || roundedCalculatedMonthly;

  return {
    areas: areasWithCalcs,
    totalSqft,
    facilityDensity,
    facilityDensityTier,
    hoursPerVisit,
    sutmTotal,
    calculatedMonthly: roundedCalculatedMonthly,
    premiumMonthly: Math.round(premiumMonthly * 100) / 100,
    quotedMonthly,
    initialCleanData: {
      ...quote.initialCleanData,
      totalCost: initialCleanTotal,
    },
    updatedAt: new Date().toISOString(),
  };
}
