import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Plane, Hotel, Utensils, Camera, MapPin, Clock, Plus, Trash2, Pencil, Save,
  Ticket, Coffee, ShoppingBag, Bus, Car, Train, Footprints, ImagePlus,
  Calendar, Users, ArrowLeft, GripVertical, Star, Heart, Tag,
} from "lucide-react";
import { toast } from "sonner";

// ─── Configs (matching Itinerary page) ─────────────────────────────
const activityTypeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  flight: { icon: Plane, color: "text-sky-500", bgColor: "bg-sky-50/60 dark:bg-sky-950/40 border-sky-200/50 dark:border-sky-800/50", label: "Flight / Airport" },
  accommodation: { icon: Hotel, color: "text-blue-500", bgColor: "bg-blue-50/60 dark:bg-blue-950/40 border-blue-200/50 dark:border-blue-800/50", label: "Hotel / Stay" },
  dining: { icon: Utensils, color: "text-orange-500", bgColor: "bg-orange-50/60 dark:bg-orange-950/40 border-orange-200/50 dark:border-orange-800/50", label: "Dining" },
  cafe: { icon: Coffee, color: "text-amber-500", bgColor: "bg-amber-50/60 dark:bg-amber-950/40 border-amber-200/50 dark:border-amber-800/50", label: "Café" },
  sightseeing: { icon: Camera, color: "text-emerald-500", bgColor: "bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-800/50", label: "Sightseeing" },
  activity: { icon: Ticket, color: "text-purple-500", bgColor: "bg-purple-50/60 dark:bg-purple-950/40 border-purple-200/50 dark:border-purple-800/50", label: "Activity" },
  transport: { icon: Bus, color: "text-cyan-500", bgColor: "bg-cyan-50/60 dark:bg-cyan-950/40 border-cyan-200/50 dark:border-cyan-800/50", label: "Transport" },
  shopping: { icon: ShoppingBag, color: "text-pink-500", bgColor: "bg-pink-50/60 dark:bg-pink-950/40 border-pink-200/50 dark:border-pink-800/50", label: "Shopping" },
};

const transportTypes = [
  { value: "walk", icon: Footprints, label: "Walk" },
  { value: "car", icon: Car, label: "Drive" },
  { value: "bus", icon: Bus, label: "Bus" },
  { value: "train", icon: Train, label: "Train" },
];

const placeholderImages: Record<string, string> = {
  flight: "https://images.unsplash.com/photo-1529074963764-98f45c47344b?w=400&h=200&fit=crop",
  accommodation: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=200&fit=crop",
  dining: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=200&fit=crop",
  cafe: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=200&fit=crop",
  sightseeing: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=200&fit=crop",
  activity: "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=400&h=200&fit=crop",
  shopping: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=200&fit=crop",
  transport: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=200&fit=crop",
};

// ─── Types ──────────────────────────────────────────────────────────
export interface BuilderActivity {
  id: string;
  type: string;
  name: string;
  time: string;
  duration: string;
  location: string;
  cost: number;
  notes: string;
  image_url: string;
  photos?: string[];        // Additional photos for trip diary
  review?: string;          // User review of this activity
  transportType: string;
  transportDuration: string;
}

export interface BuilderDay {
  id: string;
  date: string;
  theme: string;
  activities: BuilderActivity[];
}

export interface BuilderTrip {
  id: string;
  title: string;
  destination: string;
  travelers: number;
  days: BuilderDay[];
  createdAt: string;
  updatedAt: string;
}

// ─── Storage ────────────────────────────────────────────────────────
import { loadTrips, saveTrip as saveToStorage } from "@/services/storageService";
import { SavedTrip } from "@/lib/tripTypes";

const generateId = () => Math.random().toString(36).substring(2, 10);

const createEmptyActivity = (): BuilderActivity => ({
  id: generateId(),
  type: "activity",
  name: "",
  time: "09:00",
  duration: "1h",
  location: "",
  cost: 0,
  notes: "",
  image_url: "",
  transportType: "walk",
  transportDuration: "10 min",
});

const createEmptyDay = (dayNum: number): BuilderDay => ({
  id: generateId(),
  date: "",
  theme: `Day ${dayNum}`,
  activities: [],
});

