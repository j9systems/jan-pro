"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Trash2, ChevronDown, ChevronRight, Info } from "lucide-react";
import { useQuoteStore } from "@/lib/store";
import type { QuoteArea } from "@/lib/types";

const FLOOR_TYPES: { key: keyof QuoteArea; label: string }[] = [
  { key: "carpetSqft", label: "Carpet" },
  { key: "vctSqft", label: "VCT" },
  { key: "tileSqft", label: "Tile (Hard Surface)" },
  { key: "ceramicSqft", label: "Ceramic" },
  { key: "woodSqft", label: "Wood" },
  { key: "concreteSqft", label: "Concrete" },
  { key: "hardSurfaceOtherSqft", label: "Hard Surface Other" },
  { key: "linoleumSqft", label: "Linoleum" },
];

const UNIT_TYPES: { key: keyof QuoteArea; label: string; tooltip?: string }[] = [
  { key: "showerCount", label: "Showers" },
  { key: "blindCount", label: "Blinds" },
  {
    key: "sutmCount",
    label: "SUTMs",
    tooltip: "Special Unit Time Markers — restrooms, sinks, drinking fountains, etc.",
  },
  { key: "pictureFrames", label: "Picture Frames" },
];

function AreaCard({ area }: { area: QuoteArea }) {
  const [isOpen, setIsOpen] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const updateArea = useQuoteStore((s) => s.updateArea);
  const removeArea = useQuoteStore((s) => s.removeArea);
  const quote = useQuoteStore((s) => s.currentQuote);

  const hasData =
    area.carpetSqft > 0 ||
    area.vctSqft > 0 ||
    area.tileSqft > 0 ||
    area.ceramicSqft > 0 ||
    area.woodSqft > 0 ||
    area.concreteSqft > 0 ||
    area.hardSurfaceOtherSqft > 0 ||
    area.linoleumSqft > 0 ||
    area.showerCount > 0 ||
    area.blindCount > 0 ||
    area.sutmCount > 0 ||
    area.pictureFrames > 0;

  const handleDelete = () => {
    if (hasData && !showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    removeArea(area.id);
  };

  const canDelete = quote ? quote.areas.length > 1 : false;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Input
              value={area.areaName}
              onChange={(e) => updateArea(area.id, { areaName: e.target.value })}
              placeholder={`Area ${area.sortOrder}`}
              className="max-w-[250px] font-medium"
            />
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{area.totalSqft.toLocaleString()} sq ft</span>
              <span>{Math.round(area.minsPerVisit)} min/visit</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canDelete && (
              <>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-destructive">Delete?</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                    >
                      Yes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      No
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDelete}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 px-6 pb-2 text-sm font-medium text-janpro-navy hover:text-janpro-cyan transition-colors"
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            Floor Types & Units
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-2">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  Floor Types (sq ft)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {FLOOR_TYPES.map((ft) => (
                    <div key={ft.key} className="space-y-1">
                      <Label className="text-xs">{ft.label}</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={(area[ft.key] as number) || ""}
                        onChange={(e) =>
                          updateArea(area.id, {
                            [ft.key]: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  Unit-Based Items (count)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {UNIT_TYPES.map((ut) => (
                    <div key={ut.key} className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Label className="text-xs">{ut.label}</Label>
                        {ut.tooltip && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-[200px]">{ut.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={(area[ut.key] as number) || ""}
                        onChange={(e) =>
                          updateArea(area.id, {
                            [ut.key]: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function AreasStep() {
  const quote = useQuoteStore((s) => s.currentQuote);
  const addArea = useQuoteStore((s) => s.addArea);

  if (!quote) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-janpro-navy mb-1">
          Cleaning Areas
        </h2>
        <p className="text-sm text-muted-foreground">
          Define each area of the facility with flooring types and fixtures.
        </p>
      </div>

      <div className="space-y-4">
        {quote.areas.map((area) => (
          <AreaCard key={area.id} area={area} />
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={addArea}
        className="w-full border-dashed h-12"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Area
      </Button>
    </div>
  );
}
