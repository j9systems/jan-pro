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
  Square,
  Pause,
  Play,
} from "lucide-react";
import { useQuoteStore } from "@/lib/store";
import {
  FLOOR_TYPES_V3,
  AREA_TYPES,
  ALL_UNIT_ITEMS,
  UNIT_ITEMS_BY_AREA_TYPE,
} from "@/lib/constants";
import type { QuoteArea, FloorType, AreaType } from "@/lib/types";

// --- Helper: orange ring class for AI-generated fields ---

function aiRing(area: QuoteArea, field: string): string {
  return area.aiGenerated?.[field] ? "ring-2 ring-orange-400" : "";
}

// Clear AI flag on manual edit
function clearAiField(area: QuoteArea, field: string): Record<string, boolean> {
  if (!area.aiGenerated?.[field]) return area.aiGenerated || {};
  return { ...area.aiGenerated, [field]: false };
}

// --- Recording Bar ---

type RecordingState = "idle" | "recording" | "paused";

function RecordingBar({
  onAreasAdded,
}: {
  onAreasAdded: (ids: string[]) => void;
}) {
  const quote = useQuoteStore((s) => s.currentQuote);
  const addAreaFromAI = useQuoteStore((s) => s.addAreaFromAI);
  const updateArea = useQuoteStore((s) => s.updateArea);
  const appendTranscript = useQuoteStore((s) => s.appendTranscript);
  const clearTranscript = useQuoteStore((s) => s.clearTranscript);

  const [state, setState] = useState<RecordingState>("idle");
  const [liveText, setLiveText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [supported, setSupported] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTextRef = useRef("");
  const lastSentRef = useRef("");

  useEffect(() => {
    const SR = typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;
    if (!SR) setSupported(false);
  }, []);

  const analyzeTranscript = useCallback(async () => {
    if (!quote) return;
    const fullTranscript = (quote.recordingTranscript + " " + pendingTextRef.current).trim();
    if (!fullTranscript || fullTranscript === lastSentRef.current) return;
    lastSentRef.current = fullTranscript;

    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: fullTranscript,
          existingAreas: quote.areas.map((a) => ({
            areaName: a.areaName,
            sortOrder: a.sortOrder,
            floorType: a.floorType,
            areaType: a.areaType,
            sqftTotal: a.sqftTotal,
            unitItems: a.unitItems,
          })),
        }),
      });

      if (!res.ok) return;
      const data = await res.json();
      if (!data.actions || !Array.isArray(data.actions)) return;

      const newIds: string[] = [];
      for (const action of data.actions) {
        if (action.type === "add_area" && action.area) {
          const id = addAreaFromAI(action.area);
          if (id) newIds.push(id);
        } else if (action.type === "update_area" && typeof action.areaIndex === "number") {
          const targetArea = quote.areas[action.areaIndex];
          if (targetArea && action.fields) {
            // Mark updated fields as AI-generated
            const aiGenerated = { ...targetArea.aiGenerated };
            for (const key of Object.keys(action.fields)) {
              aiGenerated[key] = true;
            }
            updateArea(targetArea.id, { ...action.fields, aiGenerated });
          }
        }
      }
      if (newIds.length > 0) onAreasAdded(newIds);
    } catch (e) {
      console.error("Analysis error:", e);
    } finally {
      setAnalyzing(false);
    }
  }, [quote, addAreaFromAI, updateArea, onAreasAdded]);

  const startRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim();
          if (text) {
            pendingTextRef.current += (pendingTextRef.current ? " " : "") + text;
            appendTranscript(text);
          }
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setLiveText(interim || pendingTextRef.current.slice(-120));
    };

    recognition.onerror = (e: Event) => {
      console.error("Speech recognition error:", e);
    };

    recognition.onend = () => {
      // Auto-restart if still in recording state
      if (recognitionRef.current && state === "recording") {
        try {
          recognitionRef.current.start();
        } catch {
          // already started
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [appendTranscript, state]);

  const handleStart = () => {
    clearTranscript();
    pendingTextRef.current = "";
    lastSentRef.current = "";
    setLiveText("");
    setState("recording");
    startRecognition();

    // Start 15-second analysis interval
    intervalRef.current = setInterval(() => {
      analyzeTranscript();
    }, 15000);
  };

  const handlePause = () => {
    setState("paused");
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleResume = () => {
    setState("recording");
    startRecognition();
    intervalRef.current = setInterval(() => {
      analyzeTranscript();
    }, 15000);
  };

  const handleStop = () => {
    setState("idle");
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Fire final analysis
    analyzeTranscript();
    setLiveText("");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!supported) return null;

  if (state === "idle") {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={handleStart}
        className="border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 gap-2"
      >
        <Mic className="h-4 w-4" />
        Record (Beta)
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-orange-300 bg-orange-50/50">
      {/* Status indicator */}
      <div className="flex items-center gap-2 shrink-0">
        {state === "recording" ? (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
        ) : (
          <span className="h-3 w-3 rounded-full bg-yellow-500" />
        )}
        <span className="text-sm font-medium text-orange-800">
          {state === "recording" ? "Recording..." : "Paused"}
        </span>
        {analyzing && (
          <Badge variant="outline" className="text-xs border-orange-300 text-orange-600 animate-pulse">
            Analyzing...
          </Badge>
        )}
      </div>

      {/* Live transcript preview */}
      <div className="flex-1 min-w-0 mx-2">
        <p className="text-xs text-orange-700 truncate italic">
          {liveText || (quote?.recordingTranscript?.slice(-120)) || "Listening..."}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {state === "recording" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePause}
            className="h-8 gap-1 border-orange-300"
          >
            <Pause className="h-3.5 w-3.5" />
            Pause
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResume}
            className="h-8 gap-1 border-orange-300"
          >
            <Play className="h-3.5 w-3.5" />
            Resume
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleStop}
          className="h-8 gap-1 border-orange-300 text-red-600 hover:text-red-700"
        >
          <Square className="h-3.5 w-3.5" />
          Stop
        </Button>
      </div>
    </div>
  );
}

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

