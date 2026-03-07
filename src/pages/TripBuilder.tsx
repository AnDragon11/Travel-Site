import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Plane, Hotel, Utensils, Camera, MapPin, Clock, Plus, Trash2, Pencil, Save,
  Ticket, Coffee, ShoppingBag, Bus, Car, Train, Footprints, ImagePlus,
  Calendar as CalendarIcon, Users, ArrowLeft, GripVertical, Heart, Tag, Share2, LogOut, Link2,
  ChevronDown, Upload, X as XIcon, ExternalLink, Undo2, Redo2,
} from "lucide-react";
import { toast } from "sonner";

// ─── Configs (matching Itinerary page) ─────────────────────────────
const activityTypeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  flight: { icon: Plane, color: "text-sky-500", bgColor: "bg-sky-50 dark:bg-sky-950 border-sky-200 dark:border-sky-800", label: "Flight / Airport" },
  accommodation: { icon: Hotel, color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800", label: "Hotel / Stay" },
  dining: { icon: Utensils, color: "text-orange-500", bgColor: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800", label: "Dining" },
  cafe: { icon: Coffee, color: "text-amber-500", bgColor: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800", label: "Café" },
  sightseeing: { icon: Camera, color: "text-emerald-500", bgColor: "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800", label: "Sightseeing" },
  activity: { icon: Ticket, color: "text-purple-500", bgColor: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800", label: "Activity" },
  transport: { icon: Bus, color: "text-cyan-500", bgColor: "bg-cyan-50 dark:bg-cyan-950 border-cyan-200 dark:border-cyan-800", label: "Transport" },
  shopping: { icon: ShoppingBag, color: "text-pink-500", bgColor: "bg-pink-50 dark:bg-pink-950 border-pink-200 dark:border-pink-800", label: "Shopping" },
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
  booking_url?: string;     // Link to booking page
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
import { loadTrips, saveTrip as saveToStorage, rowToSavedTrip } from "@/services/storageService";
import { SavedTrip } from "@/lib/tripTypes";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Collaborator, getCollaborators, getTripRole, leaveTrip, getTripOwnerProfile, transferOwnership,
} from "@/services/collaboratorService";
import ShareTripModal from "@/components/ShareTripModal";
import CollaboratorAvatars from "@/components/CollaboratorAvatars";

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
  booking_url: "",
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
          "relative group flex flex-col rounded-xl border transition-all duration-200 w-[200px] shrink-0 bg-card overflow-hidden hover:shadow-lg hover:-translate-y-1",
          activity.booking_url ? "min-h-[268px]" : "h-[240px]",
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
        <img
          src={imageUrl}
          alt={activity.name || "Activity"}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => { e.currentTarget.src = placeholderImages[activity.type] || placeholderImages.activity; }}
        />
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
        {activity.booking_url && (
          <a
            href={activity.booking_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 active:bg-primary/30 text-primary text-[10px] font-semibold rounded-xl transition-colors w-full justify-center border border-primary/20"
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            Book / View Link
          </a>
        )}
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
      "flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 transition-all duration-200 w-[200px] h-[240px] shrink-0 bg-muted hover:bg-muted/80 cursor-pointer group",
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
  isEditing = false,
  onLiveSave,
  onRevert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: BuilderActivity;
  onSave: (a: BuilderActivity) => void;
  isFirst: boolean;
  isEditing?: boolean;
  onLiveSave?: (a: BuilderActivity) => void;
  onRevert?: (original: BuilderActivity) => void;
}) => {
  const [form, setForm] = useState<BuilderActivity>(activity);
  const originalRef = useRef<BuilderActivity>(activity);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFetchingImage, setIsFetchingImage] = useState(false);

  useEffect(() => { originalRef.current = activity; setForm(activity); }, [activity]);

  const fetchLinkImage = async () => {
    const url = form.booking_url?.trim();
    if (!url) return;
    setIsFetchingImage(true);
    try {
      // microlink.io: works with bot-protected sites, returns structured OG data
      const resp = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(12000),
      });
      const data = await resp.json();
      const imageUrl: string | undefined =
        data?.data?.image?.url ??
        data?.data?.screenshot?.url;
      if (imageUrl) {
        updateForm({ image_url: imageUrl });
        toast.success("Image fetched from link!");
      } else {
        toast.error("No preview image found at this URL");
      }
    } catch {
      toast.error("Could not fetch image from link");
    } finally {
      setIsFetchingImage(false);
    }
  };

  // In edit mode: immediately propagate every change to the trip (triggers auto-save).
  // In add mode: changes stay local until "Add Activity" is clicked.
  const updateForm = (updates: Partial<BuilderActivity>) => {
    const updated = { ...form, ...updates };
    setForm(updated);
    if (isEditing) onLiveSave?.(updated);
  };

  const handleCommit = () => {
    if (!form.name.trim()) {
      toast.error("Activity name is required");
      return;
    }
    onSave(form);
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (isEditing) onRevert?.(originalRef.current);
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
    reader.onloadend = () => updateForm({ image_url: reader.result as string });
    reader.readAsDataURL(file);
  };

  const imagePreview = form.image_url || placeholderImages[form.type] || placeholderImages.activity;
  const typeConfig = activityTypeConfig[form.type] ?? activityTypeConfig.activity;
  const TypeIcon = typeConfig.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
      <DialogContent className="w-full max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <span className={cn("p-1.5 rounded-lg", typeConfig.bgColor)}>
              <TypeIcon className={cn("w-4 h-4", typeConfig.color)} />
            </span>
            {isEditing ? "Edit Activity" : "Add Activity"}
          </DialogTitle>
          <DialogDescription className="sr-only">Fill in the details for this activity.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="grid lg:grid-cols-[1fr_260px] gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">
            {/* ── Left: form ── */}
            <div className="p-6 space-y-4">
              {/* Type selector — visual icon row */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Type</Label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(activityTypeConfig).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    const active = form.type === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateForm({ type: key })}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
                          active
                            ? cn("border-transparent", cfg.bgColor, cfg.color)
                            : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input
                  value={form.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                  placeholder="e.g. Visit Eiffel Tower"
                  autoFocus
                />
              </div>

              {/* Time + Duration + Cost in one row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Time</Label>
                  <Input type="time" value={form.time} onChange={(e) => updateForm({ time: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Duration</Label>
                  <Input value={form.duration} onChange={(e) => updateForm({ duration: e.target.value })} placeholder="2h" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cost (€)</Label>
                  <Input type="number" min={0} value={form.cost || ""} onChange={(e) => updateForm({ cost: Number(e.target.value) || 0 })} placeholder="0" />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => updateForm({ location: e.target.value })} placeholder="e.g. Champ de Mars, Paris" />
              </div>

              {/* Transport (if not first) */}
              {!isFirst && (
                <div className="space-y-1.5 p-3 rounded-lg bg-muted/50 border border-border/50">
                  <Label className="text-xs text-muted-foreground">Transport to this activity</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={form.transportType} onValueChange={(v) => updateForm({ transportType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {transportTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            <span className="flex items-center gap-2"><t.icon className="w-3.5 h-3.5" />{t.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input value={form.transportDuration} onChange={(e) => updateForm({ transportDuration: e.target.value })} placeholder="15 min" />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => updateForm({ notes: e.target.value })} placeholder="Booking tips, visa notes, opening hours..." rows={2} />
              </div>

              {/* Booking URL */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  Booking Link
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={form.booking_url || ""}
                    onChange={(e) => updateForm({ booking_url: e.target.value })}
                    placeholder="https://booking.com/..."
                    className="flex-1 text-sm"
                  />
                  {form.booking_url?.trim() && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isFetchingImage}
                      onClick={fetchLinkImage}
                      title="Fetch preview image from this link"
                    >
                      {isFetchingImage ? (
                        <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ImagePlus className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  )}
                </div>
                {form.booking_url?.trim() && (
                  <a href={form.booking_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline w-fit">
                    <ExternalLink className="w-3 h-3" /> Open link
                  </a>
                )}
              </div>
            </div>

            {/* ── Right: image + live preview ── */}
            <div className="p-6 space-y-4 bg-muted/20">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Image</Label>
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border/50 bg-muted group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ImagePlus className="w-6 h-6 text-white" />
                  </div>
                </div>
                <Input
                  value={form.image_url?.startsWith("data:") ? "" : form.image_url}
                  onChange={(e) => updateForm({ image_url: e.target.value })}
                  placeholder="Paste image URL…"
                  className="text-xs h-8"
                />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>

              {/* Mini card preview */}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Preview</p>
                <div className={cn("rounded-xl border p-3 text-sm space-y-1", typeConfig.bgColor)}>
                  <div className={cn("flex items-center gap-1.5 font-semibold", typeConfig.color)}>
                    <TypeIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{form.name || "Activity name"}</span>
                  </div>
                  {form.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{form.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                    {form.time && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{form.time}</span>}
                    {form.duration && <span>{form.duration}</span>}
                    {form.cost > 0 && <span className="ml-auto font-semibold text-foreground">€{form.cost}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          {isEditing ? (
            <Button onClick={() => onOpenChange(false)}>
              Done
            </Button>
          ) : (
            <Button onClick={handleCommit}>
              <Save className="w-4 h-4 mr-1" />
              Add Activity
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────
const TripBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const fromExplore = (location.state as { from?: string } | null)?.from === 'explore';
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1000);

  // Collaboration state
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isOwner, setIsOwner] = useState<boolean | null>(null); // null = role not yet determined
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null); // current user has pending invite for this trip
  const [ownerProfile, setOwnerProfile] = useState<{ display_name: string | null; handle: string | null; avatar_url: string | null } | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const tripUpdatedAtRef = useRef<string>("");
  const [shareOpen, setShareOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [thumbnailPickerOpen, setThumbnailPickerOpen] = useState(false);
  const [openDayPicker, setOpenDayPicker] = useState<string | null>(null); // day ID with open calendar picker

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const skipAutoSaveRef = useRef(0); // incremented before programmatic setTrip calls to skip auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tripLoadedRef = useRef(false); // true once trip is fully loaded; prevents double-load on authLoading change

  // Undo / Redo history (up to 10 steps)
  const undoStackRef = useRef<SavedTrip[]>([]);
  const redoStackRef = useRef<SavedTrip[]>([]);
  const prevTripRef = useRef<SavedTrip | null>(null); // previous trip value for history tracking
  const [historySize, setHistorySize] = useState(0);
  const [futureSize, setFutureSize] = useState(0);

  const [trip, setTrip] = useState<SavedTrip>({
    id: crypto.randomUUID(),
    source: 'custom',
    title: "My Trip",
    destination: "",
    travelers: 1,
    days: [createEmptyDay(1)],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Load existing trip if editing — only runs once per trip (tripLoadedRef prevents double-load on authLoading change)
  useEffect(() => {
    const stateTrip = (location.state as { trip?: SavedTrip } | null)?.trip;
    if (stateTrip) {
      if (!tripLoadedRef.current) {
        tripLoadedRef.current = true;
        skipAutoSaveRef.current++;
        setTrip(stateTrip);
      }
      return;
    }
    if (!id || authLoading || tripLoadedRef.current) return;
    loadTrips().then(async trips => {
      const found = trips.find(t => t.id === id);
      if (found) {
        tripLoadedRef.current = true;
        tripUpdatedAtRef.current = found.updatedAt;
        skipAutoSaveRef.current++;
        setTrip(found);
        return;
      }
      // Not in user's trips — try fetching directly (shared link, public trip)
      const { data } = await supabase.from("trips").select("*").eq("id", id).maybeSingle();
      if (data) {
        tripLoadedRef.current = true;
        tripUpdatedAtRef.current = data.updated_at ?? "";
        skipAutoSaveRef.current++;
        setTrip(rowToSavedTrip(data as Parameters<typeof rowToSavedTrip>[0]));
      } else if (!user) {
        navigate(`/login?redirect=/trip/${id}`, { replace: true });
      }
    });
  }, [id, authLoading]);

  // Determine role, load collaborators, and resolve owner profile
  useEffect(() => {
    if (!user) return;

    // New unsaved trip — current user is always the owner
    if (!id) {
      setIsOwner(true);
      setOwnerProfile({
        display_name: user.user_metadata?.display_name ?? null,
        handle: user.user_metadata?.handle ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      });
      return;
    }

    getTripRole(id, user.id).then(role => {
      if (role === "owner") {
        setIsOwner(true);
        setOwnerProfile({
          display_name: user.user_metadata?.display_name ?? null,
          handle: user.user_metadata?.handle ?? null,
          avatar_url: user.user_metadata?.avatar_url ?? null,
        });
      } else if (role === "editor") {
        setIsOwner(false);
        getTripOwnerProfile(id).then(p => { if (p) setOwnerProfile(p); }).catch(() => {});
      } else {
        // null = pending invite or no access — show pending invite banner
        setIsOwner(false);
        getTripOwnerProfile(id).then(p => { if (p) setOwnerProfile(p); }).catch(() => {});
        // Find this user's pending invite id for the accept button
        supabase.from("trip_collaborators")
          .select("id")
          .eq("trip_id", id)
          .eq("user_id", user.id)
          .eq("status", "pending")
          .maybeSingle()
          .then(({ data }) => { if (data) setPendingInviteId(data.id); });
      }
    });
    getCollaborators(id).then(setCollaborators).catch(() => {});
  }, [id, user]);

  // Real-time sync — two separate channels to prevent broadcast/postgres_changes conflicts
  useEffect(() => {
    if (!id) return;

    // Channel 1: broadcast-only for trip content sync between collaborators
    const broadcastChannel = supabase
      .channel(`trip-collab:${id}`, { config: { broadcast: { self: false, ack: false } } })
      .on("broadcast", { event: "trip_updated" }, ({ payload }) => {
        const { updatedAt, days } = payload as { updatedAt: string; days: BuilderDay[] };
        if (updatedAt <= tripUpdatedAtRef.current) return;
        toast.info("Trip updated by a collaborator");
        skipAutoSaveRef.current++;
        tripUpdatedAtRef.current = updatedAt;
        setTrip(prev => ({ ...prev, days, updatedAt }));
      })
      .subscribe();

    realtimeChannelRef.current = broadcastChannel;

    // Channel 2: postgres_changes for collaborator list updates only
    const pgChannel = supabase
      .channel(`trip-collabs-pg:${id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "trip_collaborators",
        filter: `trip_id=eq.${id}`,
      }, () => {
        getCollaborators(id).then(setCollaborators).catch(() => {});
      })
      .subscribe();

    return () => {
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(pgChannel);
      realtimeChannelRef.current = null;
    };
  }, [id]);

  // Polling fallback: if broadcast fails, catch changes within 5s by comparing updated_at
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from("trips")
          .select("updated_at")
          .eq("id", id)
          .maybeSingle();
        if (data?.updated_at && data.updated_at > tripUpdatedAtRef.current) {
          const { data: full } = await supabase.from("trips").select("*").eq("id", id).maybeSingle();
          if (full) {
            toast.info("Trip updated by a collaborator");
            skipAutoSaveRef.current++;
            tripUpdatedAtRef.current = full.updated_at ?? tripUpdatedAtRef.current;
            setTrip(rowToSavedTrip(full as Parameters<typeof rowToSavedTrip>[0]));
          }
        }
      } catch { /* ignore poll errors */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [id]);

  // Unmount cleanup for auto-save timers
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // Auto-save: fires 1.5s after any user-triggered trip change.
  // Does NOT return a cleanup — timers are cleared at the top of each non-skip run,
  // so a programmatic setTrip (skip run) never cancels a pending user-edit save.
  useEffect(() => {
    if (skipAutoSaveRef.current > 0) {
      skipAutoSaveRef.current--;
      prevTripRef.current = trip; // keep prev in sync for programmatic changes
      return;
    }
    // User-initiated change: push previous trip state to undo history
    if (prevTripRef.current !== null) {
      undoStackRef.current = [...undoStackRef.current.slice(-9), prevTripRef.current];
      redoStackRef.current = [];
      setHistorySize(undoStackRef.current.length);
      setFutureSize(0);
    }
    prevTripRef.current = trip;
    // Never auto-save a brand-new trip in its default empty state — only save once
    // the user has actually added something (title, destination, or any named activity).
    // Also guard when `id` is in the URL but the trip was never found/loaded (tripLoadedRef stays false).
    if (!id || !tripLoadedRef.current) {
      const hasContent =
        trip.title.trim() !== "" && trip.title !== "My Trip" ||
        trip.destination.trim() !== "" ||
        trip.days.some(d => d.activities.some(a => a.name.trim() !== ""));
      if (!hasContent) return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setAutoSaveStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      try {
        let updated = { ...trip, updatedAt: new Date().toISOString() };

        // Pre-save merge: pull in any days added by collaborators that we don't have locally
        if (id) {
          const { data: dbCurrent } = await supabase
            .from("trips")
            .select("updated_at, days")
            .eq("id", updated.id)
            .maybeSingle();
          if (dbCurrent?.updated_at && dbCurrent.updated_at > tripUpdatedAtRef.current) {
            const dbDays = (dbCurrent.days as BuilderDay[]) ?? [];
            const localDayIds = new Set(updated.days.map((d: BuilderDay) => d.id));
            const newFromDB = dbDays.filter((d: BuilderDay) => !localDayIds.has(d.id));
            if (newFromDB.length > 0) {
              const mergedDays = [...updated.days, ...newFromDB];
              updated = { ...updated, days: mergedDays };
              skipAutoSaveRef.current++;
              tripUpdatedAtRef.current = dbCurrent.updated_at;
              setTrip(prev => ({ ...prev, days: mergedDays }));
            }
          }
        }

        await saveToStorage(updated);
        // Sync local updatedAt to what was written to DB so broadcast/poll echo is ignored
        tripUpdatedAtRef.current = updated.updatedAt;
        skipAutoSaveRef.current++;
        setTrip(prev => ({ ...prev, updatedAt: updated.updatedAt }));
        // Broadcast change to all collaborators on the same channel
        realtimeChannelRef.current?.send({
          type: "broadcast",
          event: "trip_updated",
          payload: { updatedAt: updated.updatedAt, days: updated.days },
        });
        setAutoSaveStatus("saved");
        savedTimerRef.current = setTimeout(() => setAutoSaveStatus("idle"), 2500);
        // For new trips, mark as loaded before navigating so the load effect doesn't re-fetch
        if (!id) {
          tripLoadedRef.current = true;
          navigate(`/trip/${updated.id}`, { replace: true });
        }
      } catch {
        setAutoSaveStatus("error");
      }
    }, 1500);
  }, [trip]);

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

  // Live-save: called on every field change when editing an existing activity
  const handleLiveSaveActivity = (a: BuilderActivity) => {
    if (editingIndex < 0) return;
    setTrip((p) => ({
      ...p,
      days: p.days.map((d) => {
        if (d.id !== editingDayId) return d;
        const acts = [...d.activities];
        acts[editingIndex] = a;
        return { ...d, activities: acts };
      }),
    }));
  };

  // Revert: called on Cancel when editing — restores the original activity state
  const handleRevertActivity = (original: BuilderActivity) => {
    if (editingIndex < 0) return;
    setTrip((p) => ({
      ...p,
      days: p.days.map((d) => {
        if (d.id !== editingDayId) return d;
        const acts = [...d.activities];
        acts[editingIndex] = original;
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

  // ─── Day Date with auto-populate ───────────────────────────────
  // Format a Date object to YYYY-MM-DD using local timezone (avoids UTC shift off-by-one)
  const localDateStr = (dt: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  };

  const handleDayDateChange = (dayId: string, dateStr: string) => {
    if (!dateStr) {
      setTrip(p => ({ ...p, days: p.days.map(d => d.id === dayId ? { ...d, date: dateStr } : d) }));
      return;
    }
    const changedIdx = trip.days.findIndex(d => d.id === dayId);
    if (changedIdx < 0) return;
    const base = new Date(dateStr + "T00:00:00");
    setTrip(p => ({
      ...p,
      days: p.days.map((d, i) => {
        const offset = i - changedIdx;
        const dt = new Date(base);
        dt.setDate(base.getDate() + offset);
        return { ...d, date: localDateStr(dt) };
      }),
    }));
  };

  // ─── Undo / Redo ───────────────────────────────────────────────
  const handleUndo = () => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    redoStackRef.current = [...redoStackRef.current, trip];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    setHistorySize(undoStackRef.current.length);
    setFutureSize(redoStackRef.current.length);
    skipAutoSaveRef.current++;
    prevTripRef.current = prev;
    setTrip(prev);
  };

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current[redoStackRef.current.length - 1];
    undoStackRef.current = [...undoStackRef.current, trip];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    setHistorySize(undoStackRef.current.length);
    setFutureSize(redoStackRef.current.length);
    skipAutoSaveRef.current++;
    prevTripRef.current = next;
    setTrip(next);
  };

  // Stable refs so keyboard handler never goes stale
  const undoHandlerRef = useRef(handleUndo);
  const redoHandlerRef = useRef(handleRedo);
  undoHandlerRef.current = handleUndo;
  redoHandlerRef.current = handleRedo;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undoHandlerRef.current(); }
      else if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); redoHandlerRef.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/trip/${id}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success("Link copied to clipboard!"))
      .catch(() => toast.error("Could not copy link"));
  };

  const handleLeaveTrip = async () => {
    if (!id) return;
    try {
      if (isOwner) {
        // Transfer to oldest accepted collaborator before leaving
        const accepted = collaborators
          .filter(c => c.status === "accepted")
          .sort((a, b) => new Date(a.accepted_at ?? a.invited_at).getTime() - new Date(b.accepted_at ?? b.invited_at).getTime());
        if (accepted.length === 0) {
          toast.error("You're the only person on this trip. Delete it instead.");
          return;
        }
        await transferOwnership(id, accepted[0].user_id);
        toast.success(`Ownership transferred to @${accepted[0].profile.handle ?? accepted[0].profile.display_name}`);
      } else {
        await leaveTrip(id);
        toast.success("You've left the trip");
      }
      navigate("/profile");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to leave trip");
    }
  };

  const handleAcceptInvite = async () => {
    if (!pendingInviteId) return;
    try {
      const { error } = await supabase
        .from("trip_collaborators")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", pendingInviteId);
      if (error) throw error;
      setPendingInviteId(null);
      setIsOwner(false);
      getCollaborators(id!).then(setCollaborators).catch(() => {});
      toast.success("You've joined the trip!");
    } catch {
      toast.error("Failed to accept invite");
    }
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
  const TOP_OFFSET = 80; // extra space at top for Day 1 badge

  const availableWidth = containerWidth - PADDING * 2;
  const slotsPerRow = Math.max(1, Math.floor((availableWidth + GAP + TRANSPORT_WIDTH) / SLOT_WITH_GAP));

  const totalCost = trip.days.reduce((t, d) => t + d.activities.reduce((s, a) => s + (a.cost || 0), 0), 0);

  // Key activities for the overview panel (flights + hotel check-in/out only)
  const keyActivities = useMemo(() =>
    trip.days.flatMap((day, di) =>
      day.activities
        .filter(a => a.type === "flight" || a.type === "accommodation")
        .map(a => ({ ...a, dayLabel: day.date || `Day ${di + 1}` }))
    ),
  [trip.days]);

  // All activity image URLs available for thumbnail selection
  const activityImages = useMemo(() =>
    [...new Set(
      trip.days.flatMap(d => d.activities.map(a => a.image_url)).filter(Boolean)
    )],
  [trip.days]);

  // Build all rows across all days (+ add slot per day)
  interface RowData {
    dayIndex: number;
    slots: (BuilderActivity | "add")[];
    isFirstRowOfDay: boolean;
    rowIndexInDay: number;
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
        rows.push({ dayIndex, slots: rowSlots, isFirstRowOfDay: ri === 0, rowIndexInDay: ri, day });
      });
    });
    return rows;
  }, [trip.days, slotsPerRow]);

  const step = SLOT_WIDTH + GAP + TRANSPORT_WIDTH;
  const getRowWidth = (n: number) => n * SLOT_WIDTH + Math.max(0, n - 1) * (GAP + TRANSPORT_WIDTH);

  const rowLayouts = useMemo(() => {
    return allRows.map((row, rowIndex) => {
      const isRTL = row.rowIndexInDay % 2 === 1; // odd rows within a day serpentine right-to-left
      const slotCount = row.slots.length;
      const rowWidth = getRowWidth(slotCount);
      // RTL rows are right-aligned so the last activity aligns with the right edge
      const rowLeft = isRTL ? PADDING + availableWidth - rowWidth : PADDING;
      const yCenter = rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2 + TOP_OFFSET;
      const top = rowIndex * ROW_HEIGHT + (ROW_HEIGHT - SLOT_HEIGHT) / 2 + TOP_OFFSET;
      // Path enters from the direction the snake is coming from
      const startEdgeX = isRTL ? PADDING + availableWidth : PADDING;
      const endEdgeX = isRTL ? PADDING + availableWidth - rowWidth : PADDING + rowWidth;
      return { ...row, rowIndex, slotCount, rowWidth, rowLeft, yCenter, top, startEdgeX, endEdgeX, isRTL };
    });
  }, [allRows, containerWidth]);

  const svgHeight = allRows.length * ROW_HEIGHT + TOP_OFFSET;

  const snakePath = useMemo(() => {
    if (rowLayouts.length === 0) return "";
    const R = ARC_RADIUS;
    const parts: string[] = [];
    rowLayouts.forEach((row, idx) => {
      if (row.slotCount === 0) return;
      if (idx === 0) {
        // Start from Day 1 badge, arc left → down → right (mirrors how day-change transitions work)
        const badgeCx = containerWidth / 2;
        const badgeBottomY = TOP_OFFSET / 2 + 22;
        const R = ARC_RADIUS;
        parts.push(`M ${badgeCx} ${badgeBottomY}`);
        parts.push(`L ${PADDING} ${badgeBottomY}`);
        parts.push(`A ${R} ${R} 0 0 0 ${PADDING - R} ${badgeBottomY + R}`);
        parts.push(`L ${PADDING - R} ${row.yCenter - R}`);
        parts.push(`A ${R} ${R} 0 0 0 ${PADDING} ${row.yCenter}`);
      }
      parts.push(`L ${row.endEdgeX} ${row.yCenter}`);
      const next = rowLayouts[idx + 1];
      if (!next || next.slotCount === 0) return;
      const gapY = (row.yCenter + next.yCenter) / 2;
      const leftEdge = PADDING;
      const rightEdge = PADDING + availableWidth;

      if (!row.isRTL && next.isRTL) {
        // CASE 1: LTR → RTL (same-day overflow) — U-turn on the RIGHT wall
        // Line extends to the right wall, arcs down, comes back heading left into RTL row
        parts.push(`L ${rightEdge} ${row.yCenter}`);
        parts.push(`A ${R} ${R} 0 0 1 ${rightEdge + R} ${row.yCenter + R}`);
        parts.push(`L ${rightEdge + R} ${next.yCenter - R}`);
        parts.push(`A ${R} ${R} 0 0 1 ${rightEdge} ${next.yCenter}`);
      } else if (!row.isRTL && !next.isRTL) {
        // CASE 2: LTR → LTR (day change) — right wall U-turn then traverse to left wall
        parts.push(`L ${rightEdge} ${row.yCenter}`);
        parts.push(`A ${R} ${R} 0 0 1 ${rightEdge + R} ${row.yCenter + R}`);
        parts.push(`L ${rightEdge + R} ${gapY - R}`);
        parts.push(`A ${R} ${R} 0 0 1 ${rightEdge} ${gapY}`);
        parts.push(`L ${leftEdge} ${gapY}`);
        parts.push(`A ${R} ${R} 0 0 0 ${leftEdge - R} ${gapY + R}`);
        parts.push(`L ${leftEdge - R} ${next.yCenter - R}`);
        parts.push(`A ${R} ${R} 0 0 0 ${leftEdge} ${next.yCenter}`);
      } else if (row.isRTL && !next.isRTL) {
        // CASE 3: RTL → LTR (day change) — U-turn on the LEFT wall
        // Line extends to the left wall, arcs down, comes back heading right into LTR row
        parts.push(`L ${leftEdge} ${row.yCenter}`);
        parts.push(`A ${R} ${R} 0 0 0 ${leftEdge - R} ${row.yCenter + R}`);
        parts.push(`L ${leftEdge - R} ${next.yCenter - R}`);
        parts.push(`A ${R} ${R} 0 0 0 ${leftEdge} ${next.yCenter}`);
      } else {
        // CASE 4: RTL → RTL (3rd row of same day) — left wall U-turn then traverse to right wall
        parts.push(`L ${leftEdge} ${row.yCenter}`);
        parts.push(`A ${R} ${R} 0 0 0 ${leftEdge - R} ${row.yCenter + R}`);
        parts.push(`L ${leftEdge - R} ${gapY - R}`);
        parts.push(`A ${R} ${R} 0 0 0 ${leftEdge} ${gapY}`);
        parts.push(`L ${rightEdge} ${gapY}`);
        parts.push(`A ${R} ${R} 0 0 1 ${rightEdge + R} ${gapY + R}`);
        parts.push(`L ${rightEdge + R} ${next.yCenter - R}`);
        parts.push(`A ${R} ${R} 0 0 1 ${rightEdge} ${next.yCenter}`);
      }
    });
    return parts.join(" ");
  }, [rowLayouts]);

  // Day badge positions (between rows when day changes; Day 1 at top center)
  const dayBadgePositions = useMemo(() => {
    const positions: { x: number; y: number; day: BuilderDay }[] = [];
    rowLayouts.forEach((row, idx) => {
      if (!row.isFirstRowOfDay) return;
      if (row.dayIndex === 0) {
        positions.push({ x: containerWidth / 2, y: TOP_OFFSET / 2, day: row.day });
      } else {
        const prev = rowLayouts[idx - 1];
        if (!prev) return;
        positions.push({ x: containerWidth / 2, y: (prev.yCenter + row.yCenter) / 2, day: row.day });
      }
    });
    return positions;
  }, [rowLayouts, containerWidth]);

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      {id && (
        <ShareTripModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          tripId={id}
          tripTitle={trip.title}
        />
      )}
      <main className="flex-1 pt-16">
        {/* Hero Header */}
        <section className="relative text-primary-foreground py-8 md:py-12 overflow-hidden">
          {/* Base gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />

          {/* Thumbnail — full-width background, scaled 110% to avoid hard edges, diagonal gradient overlay */}
          {trip.thumbnail && (
            <>
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${trip.thumbnail})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center right",
                  transform: "scale(1.1)",
                }}
              />
              {/* Diagonal gradient: fully opaque primary on text side, fades to semi-transparent right */}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(108deg, hsl(var(--primary)) 38%, hsl(var(--primary)/0.9) 52%, hsl(var(--primary)/0.55) 68%, hsl(var(--primary)/0.15) 85%)" }}
              />
            </>
          )}

          {/* Content */}
          <div className="relative z-10 container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 -ml-2" onClick={() => navigate(fromExplore ? "/explore" : "/profile")}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> {fromExplore ? "Explore" : "My Trips"}
                </Button>

                {/* Change thumbnail button */}
                <button
                  onClick={() => setThumbnailPickerOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-primary-foreground/60 hover:text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 rounded-lg px-2.5 py-1.5 transition-colors"
                  title="Change cover photo"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  {trip.thumbnail ? "Change Cover" : "Set Cover"}
                </button>
              </div>

              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                {/* Left: title, meta, action buttons */}
                <div className="space-y-3 flex-1 max-w-xl">
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
                  </div>

                  {/* Collaborate / Share buttons — left side */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {isOwner && id && (
                      <div className="flex items-center rounded-md overflow-hidden border border-primary-foreground/20 text-sm shrink-0">
                        <button
                          onClick={() => setShareOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
                          title="Invite collaborators"
                        >
                          <Users className="w-3.5 h-3.5" /> Collaborate
                        </button>
                        <div className="w-px self-stretch bg-primary-foreground/20" />
                        <button
                          onClick={handleCopyLink}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
                          title="Copy share link"
                        >
                          <Link2 className="w-3.5 h-3.5" /> Share Link
                        </button>
                      </div>
                    )}

                    {/* Auto-save status — always rendered, opacity toggle avoids layout shifts */}
                    <span className={cn(
                      "flex items-center gap-1 text-xs shrink-0 transition-opacity duration-300 w-16",
                      autoSaveStatus === "idle" ? "opacity-0 pointer-events-none" : "opacity-100",
                      autoSaveStatus === "error" ? "text-red-300" : "text-primary-foreground/60"
                    )}>
                      {autoSaveStatus === "saving" && (
                        <><span className="w-3 h-3 border border-primary-foreground/40 border-t-transparent rounded-full animate-spin shrink-0" />Saving…</>
                      )}
                      {autoSaveStatus === "saved" && (
                        <><Save className="w-3 h-3 shrink-0" />Saved</>
                      )}
                      {autoSaveStatus === "error" && "Save failed"}
                    </span>

                    {/* Collaborator: leave trip */}
                    {isOwner === false && id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                        onClick={handleLeaveTrip}
                      >
                        <LogOut className="w-4 h-4" /> Leave Trip
                      </Button>
                    )}
                  </div>
                </div>

                {/* Right: avatars + total cost */}
                <div className="flex items-center gap-3 shrink-0">
                  {(ownerProfile || collaborators.length > 0) && (
                    <CollaboratorAvatars collaborators={collaborators} ownerProfile={ownerProfile} />
                  )}
                  <div className="text-right">
                    <p className="text-primary-foreground/70 text-xs">Total Cost</p>
                    <p className="text-2xl font-bold">€{totalCost.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trip overview — collapsible strip below hero */}
        {keyActivities.length > 0 && (
          <div className="bg-card border-b border-border">
            <div className="container mx-auto px-4">
              <div className="max-w-6xl mx-auto">
                <button
                  onClick={() => setOverviewOpen(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2.5 w-full text-left"
                >
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform shrink-0", overviewOpen && "rotate-180")} />
                  {overviewOpen ? "Hide trip overview" : "Show trip overview"}
                  <span className="ml-1 text-muted-foreground/60">({keyActivities.length} key activities)</span>
                </button>
                {overviewOpen && (
                  <div className="pb-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                    {keyActivities.map((a) => (
                      <div key={a.id} className="flex items-center gap-2.5 text-sm bg-muted/50 rounded-lg px-3 py-2">
                        {a.type === "flight"
                          ? <Plane className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          : <Hotel className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        }
                        <span className="text-muted-foreground text-xs shrink-0 w-14">{a.dayLabel}</span>
                        <span className="text-muted-foreground text-xs shrink-0 w-10">{a.time}</span>
                        <span className="text-foreground font-medium truncate text-xs">{a.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pending invite banner */}
        {pendingInviteId && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-3">
            <div className="container mx-auto max-w-6xl flex items-center justify-between gap-4">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <span className="font-semibold">{ownerProfile?.display_name ?? ownerProfile?.handle ?? "Someone"}</span> invited you to collaborate on this trip.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" onClick={handleAcceptInvite} className="gap-1.5">
                  Accept & Join
                </Button>
                <Button size="sm" variant="ghost" onClick={() => navigate("/profile")} className="text-amber-700 dark:text-amber-400">
                  Decline
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Journey Section */}
        <section className="py-6 pb-12">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto" ref={containerRef}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Your Journey
                </h2>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={historySize === 0}
                    onClick={handleUndo}
                    title={`Undo (${historySize} step${historySize !== 1 ? "s" : ""}) — Ctrl+Z`}
                  >
                    <Undo2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={futureSize === 0}
                    onClick={handleRedo}
                    title={`Redo (${futureSize} step${futureSize !== 1 ? "s" : ""}) — Ctrl+Y`}
                  >
                    <Redo2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

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
                  const isFirst = dayIndex === 0;
                  return (
                    <div key={idx} className="absolute flex items-center gap-2.5 bg-background px-4 py-2 rounded-full shadow-lg border border-border z-20" style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }}>
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-base flex items-center justify-center shrink-0">{dayIndex + 1}</div>
                      <Popover open={openDayPicker === pos.day.id} onOpenChange={(v) => setOpenDayPicker(v ? pos.day.id : null)}>
                        <PopoverTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-base font-semibold text-foreground hover:text-primary transition-colors whitespace-nowrap"
                          >
                            <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                            {pos.day.date
                              ? new Date(pos.day.date + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
                              : "Set date"}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="center" onClick={(e) => e.stopPropagation()}>
                          <Calendar
                            mode="single"
                            selected={pos.day.date ? new Date(pos.day.date + "T00:00:00") : undefined}
                            onSelect={(date) => {
                              if (!date) return;
                              handleDayDateChange(pos.day.id, localDateStr(date));
                              setOpenDayPicker(null);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {(!isFirst || trip.days.length > 1) && (
                        <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removeDay(pos.day.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}

                {/* Activity rows */}
                {rowLayouts.map((row) => (
                  <div key={`row-${row.rowIndex}`} className={cn("absolute flex items-center", row.isRTL && "flex-row-reverse")} style={{ top: row.top, left: row.rowLeft, width: row.rowWidth }}>
                    {row.slots.map((slot, slotIndex) => {
                      const isAdd = slot === "add";
                      // Show transport/gap before any slot (including add) after the first
                      const showTransport = slotIndex > 0;
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

                      const transportSpacer = showTransport && (
                        <div className="flex items-center justify-center" style={{ width: GAP + TRANSPORT_WIDTH }}>
                          {!isAdd && activity && <TransportBubble type={activity.transportType} duration={activity.transportDuration} />}
                        </div>
                      );

                      return (
                        <div key={isAdd ? `add-${row.dayIndex}` : activity!.id} className="flex items-center">
                          {/* LTR: spacer before card; RTL: spacer after (flex-row-reverse would put a before-spacer on the wrong side) */}
                          {!row.isRTL && transportSpacer}
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
                          {row.isRTL && transportSpacer}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Add Day — bottom of timeline */}
              <div className="flex justify-center mt-8">
                <Button variant="outline" onClick={addDay} className="gap-2 px-6">
                  <Plus className="w-4 h-4" /> Add Day
                </Button>
              </div>

              {/* Legend */}
              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
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

      {/* Thumbnail Picker Modal */}
      {thumbnailPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setThumbnailPickerOpen(false)}>
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <ImagePlus className="w-4 h-4 text-primary" /> Choose Cover Photo
              </h3>
              <button onClick={() => setThumbnailPickerOpen(false)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Upload custom */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Upload Custom</p>
                <label className="flex items-center gap-2 cursor-pointer w-fit bg-muted hover:bg-accent rounded-lg px-4 py-2.5 text-sm text-foreground transition-colors border border-dashed border-border">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  Choose image…
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const dataUrl = ev.target?.result as string;
                        setTrip(p => ({ ...p, thumbnail: dataUrl }));
                        setThumbnailPickerOpen(false);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>

              {/* Activity images */}
              {activityImages.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">From Your Trip</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {activityImages.map((url) => (
                      <button
                        key={url}
                        onClick={() => { setTrip(p => ({ ...p, thumbnail: url })); setThumbnailPickerOpen(false); }}
                        className={cn(
                          "relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.02]",
                          trip.thumbnail === url ? "border-primary shadow-md" : "border-transparent hover:border-primary/50"
                        )}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        {trip.thumbnail === url && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activityImages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Add activities with images first, or upload a custom photo above.
                </p>
              )}

              {/* Remove thumbnail */}
              {trip.thumbnail && (
                <button
                  onClick={() => { setTrip(p => ({ ...p, thumbnail: undefined })); setThumbnailPickerOpen(false); }}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Remove cover photo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activity Dialog */}
      <ActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activity={editingActivity}
        onSave={handleSaveActivity}
        isEditing={editingIndex >= 0}
        onLiveSave={handleLiveSaveActivity}
        onRevert={handleRevertActivity}
        isFirst={editingIndex === 0 || (editingIndex === -1 && (trip.days.find((d) => d.id === editingDayId)?.activities.length || 0) === 0)}
      />
    </div>
  );
};

export default TripBuilder;
