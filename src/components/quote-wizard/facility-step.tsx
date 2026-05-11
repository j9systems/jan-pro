"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { useQuoteStore } from "@/lib/store";
import { FACILITY_TYPES, REGIONS, VISITS_PER_WEEK_OPTIONS } from "@/lib/constants";
import type { Region } from "@/lib/types";

export function FacilityStep() {
  const quote = useQuoteStore((s) => s.currentQuote);
  const updateQuote = useQuoteStore((s) => s.updateQuote);

  if (!quote) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-janpro-navy mb-1">
          Facility Details
        </h2>
        <p className="text-sm text-muted-foreground">
          Describe the facility to generate an accurate quote.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label>Facility Type</Label>
          <Select
            value={quote.facilityType}
            onValueChange={(val) => updateQuote({ facilityType: val })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FACILITY_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Region</Label>
          <Select
            value={quote.region}
            onValueChange={(val) => updateQuote({ region: val as Region })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="numEmployees">Number of Employees</Label>
          <Input
            id="numEmployees"
            type="number"
            inputMode="numeric"
            min={0}
            value={quote.numEmployees || ""}
            onChange={(e) => updateQuote({ numEmployees: parseInt(e.target.value) || 0 })}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="numFloors">Number of Floors</Label>
          <Input
            id="numFloors"
            type="number"
            inputMode="numeric"
            min={1}
            value={quote.numFloors || ""}
            onChange={(e) => updateQuote({ numFloors: parseInt(e.target.value) || 1 })}
            placeholder="1"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="numRestrooms">Restrooms</Label>
          <Input
            id="numRestrooms"
            type="number"
            inputMode="numeric"
            min={0}
            value={quote.numRestrooms || ""}
            onChange={(e) => updateQuote({ numRestrooms: parseInt(e.target.value) || 0 })}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="numStairwells">Stairwells</Label>
          <Input
            id="numStairwells"
            type="number"
            inputMode="numeric"
            min={0}
            value={quote.numStairwells || ""}
            onChange={(e) => updateQuote({ numStairwells: parseInt(e.target.value) || 0 })}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="numElevators">Elevators</Label>
          <Input
            id="numElevators"
            type="number"
            inputMode="numeric"
            min={0}
            value={quote.numElevators || ""}
            onChange={(e) => updateQuote({ numElevators: parseInt(e.target.value) || 0 })}
            placeholder="0"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="numAreas">How many areas will need to be cleaned?</Label>
          <Input
            id="numAreas"
            type="number"
            inputMode="numeric"
            min={1}
            value={quote.numAreas === 0 ? "" : quote.numAreas}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                updateQuote({ numAreas: 0 });
              } else {
                const val = parseInt(raw);
                if (!isNaN(val) && val >= 0) {
                  updateQuote({ numAreas: val });
                }
              }
            }}
            onBlur={() => {
              if (!quote.numAreas || quote.numAreas < 1) {
                updateQuote({ numAreas: 1 });
              }
            }}
            placeholder="1"
          />
          <p className="text-xs text-muted-foreground">
            This will pre-create areas for you in the next step. You can still add or remove areas later.
          </p>
        </div>
      </div>

      {/* Condition Rating */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Condition Rating</Label>
          <span className="text-sm font-medium text-janpro-navy">
            {quote.conditionRating} / 10
          </span>
        </div>
        <Slider
          value={[quote.conditionRating]}
          onValueChange={([val]) => updateQuote({ conditionRating: val })}
          min={1}
          max={10}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Poor</span>
          <span>Excellent</span>
        </div>
      </div>

      {/* Visits Per Week */}
      <div className="space-y-3">
        <Label>Visits Per Week</Label>
        <div className="flex flex-wrap gap-2">
          {VISITS_PER_WEEK_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateQuote({ visitsPerWeek: opt.value })}
              className={`px-4 py-2.5 rounded-md text-sm font-medium border transition-colors min-w-[60px] ${
                quote.visitsPerWeek === opt.value
                  ? "bg-janpro-navy text-white border-janpro-navy"
                  : "bg-white text-foreground border-input hover:bg-accent"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="newConstruction">New Construction</Label>
          <Switch
            id="newConstruction"
            checked={quote.newConstruction}
            onCheckedChange={(checked) => updateQuote({ newConstruction: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="specialEquipment">Special Equipment Required</Label>
          <Switch
            id="specialEquipment"
            checked={quote.specialEquipment}
            onCheckedChange={(checked) => updateQuote({ specialEquipment: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="restrictedClean">Restricted Clean</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Add 20% premium for restricted access areas</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch
            id="restrictedClean"
            checked={quote.restrictedClean}
            onCheckedChange={(checked) => updateQuote({ restrictedClean: checked })}
          />
        </div>
      </div>
    </div>
  );
}