// --- Photo Upload ---

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

// --- Voice Notes ---

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
      aiGenerated: clearAiField(area, `unitItems.${key}`),
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
              className={`h-8 ${area.aiGenerated?.[`unitItems.${item.key}`] ? "ring-2 ring-orange-400" : ""}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Detail Panel ---

function DetailPanel({ area }: { area: QuoteArea }) {
  const updateArea = useQuoteStore((s) => s.updateArea);

  return (
    <div className="p-4 bg-muted/30 border-t space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Area Type</Label>
          <Select
            value={area.areaType}
            onValueChange={(val) =>
              updateArea(area.id, {
                areaType: val as AreaType,
                aiGenerated: clearAiField(area, "areaType"),
              })
            }
          >
            <SelectTrigger className={aiRing(area, "areaType")}>
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

      <UnitItemsPanel area={area} />

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

  // Check if this entire row was AI-created (has any AI-generated fields)
  const isAiRow = Object.values(area.aiGenerated || {}).some(Boolean);

  const handleSqftChange = (val: string) => {
    const sqft = parseInt(val) || 0;
    updateArea(area.id, {
      sqft,
      sqftOverride: true,
      aiGenerated: { ...clearAiField(area, "sqft"), ...clearAiField(area, "lengthFt"), ...clearAiField(area, "widthFt") },
    });
  };

  const handleDimensionChange = (field: "lengthFt" | "widthFt", val: string) => {
    const num = parseInt(val) || 0;
    const other = field === "lengthFt" ? area.widthFt : area.lengthFt;
    const sqft = num * other;
    updateArea(area.id, {
      [field]: num,
      sqft,
      sqftOverride: false,
      aiGenerated: clearAiField(area, field),
    });
  };

  const unitItemCount = Object.values(area.unitItems).reduce(
    (sum, v) => sum + (v || 0),
    0
  );

  return (
    <>
      <TableRow className={`${isExpanded ? "bg-muted/30 border-b-0" : ""} ${isAiRow ? "border-l-2 border-l-orange-400" : ""}`}>
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
            onValueChange={(val) =>
              updateArea(area.id, {
                floorType: val as FloorType,
                aiGenerated: clearAiField(area, "floorType"),
              })
            }
          >
            <SelectTrigger className={`h-8 text-xs ${aiRing(area, "floorType")}`}>
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
            onChange={(e) =>
              updateArea(area.id, {
                areaName: e.target.value,
                aiGenerated: clearAiField(area, "areaName"),
              })
            }
            placeholder={`Area ${area.sortOrder}`}
            className={`h-8 text-xs ${aiRing(area, "areaName")}`}
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
            className={`h-8 text-xs w-16 ${aiRing(area, "lengthFt")}`}
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
            className={`h-8 text-xs w-16 ${aiRing(area, "widthFt")}`}
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
            className={`h-8 text-xs w-20 ${aiRing(area, "sqft")}`}
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
              updateArea(area.id, {
                quantity: parseInt(e.target.value) || 1,
                aiGenerated: clearAiField(area, "quantity"),
              })
            }
            placeholder="1"
            className={`h-8 text-xs w-14 ${aiRing(area, "quantity")}`}
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

  const handleAiAreasAdded = useCallback((ids: string[]) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-janpro-navy mb-1">
            Cleaning Areas
          </h2>
          <p className="text-sm text-muted-foreground">
            Each area is one measured section of one floor type. Add areas as you walk the facility.
          </p>
        </div>
        <RecordingBar onAreasAdded={handleAiAreasAdded} />
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
          <p className="text-sm">Click &quot;Record (Beta)&quot; to narrate your walkthrough, or add areas manually below.</p>
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
