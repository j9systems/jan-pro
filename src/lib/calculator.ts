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

export function calculateAreaMinsPerVisit(
  area: QuoteArea,
  visitsPerWeek: number,
  densityTier: DensityTier
): number {
  let mins = 0;
  const totalSqft = area.sqftTotal;

  if (totalSqft > 0) {
    if (area.floorType === "carpet") {
      const carpetRate = getCarpetRate(visitsPerWeek, densityTier);
      mins += (totalSqft / carpetRate) * 60;
    } else {
      const rate = FLOOR_RATES_SQFT_PER_HR[area.floorType] ?? 2500;
      mins += (totalSqft / rate) * 60;
    }
  }

  // Unit-based items from flexible record
  for (const [itemKey, count] of Object.entries(area.unitItems)) {
    if (count > 0) {
      const minsPerUnit = UNIT_RATES_MINS_PER_UNIT[itemKey] ?? 2.5;
      mins += count * minsPerUnit;
    }
  }

  return mins;
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
  return service.sqftOrUnits * (SPECIAL_SERVICE_RATES[service.serviceType] ?? service.rate);
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
  const hourlyRate = getEffectiveHourlyRate(quote.visitsPerWeek);

  // Calculate each area's mins and cost
  const areasWithCalcs = updatedAreas.map((area) => {
    const minsPerVisit = calculateAreaMinsPerVisit(area, quote.visitsPerWeek, facilityDensityTier);
    const costPerMonth = calculateAreaCostPerMonth(minsPerVisit, quote.visitsPerWeek, hourlyRate);
    return { ...area, minsPerVisit, costPerMonth };
  });

  const totalMinsPerVisit = areasWithCalcs.reduce((sum, a) => sum + a.minsPerVisit, 0);
  const hoursPerVisit = totalMinsPerVisit / 60;

  // Sum all unit items named "small_sudums" or "large_sudums" or "toilets" etc. for SUTM total
  const sutmTotal = areasWithCalcs.reduce((sum, a) => {
    return sum + (a.unitItems.small_sudums || 0) + (a.unitItems.large_sudums || 0);
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

  return {
    areas: areasWithCalcs,
    totalSqft,
    facilityDensity,
    facilityDensityTier,
    hoursPerVisit,
    sutmTotal,
    calculatedMonthly: Math.round(calculatedMonthly * 100) / 100,
    quotedMonthly: quote.quotedMonthly || Math.round(calculatedMonthly * 100) / 100,
    initialCleanData: {
      ...quote.initialCleanData,
      totalCost: initialCleanTotal,
    },
    updatedAt: new Date().toISOString(),
  };
}
