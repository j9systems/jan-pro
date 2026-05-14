import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Quote, QuoteArea, Porter, SpecialService } from "./types";
import { calculateQuote } from "./calculator";
import { generateId } from "./utils";

function createBlankArea(sortOrder: number): QuoteArea {
  return {
    id: generateId(),
    sortOrder,
    areaName: "",
    floorType: "carpet",
    floorTypeCustomLabel: "",
    areaType: "office",
    lengthFt: 0,
    widthFt: 0,
    sqft: 0,
    sqftOverride: false,
    quantity: 1,
    sqftTotal: 0,
    unitItems: {},
    photos: [],
    videos: [],
    voiceMemos: [],
    notes: "",
    aiFlags: [],
    aiGenerated: {},
    minsPerVisit: 0,
    costPerMonth: 0,
  };
}

function createBlankQuote(): Quote {
  return {
    id: generateId(),
    companyName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    city: "",
    state: "CA",
    facilityType: "Office",
    region: "southern_california",
    numEmployees: 0,
    numFloors: 1,
    numRestrooms: 0,
    numStairwells: 0,
    numElevators: 0,
    conditionRating: 5,
    visitsPerWeek: 3,
    newConstruction: false,
    initialClean: false,
    specialEquipment: false,
    restrictedClean: false,
    areas: [],
    porters: [],
    initialCleanData: {
      enabled: false,
      officesSqft: 0,
      machineScrubSqft: 0,
      showerCount: 0,
      blindCount: 0,
      sutmCount: 0,
      additionalServices: 0,
      totalCost: 0,
    },
    specialServices: [],
    totalSqft: 0,
    facilityDensity: 0,
    facilityDensityTier: "low",
    hoursPerVisit: 0,
    sutmTotal: 0,
    calculatedMonthly: 0,
    quotedMonthly: 0,
    notes: "",
    recordingTranscript: "",
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

interface QuoteStore {
  currentQuote: Quote | null;
  savedQuotes: Quote[];
  currentStep: number;
  // Actions
  initNewQuote: () => void;
  updateQuote: (partial: Partial<Quote>) => void;
  addArea: () => string;
  addAreaFromAI: (data: Partial<QuoteArea>) => string;
  updateArea: (id: string, partial: Partial<QuoteArea>) => void;
  removeArea: (id: string) => void;
  appendTranscript: (text: string) => void;
  clearTranscript: () => void;
  addPorter: () => void;
  removePorter: (porterNumber: 1 | 2) => void;
  updatePorter: (porterNumber: 1 | 2, partial: Partial<Porter>) => void;
  addSpecialService: (service: SpecialService) => void;
  updateSpecialService: (id: string, partial: Partial<SpecialService>) => void;
  removeSpecialService: (id: string) => void;
  recalculate: () => void;
  setStep: (n: number) => void;
  saveQuote: () => void;
  loadQuote: (id: string) => void;
  clearQuote: () => void;
  deleteQuote: (id: string) => void;
}

export const useQuoteStore = create<QuoteStore>()(
  persist(
    (set, get) => ({
      currentQuote: null,
      savedQuotes: [],
      currentStep: 0,

      initNewQuote: () => {
        set({ currentQuote: createBlankQuote(), currentStep: 0 });
      },

      updateQuote: (partial) => {
        const { currentQuote } = get();
        if (!currentQuote) return;
        const updated = { ...currentQuote, ...partial, updatedAt: new Date().toISOString() };
        const calcs = calculateQuote(updated);
        set({ currentQuote: { ...updated, ...calcs } as Quote });
      },

      addArea: () => {
        const { currentQuote } = get();
        if (!currentQuote) return "";
        const newArea = createBlankArea(currentQuote.areas.length + 1);
        const updated = {
          ...currentQuote,
          areas: [...currentQuote.areas, newArea],
          updatedAt: new Date().toISOString(),
        };
        const calcs = calculateQuote(updated);
        set({ currentQuote: { ...updated, ...calcs } as Quote });
        return newArea.id;
      },

      addAreaFromAI: (data) => {
        const { currentQuote } = get();
        if (!currentQuote) return "";
        const blank = createBlankArea(currentQuote.areas.length + 1);
        // Mark all provided fields as AI-generated
        const aiGenerated: Record<string, boolean> = {};
        for (const key of Object.keys(data)) {
          if (key !== "id" && key !== "sortOrder" && key !== "aiGenerated") {
            if (key === "unitItems" && data.unitItems) {
              // Mark each individual unit item
              for (const itemKey of Object.keys(data.unitItems)) {
                if (data.unitItems[itemKey] > 0) {
                  aiGenerated[`unitItems.${itemKey}`] = true;
                }
              }
            } else {
              aiGenerated[key] = true;
            }
          }
        }
        const newArea: QuoteArea = { ...blank, ...data, aiGenerated };
        const updated = {
          ...currentQuote,
          areas: [...currentQuote.areas, newArea],
          updatedAt: new Date().toISOString(),
        };
        const calcs = calculateQuote(updated);
        set({ currentQuote: { ...updated, ...calcs } as Quote });
        return newArea.id;
      },

      updateArea: (id, partial) => {
        const { currentQuote } = get();
        if (!currentQuote) return;
        const updated = {
          ...currentQuote,
          areas: currentQuote.areas.map((a) =>
            a.id === id ? { ...a, ...partial } : a
          ),
          updatedAt: new Date().toISOString(),
        };
        const calcs = calculateQuote(updated);
        set({ currentQuote: { ...updated, ...calcs } as Quote });
      },

      removeArea: (id) => {
        const { currentQuote } = get();
        if (!currentQuote) return;
        const updated = {
          ...currentQuote,
          areas: currentQuote.areas
            .filter((a) => a.id !== id)
            .map((a, i) => ({ ...a, sortOrder: i + 1 })),
          updatedAt: new Date().toISOString(),
        };
        const calcs = calculateQuote(updated);
        set({ currentQuote: { ...updated, ...calcs } as Quote });
      },

      addPorter: () => {
        const { currentQuote } = get();
        if (!currentQuote) return;
        if (currentQuote.porters.length >= 2) return;
        const porterNumber = (currentQuote.porters.length + 1) as 1 | 2;
        const newPorter: Porter = {
          porterNumber,
          hoursPerDay: 8,
          daysPerWeek: 5,
          costPerMonth: 0,
        };
        const updated = {
          ...currentQuote,
          porters: [...currentQuote.porters, newPorter],
          updatedAt: new Date().toISOString(),
        };
        const calcs = calculateQuote(updated);
        set({ currentQuote: { ...updated, ...calcs } as Quote });
      },

      removePorter: (porterNumber) => {
        const { currentQuote } = get();
        if (!currentQuote) return;
        const updated = {
          ...currentQuote,
          porters: currentQuote.porters.filter((p) => p.porterNumber !== porterNumber),
          updatedAt: new Date().toISOString(),
        };
        const calcs = calculateQuote(updated);
        set({ currentQuote: { ...updated, ...calcs } as Quote });
      },

      updatePorter: (porterNumber, partial) => {
        const { currentQuote } = get();
        if (!currentQuote) return;
        const updated = {
          ...currentQuote,
          porters: currentQuote.porters.map((p) =>
            p.porterNumber === porterNumber ? { ...p, ...partial } : p
          ),
          updatedAt: new Date().toISOString(),
        };
        const calcs = calculateQuote(updated);
        set({ currentQuote: { ...updated, ...calcs } as Quote });
      },

      addSpecialService: (service) => {
        const { currentQuote } = get();
        if (!currentQuote) return;
        const updated = {
          ...currentQuote,
          specialServices: [...currentQuote.specialServices, service],
          updatedAt: new Date().toISOString(),
        };
        const calcs = calculateQuote(updated);
        set({ currentQuote: { ...updated, ...calcs } as Quote });
      },

      updateSpecialService: (id, partial) => {
        const { currentQuote } = get();
        if (!currentQuote) return;
        const updated = {
          ...currentQuote,
          specialServices: currentQuote.specialServices.map((s) =>
            s.id === id ? { ...s, ...partial } : s
          ),
          updatedAt: new Date().toISOString(),
        };
        const calcs = calculateQuote(updated);
        set({ currentQuote: { ...updated, ...calcs } as Quote });
      },

      removeSpecialService: (id) => {
        const { currentQuote } = get();
        if (!currentQuote) return;
        const updated = {
          ...currentQuote,
          specialServices: currentQuote.specialServices.filter((s) => s.id !== id),
          updatedAt: new Date().toISOString(),
        };
        const calcs = calculateQuote(updated);
        set({ currentQuote: { ...updated, ...calcs } as Quote });
      },

      appendTranscript: (text) => {
        const { currentQuote } = get();
        if (!currentQuote) return;
        const separator = currentQuote.recordingTranscript ? " " : "";
        set({
          currentQuote: {
            ...currentQuote,
            recordingTranscript: currentQuote.recordingTranscript + separator + text,
          },
        });
      },

      clearTranscript: () => {
        const { currentQuote } = get();
        if (!currentQuote) return;
        set({
          currentQuote: { ...currentQuote, recordingTranscript: "" },
        });
      },

      recalculate: () => {
        const { currentQuote } = get();
        if (!currentQuote) return;
        const calcs = calculateQuote(currentQuote);
        set({ currentQuote: { ...currentQuote, ...calcs } as Quote });
      },

      setStep: (n) => {
        set({ currentStep: n });
      },

      saveQuote: () => {
        const { currentQuote, savedQuotes } = get();
        if (!currentQuote) return;
        const existing = savedQuotes.findIndex((q) => q.id === currentQuote.id);
        const updated = { ...currentQuote, updatedAt: new Date().toISOString() };
        if (existing >= 0) {
          const newSaved = [...savedQuotes];
          newSaved[existing] = updated;
          set({ savedQuotes: newSaved, currentQuote: updated });
        } else {
          set({ savedQuotes: [...savedQuotes, updated], currentQuote: updated });
        }
      },

      loadQuote: (id) => {
        const { savedQuotes } = get();
        const quote = savedQuotes.find((q) => q.id === id);
        if (quote) {
          set({ currentQuote: { ...quote }, currentStep: 0 });
        }
      },

      clearQuote: () => {
        set({ currentQuote: null, currentStep: 0 });
      },

      deleteQuote: (id) => {
        const { savedQuotes } = get();
        set({ savedQuotes: savedQuotes.filter((q) => q.id !== id) });
      },
    }),
    {
      name: "janpro-quotes",
      partialize: (state) => ({ savedQuotes: state.savedQuotes }),
    }
  )
);