// ─── Activity Slot (display only, matching Itinerary style) ────────
const BuilderSlot = ({
  activity,
  onEdit,
  onDelete,
  isDraggable = true,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragging = false,
  isDragOver = false,
  dropPosition,
}: {
  activity: BuilderActivity;
  onEdit: () => void;
  onDelete: () => void;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  dropPosition?: 'before' | 'after';
}) => {
  const config = activityTypeConfig[activity.type] || activityTypeConfig.activity;
  const Icon = config.icon;
  const imageUrl = activity.image_url || placeholderImages[activity.type] || placeholderImages.activity;

  return (
    <div className="relative">
      {/* Drop indicator - before */}
      {isDragOver && dropPosition === 'before' && (
        <div className="absolute -left-2 top-0 bottom-0 w-1 bg-primary rounded-full z-30" />
      )}

      <div
        draggable={isDraggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDrop={onDrop}
        className={cn(
          "relative group flex flex-col rounded-xl border transition-all duration-200 w-[200px] h-[240px] shrink-0 bg-card overflow-hidden hover:shadow-lg hover:-translate-y-1",
          config.bgColor,
          isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
          isDragging && "opacity-50"
        )}
        onClick={onEdit}
      >
      {/* Drag handle - show when draggable */}
      {isDraggable && (
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div className="w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-sm cursor-grab active:cursor-grabbing">
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Edit / Delete overlay */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-background"
        >
          <Pencil className="w-3.5 h-3.5 text-foreground" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-7 h-7 rounded-full bg-destructive/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-destructive"
        >
          <Trash2 className="w-3.5 h-3.5 text-destructive-foreground" />
        </button>
      </div>

      {/* Image */}
      <div className="relative w-full h-[110px] shrink-0">
        <img src={imageUrl} alt={activity.name || "Activity"} className="w-full h-full object-cover" loading="lazy" />
        <div className={cn("absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-sm bg-background/70 shadow-sm", config.color)}>
          <Icon className="w-3 h-3" />
          <span className="capitalize">{activity.type}</span>
        </div>
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-sm bg-background/70 text-foreground shadow-sm">
          {activity.time}
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col flex-1 p-3">
        <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight mb-1">
          {activity.name || "Untitled"}
        </h4>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-auto">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{activity.location || "No location"}</span>
        </div>
        <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/30">
          <span className="text-[11px] text-muted-foreground">{activity.duration}</span>
          {activity.cost > 0 && <span className="text-xs font-semibold text-foreground">€{activity.cost}</span>}
        </div>
      </div>
    </div>

      {/* Drop indicator - after */}
      {isDragOver && dropPosition === 'after' && (
        <div className="absolute -right-2 top-0 bottom-0 w-1 bg-primary rounded-full z-30" />
      )}
    </div>
  );
};

// ─── Add Activity Card ──────────────────────────────────────────────
const AddSlotCard = ({
  onClick,
  onDragOver,
  onDrop,
  isDragOver = false,
}: {
  onClick: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
}) => (
  <button
    onClick={onClick}
    onDragOver={onDragOver}
    onDrop={onDrop}
    className={cn(
      "flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 transition-all duration-200 w-[200px] h-[240px] shrink-0 bg-muted/30 hover:bg-muted/60 cursor-pointer group ml-4",
      isDragOver && "ring-2 ring-primary ring-offset-2 border-primary"
    )}
  >
    <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mb-3 transition-colors">
      <Plus className="w-6 h-6 text-primary" />
    </div>
    <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Add Activity</span>
  </button>
);

// ─── Transport Bubble ───────────────────────────────────────────────
const TransportBubble = ({ type, duration }: { type: string; duration: string }) => {
  const t = transportTypes.find((x) => x.value === type);
  const Icon = t?.icon || Bus;
  return (
    <div className="flex flex-col items-center justify-center w-11 h-11 bg-background rounded-full border border-border shadow-sm shrink-0 z-10">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-[8px] font-medium text-muted-foreground">{duration}</span>
    </div>
  );
};

// ─── Activity Edit Dialog ───────────────────────────────────────────
const ActivityDialog = ({
  open,
  onOpenChange,
  activity,
  onSave,
  isFirst,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: BuilderActivity;
  onSave: (a: BuilderActivity) => void;
  isFirst: boolean;
}) => {
  const [form, setForm] = useState<BuilderActivity>(activity);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setForm(activity); }, [activity]);

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Activity name is required");
      return;
    }
    onSave(form);
    onOpenChange(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setForm((p) => ({ ...p, image_url: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const imagePreview = form.image_url || placeholderImages[form.type] || placeholderImages.activity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activity.name ? "Edit Activity" : "Add Activity"}</DialogTitle>
          <DialogDescription>Fill in the details for this activity slot.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(activityTypeConfig).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <Icon className={cn("w-4 h-4", cfg.color)} />
                        {cfg.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Visit Eiffel Tower" />
          </div>

          {/* Time + Duration row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Time</Label>
              <Input type="time" value={form.time} onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration</Label>
              <Input value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))} placeholder="e.g. 2h" />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="e.g. Champ de Mars, Paris" />
          </div>

          {/* Cost */}
          <div className="space-y-1.5">
            <Label>Cost (€)</Label>
            <Input type="number" min={0} value={form.cost || ""} onChange={(e) => setForm((p) => ({ ...p, cost: Number(e.target.value) || 0 }))} placeholder="0" />
          </div>

          {/* Image */}
          <div className="space-y-1.5">
            <Label>Image</Label>
            <div className="flex gap-2">
              <Input value={form.image_url?.startsWith("data:") ? "(uploaded)" : form.image_url} onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))} placeholder="Paste URL or upload" className="flex-1" />
              <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="w-4 h-4" />
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>
            <div className="w-full h-24 rounded-lg overflow-hidden border border-border/50 bg-muted">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Transport (if not first) */}
          {!isFirst && (
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/50 border border-border/50">
              <Label className="text-xs text-muted-foreground">Transport to this activity</Label>
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.transportType} onValueChange={(v) => setForm((p) => ({ ...p, transportType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {transportTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-2">
                          <t.icon className="w-3.5 h-3.5" />
                          {t.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={form.transportDuration} onChange={(e) => setForm((p) => ({ ...p, transportDuration: e.target.value }))} placeholder="e.g. 15 min" />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Any additional notes..." rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────
const TripBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1000);

  const [trip, setTrip] = useState<SavedTrip>(() => {
    if (id) {
      const trips = loadTrips();
      const found = trips.find((t) => t.id === id);
      if (found) return found;
    }
    return {
      id: generateId(),
      source: 'custom',
      title: "My Trip",
      destination: "",
      travelers: 1,
      days: [createEmptyDay(1)],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<BuilderActivity>(createEmptyActivity());
  const [editingDayId, setEditingDayId] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number>(-1); // -1 = adding new

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{ dayId: string; activityIndex: number } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{ dayId: string; activityIndex: number; position: 'before' | 'after' } | null>(null);

  // Track width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // ─── CRUD ──────────────────────────────────────────────────────
  const addDay = () => {
    setTrip((p) => ({ ...p, days: [...p.days, createEmptyDay(p.days.length + 1)] }));
  };

  const removeDay = (dayId: string) => {
    if (trip.days.length <= 1) { toast.error("Need at least one day"); return; }
    setTrip((p) => ({ ...p, days: p.days.filter((d) => d.id !== dayId) }));
  };

  const openAddActivity = (dayId: string) => {
    setEditingDayId(dayId);
    setEditingIndex(-1);
    setEditingActivity(createEmptyActivity());
    setDialogOpen(true);
  };

  const openEditActivity = (dayId: string, index: number, activity: BuilderActivity) => {
    setEditingDayId(dayId);
    setEditingIndex(index);
    setEditingActivity({ ...activity });
    setDialogOpen(true);
  };

  const handleSaveActivity = (a: BuilderActivity) => {
    setTrip((p) => ({
      ...p,
      days: p.days.map((d) => {
        if (d.id !== editingDayId) return d;
        const acts = [...d.activities];
        if (editingIndex === -1) {
          acts.push(a);
        } else {
          acts[editingIndex] = a;
        }
        return { ...d, activities: acts };
      }),
    }));
  };

  const deleteActivity = (dayId: string, index: number) => {
    setTrip((p) => ({
      ...p,
      days: p.days.map((d) => {
        if (d.id !== dayId) return d;
        return { ...d, activities: d.activities.filter((_, i) => i !== index) };
      }),
    }));
  };

  // Reorder activities - supports cross-day moves and insertion
  const reorderActivity = (
    sourceDayId: string,
    sourceIndex: number,
    targetDayId: string,
    targetIndex: number,
    position: 'before' | 'after'
  ) => {
    setTrip((p) => {
      const newDays = p.days.map(d => ({ ...d, activities: [...d.activities] }));

      // Find source and target days
      const sourceDayIdx = newDays.findIndex(d => d.id === sourceDayId);
      const targetDayIdx = newDays.findIndex(d => d.id === targetDayId);

      if (sourceDayIdx === -1 || targetDayIdx === -1) return p;

      // Remove activity from source day
      const [movedActivity] = newDays[sourceDayIdx].activities.splice(sourceIndex, 1);

      // Calculate insertion index based on position
      let insertIndex = targetIndex;

      // If moving within same day and moving forward, adjust for removal
      if (sourceDayId === targetDayId && sourceIndex < targetIndex) {
        insertIndex--;
      }

      // Adjust for before/after
      if (position === 'after') {
        insertIndex++;
      }

      // Insert into target day
      newDays[targetDayIdx].activities.splice(insertIndex, 0, movedActivity);

      return { ...p, days: newDays };
    });
  };

  const saveTrip = () => {
    const updated = { ...trip, updatedAt: new Date().toISOString() };
    saveToStorage(updated);
    toast.success("Trip saved!");
    navigate("/my-trips");
  };

  // ─── Snake layout (per day, matching itinerary style) ──────────
  const SLOT_WIDTH = 200;
  const SLOT_HEIGHT = 240;
  const GAP = 14;
  const TRANSPORT_WIDTH = 44;
  const SLOT_WITH_GAP = SLOT_WIDTH + GAP + TRANSPORT_WIDTH;
  const PADDING = 24;
  const ROW_HEIGHT = 320;
  const ARC_RADIUS = 30;

  const availableWidth = containerWidth - PADDING * 2;
  const slotsPerRow = Math.max(1, Math.floor((availableWidth + GAP + TRANSPORT_WIDTH) / SLOT_WITH_GAP));

  const totalCost = trip.days.reduce((t, d) => t + d.activities.reduce((s, a) => s + (a.cost || 0), 0), 0);

  // Build all rows across all days (+ add slot per day)
  interface RowData {
    dayIndex: number;
    slots: (BuilderActivity | "add")[];
    isFirstRowOfDay: boolean;
    day: BuilderDay;
  }

  const allRows = useMemo(() => {
    const rows: RowData[] = [];
    trip.days.forEach((day, dayIndex) => {
      const allSlots: (BuilderActivity | "add")[] = [...day.activities, "add"];
      const dayRows: (BuilderActivity | "add")[][] = [];
      for (let i = 0; i < allSlots.length; i += slotsPerRow) {
        dayRows.push(allSlots.slice(i, i + slotsPerRow));
      }
      dayRows.forEach((rowSlots, ri) => {
        rows.push({ dayIndex, slots: rowSlots, isFirstRowOfDay: ri === 0, day });
      });
    });
    return rows;
  }, [trip.days, slotsPerRow]);

  const step = SLOT_WIDTH + GAP + TRANSPORT_WIDTH;
  const getRowWidth = (n: number) => n * SLOT_WIDTH + Math.max(0, n - 1) * (GAP + TRANSPORT_WIDTH);

  const rowLayouts = useMemo(() => {
    return allRows.map((row, rowIndex) => {
      const slotCount = row.slots.length;
      const rowWidth = getRowWidth(slotCount);
      const rowLeft = PADDING;
      const yCenter = rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
      const top = rowIndex * ROW_HEIGHT + (ROW_HEIGHT - SLOT_HEIGHT) / 2;
      const startEdgeX = rowLeft;
      const endEdgeX = rowLeft + rowWidth;
      return { ...row, rowIndex, slotCount, rowWidth, rowLeft, yCenter, top, startEdgeX, endEdgeX };
    });
  }, [allRows, containerWidth]);

  const svgHeight = allRows.length * ROW_HEIGHT;

  const snakePath = useMemo(() => {
    if (rowLayouts.length === 0) return "";
    const parts: string[] = [];
    rowLayouts.forEach((row, idx) => {
      if (row.slotCount === 0) return;
      if (idx === 0) parts.push(`M ${row.startEdgeX} ${row.yCenter}`);
      parts.push(`L ${row.endEdgeX} ${row.yCenter}`);
      const next = rowLayouts[idx + 1];
      if (!next || next.slotCount === 0) return;
      const gapY = (row.yCenter + next.yCenter) / 2;
      parts.push(`A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${row.endEdgeX + ARC_RADIUS} ${row.yCenter + ARC_RADIUS}`);
      parts.push(`L ${row.endEdgeX + ARC_RADIUS} ${gapY - ARC_RADIUS}`);
      parts.push(`A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${row.endEdgeX} ${gapY}`);
      parts.push(`L ${next.startEdgeX} ${gapY}`);
      parts.push(`A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 0 ${next.startEdgeX - ARC_RADIUS} ${gapY + ARC_RADIUS}`);
      parts.push(`L ${next.startEdgeX - ARC_RADIUS} ${next.yCenter - ARC_RADIUS}`);
      parts.push(`A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 0 ${next.startEdgeX} ${next.yCenter}`);
    });
    return parts.join(" ");
  }, [rowLayouts]);

  // Day badge positions (between rows when day changes)
  const dayBadgePositions = useMemo(() => {
    const positions: { x: number; y: number; day: BuilderDay }[] = [];
    rowLayouts.forEach((row, idx) => {
      if (!row.isFirstRowOfDay || row.dayIndex === 0) return;
      const prev = rowLayouts[idx - 1];
      if (!prev) return;
      positions.push({ x: containerWidth / 2, y: (prev.yCenter + row.yCenter) / 2, day: row.day });
    });
    return positions;
  }, [rowLayouts, containerWidth]);

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 pt-16">
        {/* Hero Header */}
        <section className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <Button variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-4 -ml-2" onClick={() => navigate("/my-trips")}>
                <ArrowLeft className="w-4 h-4 mr-1" /> My Trips
              </Button>

              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <input
                    value={trip.title}
                    onChange={(e) => setTrip((p) => ({ ...p, title: e.target.value }))}
                    className="text-3xl md:text-4xl font-bold bg-transparent border-none outline-none text-primary-foreground placeholder:text-primary-foreground/40 w-full"
                    placeholder="Trip Title"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-primary-foreground/10 rounded-lg px-3 py-1.5">
                      <MapPin className="w-4 h-4 text-primary-foreground/70" />
                      <input
                        value={trip.destination}
                        onChange={(e) => setTrip((p) => ({ ...p, destination: e.target.value }))}
                        className="bg-transparent border-none outline-none text-sm text-primary-foreground placeholder:text-primary-foreground/40 w-40"
                        placeholder="Destination"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 bg-primary-foreground/10 rounded-lg px-3 py-1.5">
                      <Users className="w-4 h-4 text-primary-foreground/70" />
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={trip.travelers}
                        onChange={(e) => setTrip((p) => ({ ...p, travelers: Number(e.target.value) || 1 }))}
                        className="bg-transparent border-none outline-none text-sm text-primary-foreground w-12"
                      />
                      <span className="text-sm text-primary-foreground/70">travelers</span>
                    </div>

                    {/* Rating Stars */}
                    <div className="flex items-center gap-1 bg-primary-foreground/10 rounded-lg px-3 py-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setTrip((p) => ({ ...p, rating: star }))}
                          className="hover:scale-110 transition-transform"
                        >
                          <Star
                            className={cn(
                              "w-4 h-4",
                              trip.rating && star <= trip.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-primary-foreground/30 hover:text-yellow-400"
                            )}
                          />
                        </button>
                      ))}
                    </div>

                    {/* Favorite */}
                    <button
                      type="button"
                      onClick={() => setTrip((p) => ({ ...p, isFavorite: !p.isFavorite }))}
                      className="flex items-center gap-1.5 bg-primary-foreground/10 hover:bg-primary-foreground/20 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      <Heart
                        className={cn(
                          "w-4 h-4",
                          trip.isFavorite
                            ? "fill-red-400 text-red-400"
                            : "text-primary-foreground/70"
                        )}
                      />
                      <span className="text-sm text-primary-foreground/70">
                        {trip.isFavorite ? 'Favorited' : 'Favorite'}
                      </span>
                    </button>
                  </div>

                  {/* Trip Review */}
                  <div className="mt-3">
                    <textarea
                      value={trip.review || ''}
                      onChange={(e) => setTrip((p) => ({ ...p, review: e.target.value }))}
                      placeholder="Add a review or notes about this trip..."
                      className="w-full bg-primary-foreground/10 rounded-lg px-3 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/40 border-none outline-none resize-none"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right mr-4">
                    <p className="text-primary-foreground/70 text-xs">Total Cost</p>
                    <p className="text-2xl font-bold">€{totalCost.toLocaleString()}</p>
                  </div>
                  <Button variant="secondary" size="sm" className="gap-1.5" onClick={saveTrip}>
                    <Save className="w-4 h-4" /> Save Trip
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Journey Section */}
        <section className="py-6 pb-12">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto" ref={containerRef}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Your Journey
                </h2>
                <Button variant="outline" size="sm" onClick={addDay}>
                  <Plus className="w-4 h-4 mr-1" /> Add Day
                </Button>
              </div>

              {/* First day header */}
              {trip.days.length > 0 && (
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center shadow-lg">1</div>
                  <div className="flex-1">
                    <input
                      value={trip.days[0].date}
                      onChange={(e) => setTrip((p) => ({ ...p, days: p.days.map((d, i) => i === 0 ? { ...d, date: e.target.value } : d) }))}
                      className="text-lg font-bold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground w-48"
                      placeholder="Date (e.g. Jan 15)"
                    />
                    <input
                      value={trip.days[0].theme}
                      onChange={(e) => setTrip((p) => ({ ...p, days: p.days.map((d, i) => i === 0 ? { ...d, theme: e.target.value } : d) }))}
                      className="text-sm text-muted-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground block"
                      placeholder="Day theme"
                    />
                  </div>
                  {trip.days.length > 1 && (
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeDay(trip.days[0].id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}

              {/* Journey Canvas */}
              <div className="relative" style={{ height: svgHeight }}>
                {/* SVG Snake Path */}
                <svg className="absolute inset-0 pointer-events-none" width={containerWidth} height={svgHeight} style={{ overflow: "visible" }}>
                  <defs>
                    <linearGradient id="builderSnakeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
                    </linearGradient>
                  </defs>
                  <path d={snakePath} fill="none" stroke="url(#builderSnakeGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d={snakePath} fill="none" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="8 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>

                {/* Day badges on connector lines */}
                {dayBadgePositions.map((pos, idx) => {
                  const dayIndex = trip.days.findIndex((d) => d.id === pos.day.id);
                  return (
                    <div key={idx} className="absolute flex items-center gap-2 bg-background px-3 py-1.5 rounded-full shadow-lg border border-border z-20" style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }}>
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center">{dayIndex + 1}</div>
                      <input
                        value={pos.day.date}
                        onChange={(e) => setTrip((p) => ({ ...p, days: p.days.map((d) => d.id === pos.day.id ? { ...d, date: e.target.value } : d) }))}
                        className="text-sm font-semibold text-foreground bg-transparent border-none outline-none w-24"
                        placeholder="Date"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive hover:bg-destructive/10" onClick={() => removeDay(pos.day.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}

                {/* Activity rows */}
                {rowLayouts.map((row) => (
                  <div key={`row-${row.rowIndex}`} className="absolute flex items-center" style={{ top: row.top, left: row.rowLeft, width: row.rowWidth }}>
                    {row.slots.map((slot, slotIndex) => {
                      const isAdd = slot === "add";
                      const showTransport = slotIndex > 0 && !isAdd;
                      const activity = isAdd ? null : (slot as BuilderActivity);

                      // Find the global activity index within the day
                      const dayActivities = trip.days[row.dayIndex]?.activities || [];
                      // Count activities in previous rows of the same day
                      let prevCount = 0;
                      for (const r of rowLayouts) {
                        if (r.dayIndex === row.dayIndex && r.rowIndex < row.rowIndex) {
                          prevCount += r.slots.filter((s) => s !== "add").length;
                        }
                      }
                      const actIndex = prevCount + slotIndex - (showTransport ? 0 : 0);
                      // Compute proper activity index excluding transport adjustments
                      const realSlotIndex = row.slots.slice(0, slotIndex).filter((s) => s !== "add").length;
                      const globalActIndex = prevCount + realSlotIndex;

                      // Determine if this activity can be dragged
                      const isDraggable = !isAdd && !(
                        trip.source === 'ai' &&
                        (activity!.type === 'flight' || activity!.type === 'accommodation')
                      );

                      const currentDayId = trip.days[row.dayIndex].id;
                      const isDragging = draggedItem?.dayId === currentDayId && draggedItem?.activityIndex === globalActIndex;
                      const isDragOver = !isAdd && dragOverItem?.dayId === currentDayId && dragOverItem?.activityIndex === globalActIndex;
                      const dropPosition = isDragOver ? dragOverItem?.position : undefined;

                      // For "Add Activity" slot
                      const isAddDragOver = isAdd && dragOverItem?.dayId === currentDayId && dragOverItem?.activityIndex === -1;

                      return (
                        <div key={isAdd ? `add-${row.dayIndex}` : activity!.id} className="flex items-center">
                          {showTransport && activity && (
                            <div className="flex items-center justify-center" style={{ width: GAP + TRANSPORT_WIDTH }}>
                              <TransportBubble type={activity.transportType} duration={activity.transportDuration} />
                            </div>
                          )}
                          {isAdd ? (
                            <AddSlotCard
                              onClick={() => openAddActivity(trip.days[row.dayIndex].id)}
                              isDragOver={isAddDragOver}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Dropping on "Add Activity" means append to end of day
                                setDragOverItem({ dayId: currentDayId, activityIndex: -1, position: 'after' });
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (draggedItem && dragOverItem) {
                                  const targetDay = trip.days[row.dayIndex];
                                  const lastIndex = targetDay.activities.length - 1;
                                  reorderActivity(
                                    draggedItem.dayId,
                                    draggedItem.activityIndex,
                                    currentDayId,
                                    lastIndex,
                                    'after'
                                  );
                                }
                                setDraggedItem(null);
                                setDragOverItem(null);
                              }}
                            />
                          ) : (
                            <BuilderSlot
                              activity={activity!}
                              onEdit={() => openEditActivity(trip.days[row.dayIndex].id, globalActIndex, activity!)}
                              onDelete={() => deleteActivity(trip.days[row.dayIndex].id, globalActIndex)}
                              isDraggable={isDraggable}
                              isDragging={isDragging}
                              isDragOver={isDragOver}
                              dropPosition={dropPosition}
                              onDragStart={(e) => {
                                e.stopPropagation();
                                setDraggedItem({ dayId: currentDayId, activityIndex: globalActIndex });
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();

                                // Calculate position based on mouse X relative to slot center
                                const rect = e.currentTarget.getBoundingClientRect();
                                const mouseX = e.clientX;
                                const slotCenterX = rect.left + rect.width / 2;
                                const position: 'before' | 'after' = mouseX < slotCenterX ? 'before' : 'after';

                                setDragOverItem({ dayId: currentDayId, activityIndex: globalActIndex, position });
                              }}
                              onDragEnd={() => {
                                if (draggedItem && dragOverItem && dragOverItem.activityIndex !== -1) {
                                  reorderActivity(
                                    draggedItem.dayId,
                                    draggedItem.activityIndex,
                                    dragOverItem.dayId,
                                    dragOverItem.activityIndex,
                                    dragOverItem.position
                                  );
                                }
                                setDraggedItem(null);
                                setDragOverItem(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Pencil className="w-3 h-3" />
                  <span>Click activity to edit</span>
                </div>
                <div className="flex items-center gap-2">
                  <Plus className="w-3 h-3" />
                  <span>Click + to add a new activity</span>
                </div>
                <div className="flex items-center gap-2">
                  <GripVertical className="w-3 h-3" />
                  <span>Drag to reorder activities</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Activity Dialog */}
      <ActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activity={editingActivity}
        onSave={handleSaveActivity}
        isFirst={editingIndex === 0 || (editingIndex === -1 && (trip.days.find((d) => d.id === editingDayId)?.activities.length || 0) === 0)}
      />
    </div>
  );
};

export default TripBuilder;
