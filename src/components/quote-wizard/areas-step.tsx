"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Info,
  Camera,
  X,
  Mic,
  MicOff,
  ImageIcon,
} from "lucide-react";
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
        Area Photos
      </Label>

      {(area.photos || []).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(area.photos || []).map((photo, i) => (
            <div key={i} className="relative group w-20 h-20 rounded-md overflow-hidden border">
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
    if (!SpeechRecognition) {
      setSupported(false);
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
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
        updateArea(area.id, {
          notes: existing + separator + finals.join(" "),
        });
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

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

function AreaForm({ area }: { area: QuoteArea }) {
  const updateArea = useQuoteStore((s) => s.updateArea);

  return (
    <div className="space-y-6">
      {/* Area Name */}
      <div className="space-y-2">
        <Label>Area Name</Label>
        <Input
          value={area.areaName}
          onChange={(e) => updateArea(area.id, { areaName: e.target.value })}
          placeholder={`Area ${area.sortOrder}`}
          className="font-medium"
        />
      </div>

      {/* Floor Types */}
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

      {/* Unit-Based Items */}
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

      {/* Photos */}
      <PhotoUpload area={area} />

      {/* Voice Notes */}
      <VoiceNotes area={area} />

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
        <span>{area.totalSqft.toLocaleString()} sq ft</span>
        <span>{Math.round(area.minsPerVisit)} min/visit</span>
      </div>
    </div>
  );
}

export function AreasStep() {
  const quote = useQuoteStore((s) => s.currentQuote);
  const addArea = useQuoteStore((s) => s.addArea);
  const removeArea = useQuoteStore((s) => s.removeArea);
  const [currentAreaIndex, setCurrentAreaIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!quote) return null;

  const areas = quote.areas;
  const total = areas.length;
  const area = areas[currentAreaIndex];

  // Safety: clamp index if areas were removed
  if (currentAreaIndex >= total && total > 0) {
    setCurrentAreaIndex(total - 1);
    return null;
  }

  if (!area) return null;

  const goTo = (index: number) => {
    setShowDeleteConfirm(false);
    setCurrentAreaIndex(index);
  };

  const handleAddArea = () => {
    addArea();
    // Navigate to the newly added area
    setCurrentAreaIndex(total); // total is current length, new area will be at that index
    setShowDeleteConfirm(false);
  };

  const handleDeleteArea = () => {
    if (total <= 1) return;
    removeArea(area.id);
    setShowDeleteConfirm(false);
    if (currentAreaIndex >= total - 1) {
      setCurrentAreaIndex(Math.max(0, total - 2));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-janpro-navy mb-1">
          Cleaning Areas
        </h2>
        <p className="text-sm text-muted-foreground">
          Define each area of the facility with flooring types, fixtures, photos, and notes.
        </p>
      </div>

      {/* Area Navigation Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={currentAreaIndex === 0}
            onClick={() => goTo(currentAreaIndex - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1.5 px-2">
            {areas.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={() => goTo(i)}
                className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                  i === currentAreaIndex
                    ? "bg-janpro-navy text-white"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={currentAreaIndex === total - 1}
            onClick={() => goTo(currentAreaIndex + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-sm text-muted-foreground font-medium">
          Area {currentAreaIndex + 1} of {total}
        </span>
      </div>

      {/* Area Form Card */}
      <Card>
        <CardContent className="pt-6">
          <AreaForm area={area} />
        </CardContent>
      </Card>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between">
        <div>
          {total > 1 && (
            <>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-destructive">Delete this area?</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteArea}
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
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Area
                </Button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddArea}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Area
          </Button>

          {currentAreaIndex < total - 1 && (
            <Button
              type="button"
              size="sm"
              onClick={() => goTo(currentAreaIndex + 1)}
              className="bg-janpro-navy hover:bg-janpro-navy/90"
            >
              Next Area
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
