"use client";

import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Trash2,
  Copy,
  ChevronRight,
  GripVertical,
  Building2,
  LayoutList,
  ClipboardCheck,
} from "lucide-react";
import {
  fetchFacilityTypes,
  createFacilityType,
  deleteFacilityType,
  fetchAreaTemplates,
  createAreaTemplate,
  deleteAreaTemplate,
  fetchChecklistItems,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
} from "@/lib/supabase/queries";
import type { FacilityTypeRecord, AreaTemplate, ChecklistItem } from "@/lib/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Frequency = "nightly" | "weekly" | "monthly";

function FrequencyPill({
  value,
  onChange,
}: {
  value: Frequency;
  onChange: (f: Frequency) => void;
}) {
  const opts: Frequency[] = ["nightly", "weekly", "monthly"];
  return (
    <div className="flex gap-1">
      {opts.map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => onChange(f)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
            value === f
              ? f === "nightly"
                ? "bg-janpro-navy text-white"
                : f === "weekly"
                ? "bg-janpro-cyan text-white"
                : "bg-amber-500 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {f.charAt(0).toUpperCase() + f.slice(1)}
        </button>
      ))}
    </div>
  );
}

function SortableChecklistItem({
  item,
  onDelete,
  onFrequencyChange,
}: {
  item: ChecklistItem;
  onDelete: (id: string) => void;
  onFrequencyChange: (item: ChecklistItem, freq: Frequency) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3 rounded-lg border border-border/50 bg-white/50 space-y-2"
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing touch-none shrink-0 mt-0.5"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground/40" />
        </button>
        <span className="flex-1 text-sm leading-snug">{item.task}</span>
        <button
          onClick={() => onDelete(item.id)}
          className="p-1 rounded text-muted-foreground hover:text-destructive shrink-0"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div className="pl-5">
        <FrequencyPill
          value={item.defaultFrequency as Frequency}
          onChange={(f) => onFrequencyChange(item, f)}
        />
      </div>
    </div>
  );
}

