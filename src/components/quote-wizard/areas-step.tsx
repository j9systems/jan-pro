"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Camera,
  X,
  Mic,
  MicOff,
  ImageIcon,
  Info,
} from "lucide-react";
import { useQuoteStore } from "@/lib/store";
import {
  FLOOR_TYPES_V3,
  AREA_TYPES,
  ALL_UNIT_ITEMS,
  UNIT_ITEMS_BY_AREA_TYPE,
} from "@/lib/constants";
import type { QuoteArea, FloorType, AreaType } from "@/lib/types";

// --- Aggregates Bar ---

function AggregatesBar({ areas }: { areas: QuoteArea[] }) {
  const totalSqft = areas.reduce((sum, a) => sum + a.sqftTotal, 0);
  const carpetSqft = areas
    .filter((a) => a.floorType === "carpet")
    .reduce((sum, a) => sum + a.sqftTotal, 0);
  const hardSqft = totalSqft - carpetSqft;

  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-muted/50 rounded-lg text-sm">
      <div>
        <span className="text-muted-foreground">Areas:</span>{" "}
        <span className="font-semibold">{areas.length}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Total Sq Ft:</span>{" "}
        <span className="font-semibold">{totalSqft.toLocaleString()}</span>
      </div>
      {carpetSqft > 0 && (
        <div>
          <span className="text-muted-foreground">Carpet:</span>{" "}
          <span className="font-medium">{carpetSqft.toLocaleString()}</span>
        </div>
      )}
      {hardSqft > 0 && (
        <div>
          <span className="text-muted-foreground">Hard Floor:</span>{" "}
          <span className="font-medium">{hardSqft.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

// --- Photo Upload (reused from V2) ---

function PhotoUpload({ area }: { area: QuoteArea }) {
  const updateArea = useQuoteStore((s) => s.updateArea);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      Array.from(files).forEach((file) => {
        if (!file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          updateArea(area.id, { photos: [...(area.photos || []), base64] });
        };
        reader.readAsDataURL(file);
      });
    },
    [area.id, area.photos, updateArea]
  );

  const removePhoto = (index: number) => {
    const updated = [...(area.photos || [])];
    updated.splice(index, 1);
    updateArea(area.id, { photos: updated });
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Camera className="h-4 w-4" />
        Photos
      </Label>
      {(area.photos || []).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(area.photos || []).map((photo, i) => (
            <div key={i} className="relative group w-20 h-20 rounded-md overflow-hidden border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt={`Area photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.setAttribute("capture", "environment");
              fileInputRef.current.click();
            }
          }}
        >
          <Camera className="h-4 w-4 mr-2" />
          Take Photo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.removeAttribute("capture");
              fileInputRef.current.click();
            }
          }}
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </div>
    </div>
  );
}

// --- Voice Notes (reused from V2) ---

function VoiceNotes({ area }: { area: QuoteArea }) {
  const updateArea = useQuoteStore((s) => s.updateArea);
  const [isRecording, setIsRecording] = useState(false);
  const [supported, setSupported] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;
    if (!SpeechRecognition) setSupported(false);
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const existing = area.notes || "";
      const separator = existing.length > 0 ? " " : "";
      const finals: string[] = [];
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finals.push(event.results[i][0].transcript);
        }
      }
      if (finals.length > 0) {
        updateArea(area.id, { notes: existing + separator + finals.join(" ") });
      }
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Mic className="h-4 w-4" />
        Notes
      </Label>
      <Textarea
        value={area.notes || ""}
        onChange={(e) => updateArea(area.id, { notes: e.target.value })}
        placeholder="Type notes or use voice recording..."
        rows={3}
      />
      {supported ? (
        <Button
          type="button"
          variant={isRecording ? "destructive" : "outline"}
          size="sm"
          onClick={toggleRecording}
        >
          {isRecording ? (
            <>
              <MicOff className="h-4 w-4 mr-2" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 mr-2" />
              Record Voice Note
            </>
          )}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          Voice recording is not supported in this browser.
        </p>
      )}
    </div>
  );
}

// --- Unit Items Panel ---