export default function TemplateSettingsPage() {
  const [facilityTypes, setFacilityTypes] = useState<FacilityTypeRecord[]>([]);
  const [selectedFT, setSelectedFT] = useState<string | null>(null);
  const [templates, setTemplates] = useState<AreaTemplate[]>([]);
  const [selectedTpl, setSelectedTpl] = useState<string | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newFTName, setNewFTName] = useState("");
  const [newTplName, setNewTplName] = useState("");
  const [newItemTask, setNewItemTask] = useState("");
  const [loading, setLoading] = useState(true);

  const loadFTs = useCallback(async () => {
    const data = await fetchFacilityTypes();
    setFacilityTypes(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadFTs(); }, [loadFTs]);

  const loadTemplates = useCallback(async (ftId: string) => {
    const data = await fetchAreaTemplates(ftId);
    setTemplates(data);
    setSelectedTpl(null);
    setItems([]);
  }, []);

  const loadItems = useCallback(async (tplId: string) => {
    const data = await fetchChecklistItems(tplId);
    setItems(data);
  }, []);

  useEffect(() => {
    if (selectedFT) loadTemplates(selectedFT);
  }, [selectedFT, loadTemplates]);

  useEffect(() => {
    if (selectedTpl) loadItems(selectedTpl);
  }, [selectedTpl, loadItems]);

  const handleAddFT = async () => {
    if (!newFTName.trim()) return;
    await createFacilityType(newFTName.trim());
    setNewFTName("");
    loadFTs();
  };

  const handleDeleteFT = async (id: string) => {
    await deleteFacilityType(id);
    if (selectedFT === id) {
      setSelectedFT(null);
      setTemplates([]);
      setSelectedTpl(null);
      setItems([]);
    }
    loadFTs();
  };

  const handleDuplicateFT = async (ft: FacilityTypeRecord) => {
    const result = await createFacilityType(`${ft.name} (Copy)`);
    if (result) {
      // Copy all templates and their checklist items
      const srcTemplates = await fetchAreaTemplates(ft.id);
      for (const tpl of srcTemplates) {
        const newTpl = await createAreaTemplate(result.id, tpl.name, tpl.displayOrder);
        if (newTpl) {
          const srcItems = await fetchChecklistItems(tpl.id);
          for (const item of srcItems) {
            await createChecklistItem(newTpl.id, item.task, item.defaultFrequency, item.displayOrder);
          }
        }
      }
      loadFTs();
    }
  };

  const handleAddTemplate = async () => {
    if (!selectedFT || !newTplName.trim()) return;
    await createAreaTemplate(selectedFT, newTplName.trim(), templates.length);
    setNewTplName("");
    loadTemplates(selectedFT);
  };

  const handleDeleteTemplate = async (id: string) => {
    await deleteAreaTemplate(id);
    if (selectedTpl === id) {
      setSelectedTpl(null);
      setItems([]);
    }
    if (selectedFT) loadTemplates(selectedFT);
  };

  const handleAddItem = async () => {
    if (!selectedTpl || !newItemTask.trim()) return;
    await createChecklistItem(selectedTpl, newItemTask.trim(), "nightly", items.length);
    setNewItemTask("");
    loadItems(selectedTpl);
  };

  const handleUpdateItemFrequency = async (item: ChecklistItem, freq: Frequency) => {
    await updateChecklistItem(item.id, { defaultFrequency: freq } as Partial<ChecklistItem>);
    loadItems(selectedTpl!);
  };

  const handleDeleteItem = async (id: string) => {
    await deleteChecklistItem(id);
    if (selectedTpl) loadItems(selectedTpl);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);

    // Optimistic update
    setItems(reordered);

    // Persist new display_order for each item
    for (let i = 0; i < reordered.length; i++) {
      await updateChecklistItem(reordered[i].id, { displayOrder: i } as Partial<ChecklistItem>);
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground py-16">Loading templates...</div>;
  }

  const selectedFTData = facilityTypes.find((f) => f.id === selectedFT);
  const selectedTplData = templates.find((t) => t.id === selectedTpl);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-janpro-navy">Facility Templates</h2>
        <p className="text-sm text-muted-foreground">
          Configure default areas and cleaning checklists for each facility type.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Facility Types */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-janpro-navy" />
              <CardTitle className="text-sm">Facility Types</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {facilityTypes.map((ft) => (
              <div
                key={ft.id}
                className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all text-sm ${
                  selectedFT === ft.id
                    ? "bg-janpro-navy text-white"
                    : "hover:bg-muted"
                }`}
                onClick={() => setSelectedFT(ft.id)}
              >
                <span className="flex-1 font-medium truncate">{ft.name}</span>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDuplicateFT(ft)}
                    className={`p-1 rounded hover:bg-white/20 ${selectedFT === ft.id ? "text-white/60" : "text-muted-foreground"}`}
                    title="Duplicate"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteFT(ft.id)}
                    className={`p-1 rounded hover:bg-white/20 ${selectedFT === ft.id ? "text-white/60" : "text-muted-foreground"}`}
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                {selectedFT === ft.id && <ChevronRight className="h-4 w-4 shrink-0" />}
              </div>
            ))}
            <div className="flex gap-2 pt-2 border-t">
              <Input
                value={newFTName}
                onChange={(e) => setNewFTName(e.target.value)}
                placeholder="New facility type..."
                className="h-8 text-xs"
                onKeyDown={(e) => e.key === "Enter" && handleAddFT()}
              />
              <Button size="sm" className="h-8 shrink-0" onClick={handleAddFT} disabled={!newFTName.trim()}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Middle: Area Templates */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <LayoutList className="h-4 w-4 text-janpro-navy" />
              <CardTitle className="text-sm">
                {selectedFTData ? `${selectedFTData.name} — Areas` : "Select a facility type"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {!selectedFT ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Select a facility type to see its default areas.
              </p>
            ) : (
              <>
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all text-sm ${
                      selectedTpl === tpl.id
                        ? "bg-janpro-navy text-white"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedTpl(tpl.id)}
                  >
                    <GripVertical className={`h-3 w-3 shrink-0 ${selectedTpl === tpl.id ? "text-white/40" : "text-muted-foreground/40"}`} />
                    <span className="flex-1 font-medium truncate">{tpl.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }}
                      className={`p-1 rounded hover:bg-white/20 ${selectedTpl === tpl.id ? "text-white/60" : "text-muted-foreground"}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    {selectedTpl === tpl.id && <ChevronRight className="h-4 w-4 shrink-0" />}
                  </div>
                ))}
                {templates.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No area templates yet. Add one below.
                  </p>
                )}
                <div className="flex gap-2 pt-2 border-t">
                  <Input
                    value={newTplName}
                    onChange={(e) => setNewTplName(e.target.value)}
                    placeholder="New area template..."
                    className="h-8 text-xs"
                    onKeyDown={(e) => e.key === "Enter" && handleAddTemplate()}
                  />
                  <Button size="sm" className="h-8 shrink-0" onClick={handleAddTemplate} disabled={!newTplName.trim()}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right: Checklist Items */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-janpro-navy" />
              <CardTitle className="text-sm">
                {selectedTplData ? `${selectedTplData.name} — Checklist` : "Select an area"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {!selectedTpl ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Select an area template to manage its checklist.
              </p>
            ) : (
              <>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={items.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {items.map((item) => (
                      <SortableChecklistItem
                        key={item.id}
                        item={item}
                        onDelete={handleDeleteItem}
                        onFrequencyChange={handleUpdateItemFrequency}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No checklist items yet. Add cleaning tasks below.
                  </p>
                )}
                <div className="flex gap-2 pt-2 border-t">
                  <Input
                    value={newItemTask}
                    onChange={(e) => setNewItemTask(e.target.value)}
                    placeholder="New cleaning task..."
                    className="h-8 text-xs"
                    onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  />
                  <Button size="sm" className="h-8 shrink-0" onClick={handleAddItem} disabled={!newItemTask.trim()}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