function UnitItemsPanel({ area }: { area: QuoteArea }) {
  const updateArea = useQuoteStore((s) => s.updateArea);
  const [showAll, setShowAll] = useState(false);

  const defaultItems = UNIT_ITEMS_BY_AREA_TYPE[area.areaType] || [];
  const activeItems = Object.keys(area.unitItems).filter(
    (k) => area.unitItems[k] > 0
  );

  // Show: default items for area type + any items that already have values
  const visibleKeys = showAll
    ? ALL_UNIT_ITEMS.map((u) => u.key)
    : Array.from(new Set([...defaultItems, ...activeItems]));

  const visibleItems = visibleKeys
    .map((key) => ALL_UNIT_ITEMS.find((u) => u.key === key))
    .filter(Boolean) as { key: string; label: string }[];

  const hiddenCount = ALL_UNIT_ITEMS.length - visibleItems.length;

  const setItem = (key: string, value: number) => {
    updateArea(area.id, {
      unitItems: { ...area.unitItems, [key]: value },
    });
  };

  if (visibleItems.length === 0 && !showAll) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm">Unit Items</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setShowAll(true)}
          >
            Show all items
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          No default items for this area type. Click &quot;Show all items&quot; to add.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm">Unit Items</Label>
        {!showAll && hiddenCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setShowAll(true)}
          >
            +{hiddenCount} more items
          </Button>
        )}
        {showAll && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setShowAll(false)}
          >
            Show fewer
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {visibleItems.map((item) => (
          <div key={item.key} className="space-y-1">
            <Label className="text-xs">{item.label}</Label>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={area.unitItems[item.key] || ""}
              onChange={(e) => setItem(item.key, parseInt(e.target.value) || 0)}
              placeholder="0"
              className="h-8"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Detail Panel (expandable under each row) ---

function DetailPanel({ area }: { area: QuoteArea }) {
  const updateArea = useQuoteStore((s) => s.updateArea);

  return (
    <div className="p-4 bg-muted/30 border-t space-y-5">
      {/* Area Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Area Type</Label>
          <Select
            value={area.areaType}
            onValueChange={(val) => updateArea(area.id, { areaType: val as AreaType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AREA_TYPES.map((at) => (
                <SelectItem key={at.value} value={at.value}>
                  {at.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {area.floorType === "other" && (
          <div className="space-y-2">
            <Label>Custom Floor Type</Label>
            <Input
              value={area.floorTypeCustomLabel}
              onChange={(e) =>
                updateArea(area.id, { floorTypeCustomLabel: e.target.value })
              }
              placeholder="Describe floor type..."
            />
          </div>
        )}
      </div>

      {/* Unit Items */}
      <UnitItemsPanel area={area} />

      {/* Photos + Notes side by side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <PhotoUpload area={area} />
        <VoiceNotes area={area} />
      </div>
    </div>
  );
}

// --- Area Table Row ---

function AreaRow({
  area,
  isExpanded,
  onToggle,
}: {
  area: QuoteArea;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const updateArea = useQuoteStore((s) => s.updateArea);
  const removeArea = useQuoteStore((s) => s.removeArea);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSqftChange = (val: string) => {
    const sqft = parseInt(val) || 0;
    updateArea(area.id, { sqft, sqftOverride: true });
  };

  const handleDimensionChange = (field: "lengthFt" | "widthFt", val: string) => {
    const num = parseInt(val) || 0;
    const other = field === "lengthFt" ? area.widthFt : area.lengthFt;
    const sqft = num * other;
    updateArea(area.id, {
      [field]: num,
      sqft,
      sqftOverride: false,
    });
  };

  const unitItemCount = Object.values(area.unitItems).reduce(
    (sum, v) => sum + (v || 0),
    0
  );

  return (
    <>
      <TableRow className={isExpanded ? "bg-muted/30 border-b-0" : ""}>
        {/* Expand toggle */}
        <TableCell className="w-8 px-1">
          <button
            type="button"
            onClick={onToggle}
            className="p-1 rounded hover:bg-accent transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </TableCell>

        {/* Floor Type */}
        <TableCell className="min-w-[140px]">
          <Select
            value={area.floorType}
            onValueChange={(val) => updateArea(area.id, { floorType: val as FloorType })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FLOOR_TYPES_V3.map((ft) => (
                <SelectItem key={ft.value} value={ft.value}>
                  {ft.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>

        {/* Area Name */}
        <TableCell className="min-w-[130px]">
          <Input
            value={area.areaName}
            onChange={(e) => updateArea(area.id, { areaName: e.target.value })}
            placeholder={`Area ${area.sortOrder}`}
            className="h-8 text-xs"
          />
        </TableCell>

        {/* L x W */}
        <TableCell className="min-w-[70px]">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={area.lengthFt || ""}
            onChange={(e) => handleDimensionChange("lengthFt", e.target.value)}
            placeholder="L"
            className="h-8 text-xs w-16"
          />
        </TableCell>
        <TableCell className="min-w-[70px]">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={area.widthFt || ""}
            onChange={(e) => handleDimensionChange("widthFt", e.target.value)}
            placeholder="W"
            className="h-8 text-xs w-16"
          />
        </TableCell>

        {/* Sq Ft */}
        <TableCell className="min-w-[80px]">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={area.sqft || ""}
            onChange={(e) => handleSqftChange(e.target.value)}
            placeholder="0"
            className="h-8 text-xs w-20"
          />
        </TableCell>

        {/* Qty */}
        <TableCell className="min-w-[60px]">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={area.quantity || ""}
            onChange={(e) =>
              updateArea(area.id, { quantity: parseInt(e.target.value) || 1 })
            }
            placeholder="1"
            className="h-8 text-xs w-14"
          />
        </TableCell>

        {/* Total Sq Ft */}
        <TableCell className="min-w-[80px] text-right font-medium text-xs">
          {area.sqftTotal > 0 ? area.sqftTotal.toLocaleString() : "—"}
        </TableCell>

        {/* Indicators */}
        <TableCell className="min-w-[80px]">
          <div className="flex items-center gap-1">
            {unitItemCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    {unitItemCount}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{unitItemCount} unit items</p>
                </TooltipContent>
              </Tooltip>
            )}
            {(area.photos?.length ?? 0) > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    <Camera className="h-3 w-3" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{area.photos.length} photos</p>
                </TooltipContent>
              </Tooltip>
            )}
            {area.notes && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    <Info className="h-3 w-3" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Has notes</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TableCell>

        {/* Delete */}
        <TableCell className="w-8 px-1">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1">
              <Button variant="destructive" size="sm" className="h-6 text-xs px-2" onClick={() => { removeArea(area.id); setShowDeleteConfirm(false); }}>
                Yes
              </Button>
              <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => setShowDeleteConfirm(false)}>
                No
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </TableCell>
      </TableRow>

      {/* Detail panel */}
      {isExpanded && (
        <tr>
          <td colSpan={10}>
            <DetailPanel area={area} />
          </td>
        </tr>
      )}
    </>
  );
}

// --- Main AreasStep ---

export function AreasStep() {
  const quote = useQuoteStore((s) => s.currentQuote);
  const addArea = useQuoteStore((s) => s.addArea);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // If navigating back from AI Summary with a target area
  useEffect(() => {
    const target = sessionStorage.getItem("janpro-goto-area");
    if (target !== null && quote) {
      sessionStorage.removeItem("janpro-goto-area");
      const idx = parseInt(target, 10);
      if (!isNaN(idx) && quote.areas[idx]) {
        setExpandedIds(new Set([quote.areas[idx].id]));
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!quote) return null;

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddArea = () => {
    const newId = addArea();
    if (newId) {
      setExpandedIds((prev) => new Set(prev).add(newId));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-janpro-navy mb-1">
          Cleaning Areas
        </h2>
        <p className="text-sm text-muted-foreground">
          Each area is one measured section of one floor type. Add areas as you walk the facility.
        </p>
      </div>

      {quote.areas.length > 0 && <AggregatesBar areas={quote.areas} />}

      {quote.areas.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-8 px-1" />
                <TableHead className="text-xs">Floor Type</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">L (ft)</TableHead>
                <TableHead className="text-xs">W (ft)</TableHead>
                <TableHead className="text-xs">Sq Ft</TableHead>
                <TableHead className="text-xs">Qty</TableHead>
                <TableHead className="text-xs text-right">Total</TableHead>
                <TableHead className="text-xs" />
                <TableHead className="w-8 px-1" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {quote.areas.map((area) => (
                <AreaRow
                  key={area.id}
                  area={area}
                  isExpanded={expandedIds.has(area.id)}
                  onToggle={() => toggleExpand(area.id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <p className="mb-2">No areas yet.</p>
          <p className="text-sm">Click below to add your first area.</p>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={handleAddArea}
        className="w-full border-dashed h-12"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Area
      </Button>
    </div>
  );
}
