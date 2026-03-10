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
  Ticket, Coffee, ShoppingBag, Bus, Car, Train, Footprints, ImagePlus, Bike, Wine, Star,
  Calendar as CalendarIcon, Users, ArrowLeft, GripVertical, Heart, Tag, Share2, LogOut, Link2,
  ChevronDown, Upload, X as XIcon, ExternalLink, Undo2, Redo2, Download, MessageSquare,
  AlertCircle, FileUp, FileDown, Printer, CopyPlus, Filter,
  ThumbsUp, ThumbsDown, DollarSign, ChevronRight, Receipt,
} from "lucide-react";
import { usePreferences } from "@/context/PreferencesContext";
import { toast } from "sonner";

// ─── Configs ─────────────────────────────────────────────────────────
// Primary (new) types shown in type selector
const activityTypeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  transport:     { icon: Bus,         color: "text-cyan-500",    bgColor: "bg-cyan-50 dark:bg-cyan-950 border-cyan-200 dark:border-cyan-800",         label: "Transport"      },
  accommodation: { icon: Hotel,       color: "text-blue-500",    bgColor: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",         label: "Hotel / Stay"   },
  food:          { icon: Utensils,    color: "text-orange-500",  bgColor: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800", label: "Food & Drinks"  },
  experience:    { icon: Camera,      color: "text-emerald-500", bgColor: "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800", label: "Experience"  },
  // Legacy types (kept for backward compat — old trips still render correctly)
  flight:        { icon: Plane,       color: "text-sky-500",     bgColor: "bg-sky-50 dark:bg-sky-950 border-sky-200 dark:border-sky-800",             label: "Flight"         },
  dining:        { icon: Utensils,    color: "text-orange-500",  bgColor: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800", label: "Dining"         },
  cafe:          { icon: Coffee,      color: "text-amber-500",   bgColor: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800",     label: "Café"           },
  sightseeing:   { icon: Camera,      color: "text-emerald-500", bgColor: "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800", label: "Sightseeing"},
  activity:      { icon: Ticket,      color: "text-purple-500",  bgColor: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800", label: "Activity"       },
  shopping:      { icon: ShoppingBag, color: "text-pink-500",    bgColor: "bg-pink-50 dark:bg-pink-950 border-pink-200 dark:border-pink-800",         label: "Shopping"       },
};

// Primary types shown in the dialog type selector (new consolidated set)
const primaryTypes = ["transport", "accommodation", "food", "experience"] as const;

// Subtypes per primary type
const transportSubtypes = [
  { value: "flight",   icon: Plane,     label: "Flight"        },
  { value: "train",    icon: Train,     label: "Train / Metro" },
  { value: "bus",      icon: Bus,       label: "Bus / Tram"    },
  { value: "car",      icon: Car,       label: "Drive / Taxi"  },
  { value: "cycling",  icon: Bike,      label: "Cycling"       },
  { value: "walking",  icon: Footprints,label: "Walking"       },
];

const foodSubtypes = [
  { value: "restaurant", icon: Utensils, label: "Restaurant" },
  { value: "bar",        icon: Wine,     label: "Bar"        },
  { value: "cafe",       icon: Coffee,   label: "Café"       },
];

const experienceSubtypes = [
  { value: "sightseeing", icon: Camera,      label: "Sightseeing" },
  { value: "shopping",    icon: ShoppingBag, label: "Shopping"    },
  { value: "activity",    icon: Ticket,      label: "Activity"    },
];

// Helper: get effective icon/color for an activity (handles subtypes + legacy)
const getActivityConfig = (activity: { type: string; subtype?: string }) => {
  // Transport subtypes
  if (activity.type === "transport" && activity.subtype) {
    const sub = transportSubtypes.find(s => s.value === activity.subtype);
    if (sub) return { ...activityTypeConfig.transport, icon: sub.icon, label: sub.label };
  }
  // Food subtypes
  if (activity.type === "food" && activity.subtype) {
    const sub = foodSubtypes.find(s => s.value === activity.subtype);
    if (sub) return { ...activityTypeConfig.food, icon: sub.icon, label: sub.label };
    if (activity.subtype === "cafe") return { ...activityTypeConfig.food, icon: Coffee, label: "Café", bgColor: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800", color: "text-amber-500" };
  }
  // Experience subtypes
  if (activity.type === "experience" && activity.subtype) {
    const sub = experienceSubtypes.find(s => s.value === activity.subtype);
    if (sub) {
      const colors: Record<string, { color: string; bgColor: string }> = {
        sightseeing: { color: "text-emerald-500", bgColor: "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800" },
        shopping:    { color: "text-pink-500",    bgColor: "bg-pink-50 dark:bg-pink-950 border-pink-200 dark:border-pink-800" },
        activity:    { color: "text-purple-500",  bgColor: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800" },
      };
      return { ...activityTypeConfig.experience, icon: sub.icon, label: sub.label, ...(colors[sub.value] ?? {}) };
    }
  }
  return activityTypeConfig[activity.type] ?? activityTypeConfig.experience;
};

// Default name per type/subtype
const defaultActivityName = (type: string, subtype?: string): string => {
  if (type === "transport") {
    return transportSubtypes.find(s => s.value === subtype)?.label ?? "Transport";
  }
  if (type === "food") {
    return foodSubtypes.find(s => s.value === subtype)?.label ?? "Food & Drinks";
  }
  if (type === "experience") {
    return experienceSubtypes.find(s => s.value === subtype)?.label ?? "Experience";
  }
  return activityTypeConfig[type]?.label ?? "Activity";
};

// Curated hotel amenity options (API codes → friendly labels)
const HOTEL_AMENITIES = [
  { value: "wifi",           label: "Wi-Fi"           },
  { value: "pool",           label: "Pool"            },
  { value: "spa",            label: "Spa"             },
  { value: "gym",            label: "Gym"             },
  { value: "ac",             label: "A/C"             },
  { value: "restaurant",     label: "Restaurant"      },
  { value: "bar",            label: "Bar / Lounge"    },
  { value: "room_service",   label: "Room Service"    },
  { value: "breakfast",      label: "Breakfast"       },
  { value: "parking",        label: "Parking"         },
  { value: "valet",          label: "Valet Parking"   },
  { value: "pets",           label: "Pet Friendly"    },
  { value: "kids",           label: "Kids Welcome"    },
  { value: "shuttle",        label: "Airport Shuttle" },
  { value: "beach",          label: "Beach Access"    },
  { value: "sauna",          label: "Sauna"           },
  { value: "jacuzzi",        label: "Jacuzzi"         },
  { value: "minibar",        label: "Minibar"         },
  { value: "kitchen",        label: "Kitchen"         },
] as const;

const BOND_COLORS = ['sky', 'emerald', 'amber', 'rose', 'violet', 'orange', 'teal'] as const;
type BondColor = typeof BOND_COLORS[number];
const BOND_STYLE: Record<BondColor, { left: string; right: string }> = {
  sky:     { left: "border-l-4 border-l-sky-400",     right: "border-r-4 border-r-sky-400"     },
  emerald: { left: "border-l-4 border-l-emerald-400", right: "border-r-4 border-r-emerald-400" },
  amber:   { left: "border-l-4 border-l-amber-400",   right: "border-r-4 border-r-amber-400"   },
  rose:    { left: "border-l-4 border-l-rose-400",    right: "border-r-4 border-r-rose-400"    },
  violet:  { left: "border-l-4 border-l-violet-400",  right: "border-r-4 border-r-violet-400"  },
  orange:  { left: "border-l-4 border-l-orange-400",  right: "border-r-4 border-r-orange-400"  },
  teal:    { left: "border-l-4 border-l-teal-400",    right: "border-r-4 border-r-teal-400"    },
};

const placeholderImages: Record<string, string> = {
  // ── Transport subtypes ──
  flight:           "https://images.unsplash.com/photo-1529074963764-98f45c47344b?w=400&h=200&fit=crop",
  train:            "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=400&h=200&fit=crop",
  bus:              "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=200&fit=crop",
  car:              "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=200&fit=crop",
  cycling:          "https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?w=400&h=200&fit=crop",
  walking:          "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&h=200&fit=crop",
  // ── Food subtypes ──
  restaurant:       "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=200&fit=crop",
  bar:              "https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=400&h=200&fit=crop",
  cafe:             "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=200&fit=crop",
  // ── Experience subtypes ──
  sightseeing:      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=200&fit=crop",
  shopping:         "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=200&fit=crop",
  activity:         "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=400&h=200&fit=crop",
  // ── Primary types (fallback when subtype has no match) ──
  transport:        "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=200&fit=crop",
  accommodation:    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=200&fit=crop",
  food:             "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=200&fit=crop",
  experience:       "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=400&h=200&fit=crop",
  // ── Legacy keys ──
  dining:           "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=200&fit=crop",
};

const getPlaceholderImage = (activity: { type: string; subtype?: string }): string =>
  placeholderImages[activity.subtype ?? ""] ||
  placeholderImages[activity.type] ||
  placeholderImages.activity;

// ─── Types ──────────────────────────────────────────────────────────
export interface BuilderActivity {
  id: string;
  type: string;             // "transport" | "accommodation" | "food" | "experience" | (legacy: "flight" | "dining" | etc.)
  subtype?: string;         // e.g. "flight" | "train" | "restaurant" | "sightseeing"
  name: string;
  time: string;
  duration: string;
  location: string;
  cost: number;
  notes: string;
  image_url: string;
  booking_url?: string;
  photos?: string[];
  // Transport / Flight fields
  origin?: string;
  destination_airport?: string;
  airline?: string;
  flight_number?: string;
  luggage_checkin?: number;
  luggage_cabin?: number;
  flight_class?: string;    // "economy" | "premium_economy" | "business" | "first"
  // Accommodation fields
  nights?: number;
  cost_per_night?: number;
  stars?: number;           // 1–5
  amenities?: string[];
  bed_types?: string;
  checkin_time?: string;
  checkout_time?: string;
  hotel_bond_id?: string;   // shared ID between check-in and checkout activities
  is_checkout?: boolean;
  flight_bond_id?: string;  // shared ID between departure and arrival activities
  is_arrival?: boolean;
}

export interface BuilderDay {
  id: string;
  date: string;
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
  Collaborator, getCollaborators, getTripRole, leaveTrip, getTripOwnerProfile, transferOwnership, declineInvite,
} from "@/services/collaboratorService";
import ShareTripModal from "@/components/ShareTripModal";
import CollaboratorAvatars from "@/components/CollaboratorAvatars";
import {
  VoteSummary, TripExpense,
  getVotesForTrip, upsertVote, removeVote,
  getExpensesForTrip, addExpense, deleteExpense, calcBalances,
} from "@/services/groupTripService";

const generateId = () => Math.random().toString(36).substring(2, 10);

const createEmptyActivity = (type = "experience", subtype?: string): BuilderActivity => ({
  id: generateId(),
  type,
  subtype,
  name: "",
  time: "09:00",
  duration: "1h",
  location: "",
  cost: 0,
  notes: "",
  image_url: "",
  booking_url: "",
});

const createEmptyDay = (): BuilderDay => ({
  id: generateId(),
  date: "",
  activities: [],
});

// ─── Activity Slot ─────────────────────────────────────────────────
const BuilderSlot = ({
  activity,
  onEdit,
  onDelete,
  onCopy,
  currencySymbol = "€",
  isDraggable = true,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragging = false,
  isDragOver = false,
  dropPosition,
  bondColor,
}: {
  activity: BuilderActivity;
  onEdit: () => void;
  onDelete: () => void;
  onCopy?: () => void;
  currencySymbol?: string;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  dropPosition?: 'before' | 'after';
  bondColor?: string;
}) => {
  const config = getActivityConfig(activity);
  const Icon = config.icon;
  const imageUrl = activity.image_url || getPlaceholderImage(activity);
  const isHotelCheckout = activity.type === "accommodation" && activity.is_checkout;
  const isFlightArrival = (activity.type === "transport" || activity.type === "flight") && activity.is_arrival;
  const bondStyle = bondColor ? BOND_STYLE[bondColor as BondColor] : null;
  const isSecondCard = isFlightArrival || isHotelCheckout;

  return (
    <div className="relative" style={{ width: 200 }}>
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
          config.bgColor,
          isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
          isDragging && "opacity-50",
          // Arrival / checkout cards: colored left strip
          bondStyle && isSecondCard && bondStyle.left,
          // Departure / check-in cards with a bonded partner: colored right strip
          bondStyle && !isSecondCard && bondStyle.right,
        )}
        style={{ minHeight: 240 }}
        onClick={onEdit}
      >
        {/* Drag handle */}
        {isDraggable && (
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <div className="w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Edit / Copy / Delete buttons */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-background"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5 text-foreground" />
          </button>
          {onCopy && (
            <button
              onClick={(e) => { e.stopPropagation(); onCopy(); }}
              className="w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-background"
              title="Duplicate"
            >
              <CopyPlus className="w-3.5 h-3.5 text-foreground" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-7 h-7 rounded-full bg-destructive/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-destructive"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5 text-destructive-foreground" />
          </button>
        </div>

        {/* Image */}
        <div className="relative w-full h-[100px] shrink-0">
          <img
            src={imageUrl}
            alt={activity.name || "Activity"}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { e.currentTarget.src = getPlaceholderImage(activity); }}
          />
          {/* Type badge */}
          <div className={cn("absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-sm bg-background/75 shadow-sm", config.color)}>
            <Icon className="w-2.5 h-2.5" />
            <span>{isFlightArrival ? "Arrival" : isHotelCheckout ? "Check-out" : config.label}</span>
          </div>
          {/* Stars (hotels) */}
          {(activity.type === "accommodation" || activity.type === "flight") && activity.stars && activity.stars > 0 && (
            <div className="absolute bottom-2 left-2 flex items-center gap-0.5">
              {Array.from({ length: Math.min(5, activity.stars) }).map((_, i) => (
                <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
          )}
        </div>

        {/* Time bar */}
        <div className={cn("flex items-center gap-1.5 px-3 py-1.5 border-b border-border/30", config.bgColor)}>
          <Clock className={cn("w-3 h-3 shrink-0", config.color)} />
          <span className={cn("text-sm font-bold", config.color)}>{activity.time}</span>
          {activity.duration && (
            <span className="text-xs text-muted-foreground ml-auto">{activity.duration}</span>
          )}
          {activity.notes?.trim() && (
            <MessageSquare className="w-3 h-3 text-muted-foreground shrink-0" title="Has notes" />
          )}
        </div>

        {/* Text content */}
        <div className="flex flex-col flex-1 p-3 gap-1">
          <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
            {activity.name || "Untitled"}
          </h4>
          {/* Flight pair: origin → destination (shows origin alone if destination not yet set) */}
          {(activity.type === "transport" || activity.type === "flight") && activity.origin && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="truncate max-w-[60px]">{activity.origin}</span>
              {activity.destination_airport && (
                <>
                  <Plane className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate max-w-[60px]">{activity.destination_airport}</span>
                </>
              )}
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-auto">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{activity.location || "No location"}</span>
          </div>
          {/* Divider + cost */}
          <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-border/30">
            {activity.type === "accommodation" && activity.nights ? (
              <span className="text-[10px] text-muted-foreground">{activity.nights} night{activity.nights !== 1 ? "s" : ""}</span>
            ) : (
              <span className="text-[10px] text-muted-foreground" />
            )}
            {activity.cost > 0 && <span className="text-xs font-bold text-foreground">{currencySymbol}{activity.cost.toLocaleString()}</span>}
          </div>
        </div>

        {/* Booking link — integrated footer */}
        {activity.booking_url && (
          <>
            <div className="h-px bg-border/40 mx-3" />
            <a
              href={activity.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-primary text-xs font-semibold hover:bg-primary/8 transition-colors w-full"
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              Book / View Link
            </a>
          </>
        )}
      </div>

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


// ─── Activity Edit Dialog ───────────────────────────────────────────
const ActivityDialog = ({
  open,
  onOpenChange,
  activity,
  onSave,
  isEditing = false,
  onLiveSave,
  onRevert,
  currencySymbol = "€",
  days,
  currentDayId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: BuilderActivity;
  onSave: (a: BuilderActivity, targetDayId?: string) => void;
  isEditing?: boolean;
  onLiveSave?: (a: BuilderActivity) => void;
  onRevert?: (original: BuilderActivity) => void;
  currencySymbol?: string;
  days?: BuilderDay[];
  currentDayId?: string;
}) => {
  const [form, setForm] = useState<BuilderActivity>(activity);
  const [selectedDayId, setSelectedDayId] = useState<string | undefined>(currentDayId);
  const originalRef = useRef<BuilderActivity>(activity);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFetchingImage, setIsFetchingImage] = useState(false);

  useEffect(() => {
    originalRef.current = activity;
    setForm(activity);
    setSelectedDayId(currentDayId);
  }, [activity, currentDayId]);

  const updateForm = (updates: Partial<BuilderActivity>) => {
    const updated = { ...form, ...updates };
    // Hotel cost auto-calc
    if (updated.type === "accommodation") {
      if ("nights" in updates && updated.cost_per_night) {
        updated.cost = (updated.nights ?? 0) * updated.cost_per_night;
      } else if ("cost_per_night" in updates && updated.nights) {
        updated.cost = updated.nights * (updated.cost_per_night ?? 0);
      } else if ("cost" in updates && updated.nights && updated.nights > 0) {
        updated.cost_per_night = Math.round((updated.cost ?? 0) / updated.nights);
      }
      // Auto-prefix hotel names with Check-in: / Check-out:
      if ("name" in updates) {
        const prefix = updated.is_checkout ? "Check-out: " : "Check-in: ";
        const raw = (updated.name ?? "").replace(/^Check-(?:in|out):\s*/i, "");
        updated.name = raw ? `${prefix}${raw}` : "";
      }
    }
    setForm(updated);
    if (isEditing) onLiveSave?.(updated);
  };

  // When type changes: reset subtype to first option, update name to default
  const handleTypeChange = (newType: string) => {
    const subtypes: Record<string, typeof transportSubtypes> = {
      transport: transportSubtypes,
      food: foodSubtypes,
      experience: experienceSubtypes,
    };
    const firstSub = subtypes[newType]?.[0]?.value;
    const newName = defaultActivityName(newType, firstSub);
    updateForm({ type: newType, subtype: firstSub, name: form.name || newName });
  };

  const handleSubtypeChange = (newSubtype: string) => {
    const newName = defaultActivityName(form.type, newSubtype);
    updateForm({ subtype: newSubtype, name: form.name === defaultActivityName(form.type, form.subtype) ? newName : form.name });
  };

  const fetchLinkImage = async () => {
    const url = form.booking_url?.trim();
    if (!url) return;
    setIsFetchingImage(true);
    try {
      const resp = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(12000) });
      const data = await resp.json();
      const imageUrl: string | undefined = data?.data?.image?.url ?? data?.data?.screenshot?.url;
      if (imageUrl) { updateForm({ image_url: imageUrl }); toast.success("Image fetched!"); }
      else toast.error("No preview image found at this URL");
    } catch { toast.error("Could not fetch image from link"); }
    finally { setIsFetchingImage(false); }
  };

  const handleCommit = () => {
    const name = form.name.trim() || defaultActivityName(form.type, form.subtype);
    const targetDay = selectedDayId !== currentDayId ? selectedDayId : undefined;
    onSave({ ...form, name }, targetDay);
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (isEditing) onRevert?.(originalRef.current);
    onOpenChange(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => updateForm({ image_url: reader.result as string });
    reader.readAsDataURL(file);
  };

  const typeConfig = getActivityConfig(form);
  const TypeIcon = typeConfig.icon;
  const imagePreview = form.image_url || getPlaceholderImage(form);

  // Subtype options for current type
  const subtypeOptions: { value: string; icon: React.ElementType; label: string }[] =
    form.type === "transport" ? transportSubtypes :
    form.type === "food" ? foodSubtypes :
    form.type === "experience" ? experienceSubtypes : [];

  const isFlightActivity = (form.type === "transport" && form.subtype === "flight") || form.type === "flight";
  const isHotelActivity = form.type === "accommodation";
  const isTransportActivity = form.type === "transport" || form.type === "flight";
  const isNonFlightTransport = isTransportActivity && !isFlightActivity;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
      <DialogContent className="w-full max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        {/* ── Header: editable activity name ── */}
        <div className={cn("px-5 pt-5 pb-3 shrink-0 border-b border-border", typeConfig.bgColor)}>
          <DialogDescription className="sr-only">Edit activity details.</DialogDescription>
          <div className="flex items-center gap-2.5">
            <span className={cn("p-2 rounded-xl bg-background/60 backdrop-blur-sm", typeConfig.color)}>
              <TypeIcon className="w-4 h-4" />
            </span>
            <input
              value={form.name}
              onChange={(e) => updateForm({ name: e.target.value })}
              placeholder={defaultActivityName(form.type, form.subtype)}
              className={cn(
                "flex-1 bg-transparent border-none outline-none text-lg font-bold placeholder:text-foreground/30",
                typeConfig.color
              )}
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid lg:grid-cols-[1fr_250px] divide-y lg:divide-y-0 lg:divide-x divide-border">

            {/* ── Left panel: main fields ── */}
            <div className="p-5 space-y-4 overflow-y-auto">

              {/* Type selector (primary types only) */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Category</Label>
                <div className="flex flex-wrap gap-1.5">
                  {primaryTypes.map((key) => {
                    const cfg = activityTypeConfig[key];
                    const Icon = cfg.icon;
                    const active = form.type === key;
                    return (
                      <button key={key} type="button" onClick={() => handleTypeChange(key)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
                          active ? cn("border-transparent", cfg.bgColor, cfg.color)
                                 : "border-border bg-background text-muted-foreground hover:text-foreground"
                        )}>
                        <Icon className="w-3.5 h-3.5" />{cfg.label}
                      </button>
                    );
                  })}
                  {/* Accommodation is a primary type already; also show legacy types if activity uses one */}
                  {!primaryTypes.includes(form.type as typeof primaryTypes[number]) && form.type !== "accommodation" && (
                    <span className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium", typeConfig.bgColor, typeConfig.color)}>
                      <TypeIcon className="w-3.5 h-3.5" />{typeConfig.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Subtype selector */}
              {subtypeOptions.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Sub-type</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {subtypeOptions.map((sub) => {
                      const SubIcon = sub.icon;
                      const active = form.subtype === sub.value;
                      return (
                        <button key={sub.value} type="button" onClick={() => handleSubtypeChange(sub.value)}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
                            active ? cn("border-transparent", typeConfig.bgColor, typeConfig.color)
                                   : "border-border bg-background text-muted-foreground hover:text-foreground"
                          )}>
                          <SubIcon className="w-3.5 h-3.5" />{sub.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Time + Duration — hidden for hotels (check-in time lives in Stay Details) */}
              {!isHotelActivity && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Time</Label>
                    <Input type="time" value={form.time} onChange={(e) => updateForm({ time: e.target.value })} />
                  </div>
                  {!isFlightActivity && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Duration</Label>
                      <Input value={form.duration} onChange={(e) => updateForm({ duration: e.target.value })} placeholder="2h" />
                    </div>
                  )}
                </div>
              )}

              {/* Location — hidden for flights (departure airport is inside Flight Details) */}
              {!isFlightActivity && (
                <div className="space-y-1.5">
                  <Label>{isNonFlightTransport ? "From" : "Location"}</Label>
                  <Input value={form.location} onChange={(e) => {
                    const loc = e.target.value;
                    const updates: Partial<BuilderActivity> = { location: loc };
                    if (isHotelActivity && !form.is_checkout && (!form.name || /^Check-in:\s*/i.test(form.name))) {
                      updates.name = loc ? `Check-in: ${loc}` : "";
                    }
                    updateForm(updates);
                  }}
                    placeholder={isNonFlightTransport ? "e.g. Paris Gare du Nord" : "e.g. Champ de Mars, Paris"} />
                </div>
              )}

              {/* To — non-flight transport only */}
              {isNonFlightTransport && (
                <div className="space-y-1.5">
                  <Label>To</Label>
                  <Input value={form.destination_airport || ""} onChange={(e) => updateForm({ destination_airport: e.target.value })}
                    placeholder="e.g. Brussels-Midi" />
                </div>
              )}

              {/* ── Flight-specific fields ── */}
              {isFlightActivity && (
                <div className="space-y-3 p-3 rounded-lg bg-sky-50/50 dark:bg-sky-950/30 border border-sky-200/50 dark:border-sky-800/50">
                  <p className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Plane className="w-3.5 h-3.5" /> Flight Details
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Departure Airport</Label>
                      <Input value={form.location} onChange={(e) => {
                        const loc = e.target.value;
                        const updates: Partial<BuilderActivity> = { location: loc, origin: loc };
                        if (!form.is_arrival && (!form.name || /^Departing from /i.test(form.name))) {
                          updates.name = loc ? `Departing from ${loc}` : "";
                        }
                        updateForm(updates);
                      }} placeholder="e.g. London Heathrow (LHR)" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Arrival Airport</Label>
                      <Input value={form.destination_airport || ""} onChange={(e) => updateForm({ destination_airport: e.target.value })} placeholder="e.g. Paris CDG" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Duration</Label>
                      <Input value={form.duration} onChange={(e) => updateForm({ duration: e.target.value })} placeholder="e.g. 2h 30m" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Airline</Label>
                      <Input value={form.airline || ""} onChange={(e) => updateForm({ airline: e.target.value })} placeholder="e.g. British Airways" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Flight No.</Label>
                      <Input value={form.flight_number || ""} onChange={(e) => updateForm({ flight_number: e.target.value })} placeholder="e.g. BA123" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Class</Label>
                      <Select value={form.flight_class || "economy"} onValueChange={(v) => updateForm({ flight_class: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="economy">Economy</SelectItem>
                          <SelectItem value="premium_economy">Premium Economy</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="first">First</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cabin Bags</Label>
                      <Input type="number" min={0} max={10} value={form.luggage_cabin ?? ""} onChange={(e) => updateForm({ luggage_cabin: Number(e.target.value) || 0 })} placeholder="0" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Check-in Bags</Label>
                      <Input type="number" min={0} max={10} value={form.luggage_checkin ?? ""} onChange={(e) => updateForm({ luggage_checkin: Number(e.target.value) || 0 })} placeholder="0" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Hotel-specific fields ── */}
              {isHotelActivity && !form.is_checkout && (
                <div className="space-y-3 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Hotel className="w-3.5 h-3.5" /> Stay Details
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nights</Label>
                      <Input type="number" min={1} value={form.nights ?? ""} onChange={(e) => updateForm({ nights: Number(e.target.value) || undefined })} placeholder="3" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Per Night ({currencySymbol})</Label>
                      <Input type="number" min={0} value={form.cost_per_night ?? ""} onChange={(e) => updateForm({ cost_per_night: Number(e.target.value) || undefined })} placeholder="120" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Stars</Label>
                      <Input type="number" min={1} max={5} value={form.stars ?? ""} onChange={(e) => updateForm({ stars: Number(e.target.value) || undefined })} placeholder="4" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Check-in Time</Label>
                      <Input type="time" value={form.checkin_time || ""} onChange={(e) => updateForm({ checkin_time: e.target.value, time: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Check-out</Label>
                      <Input type="time" value={form.checkout_time || ""} onChange={(e) => updateForm({ checkout_time: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Bed Type</Label>
                      <Input value={form.bed_types || ""} onChange={(e) => updateForm({ bed_types: e.target.value })} placeholder="King, Twin…" />
                    </div>
                  </div>
                  {/* Amenities chips */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Amenities</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {HOTEL_AMENITIES.map((a) => {
                        const active = (form.amenities ?? []).includes(a.value);
                        return (
                          <button
                            key={a.value}
                            type="button"
                            onClick={() => {
                              const cur = form.amenities ?? [];
                              updateForm({ amenities: active ? cur.filter(x => x !== a.value) : [...cur, a.value] });
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-lg border text-xs font-medium transition-all",
                              active ? "border-transparent bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                     : "border-border bg-background text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {a.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Move to Day — editing only, multiple days available */}
              {isEditing && days && days.length > 1 && currentDayId && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Move to Day</Label>
                  <Select value={selectedDayId || currentDayId} onValueChange={setSelectedDayId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map((day, i) => (
                        <SelectItem key={day.id} value={day.id}>
                          Day {i + 1}{day.date ? ` · ${day.date}` : ""}
                          {day.id === currentDayId ? " (current)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Booking URL */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" /> Booking Link
                </Label>
                <div className="flex gap-2">
                  <Input value={form.booking_url || ""} onChange={(e) => updateForm({ booking_url: e.target.value })} placeholder="https://…" className="flex-1 text-sm" />
                  {form.booking_url?.trim() && (
                    <Button type="button" variant="outline" size="sm" disabled={isFetchingImage} onClick={fetchLinkImage} title="Fetch image from link">
                      {isFetchingImage ? <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
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

            {/* ── Right panel: image + notes + sticky cost ── */}
            <div className="flex flex-col bg-muted/20">
              {/* Image */}
              <div className="p-4 space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Image</Label>
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border/50 bg-muted group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ImagePlus className="w-5 h-5 text-white" />
                  </div>
                </div>
                <Input value={form.image_url?.startsWith("data:") ? "" : form.image_url} onChange={(e) => updateForm({ image_url: e.target.value })} placeholder="Paste image URL…" className="text-xs h-8" />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>

              {/* Notes — scrollable middle */}
              <div className="flex-1 px-4 pb-2 space-y-1.5 min-h-0">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" /> Notes
                </Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => updateForm({ notes: e.target.value })}
                  placeholder="Booking tips, visa notes, opening hours, things to know…"
                  className="resize-none h-28 text-sm"
                />
              </div>

              {/* Sticky cost — always visible at bottom */}
              <div className="px-4 py-3 border-t border-border bg-background/80 backdrop-blur-sm shrink-0">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Total Cost ({currencySymbol})</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.cost || ""}
                  onChange={(e) => updateForm({ cost: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="mt-1 text-xl font-bold h-11"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border shrink-0 bg-background">
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          {isEditing ? (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          ) : (
            <Button onClick={handleCommit}><Save className="w-4 h-4 mr-1" />Add Activity</Button>
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
  const { currencySymbol, formatDate } = usePreferences();
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
  const [overviewOpen, setOverviewOpen] = useState(true);
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
    days: [createEmptyDay()],
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

  // Group tools (votes + expenses) — only for collaborated trips
  const [groupPanelOpen] = useState(false); // kept for vote badge compat; loading now driven by overviewOpen
  const [groupTab, setGroupTab] = useState<"votes" | "expenses">("votes");
  const [votes, setVotes] = useState<VoteSummary[]>([]);
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [addingExpense, setAddingExpense] = useState(false);

  // Load group tools data when panel is opened
  useEffect(() => {
    if (!id || !overviewOpen || !user) return;
    if (collaborators.filter(c => c.status === "accepted").length === 0) return;
    getVotesForTrip(id).then(setVotes).catch(() => {});
    getExpensesForTrip(id).then(setExpenses).catch(() => {});
  }, [id, overviewOpen, user, collaborators]);

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
    // Don't auto-save trips we don't own (public trips viewed from Explore)
    if (isOwner === false) return;
    if (isOwner === null && id) return; // role not yet determined
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

  // Bond color map: assigns a consistent color per bonded pair (flight or hotel)
  // Same airline = same color; different airlines / hotels = different colors
  const bondColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const airlineColors: Record<string, string> = {};
    let idx = 0;
    for (const day of trip.days) {
      for (const act of day.activities) {
        if (act.is_arrival && act.flight_bond_id && !map[act.flight_bond_id]) {
          const airline = act.airline?.trim() ?? "";
          if (airline && airlineColors[airline]) {
            map[act.flight_bond_id] = airlineColors[airline];
          } else {
            const color = BOND_COLORS[idx % BOND_COLORS.length];
            map[act.flight_bond_id] = color;
            if (airline) airlineColors[airline] = color;
            idx++;
          }
        }
        if (act.is_checkout && act.hotel_bond_id && !map[act.hotel_bond_id]) {
          map[act.hotel_bond_id] = BOND_COLORS[idx % BOND_COLORS.length];
          idx++;
        }
      }
    }
    return map;
  }, [trip.days]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<BuilderActivity>(createEmptyActivity());
  const [editingDayId, setEditingDayId] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number>(-1); // -1 = adding new

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{ dayId: string; activityIndex: number } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{ dayId: string; activityIndex: number; position: 'before' | 'after' } | null>(null);
  const dragScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Activity type filter
  const [filterTypes, setFilterTypes] = useState<string[]>([]);

  // Costs by day toggle
  const [showDayCosts, setShowDayCosts] = useState(false);

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
    setTrip((p) => ({ ...p, days: [...p.days, createEmptyDay()] }));
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

  const handleSaveActivity = (a: BuilderActivity, targetDayId?: string) => {
    // If moving to a different day, do a simple remove + append
    if (targetDayId && targetDayId !== editingDayId && editingIndex >= 0) {
      setTrip((p) => ({
        ...p,
        days: p.days.map((d) => {
          if (d.id === editingDayId) return { ...d, activities: d.activities.filter(x => x.id !== a.id) };
          if (d.id === targetDayId) return { ...d, activities: [...d.activities, a] };
          return d;
        }),
      }));
      return;
    }

    setTrip((p) => {
      // 1. Save the primary activity into its day
      const days = p.days.map((d) => {
        if (d.id !== editingDayId) return d;
        const acts = [...d.activities];
        if (editingIndex === -1) acts.push(a);
        else acts[editingIndex] = a;
        return { ...d, activities: acts };
      });

      // 2. Auto-generate flight arrival when destination_airport is filled
      const isFlightType = (a.type === "transport" && a.subtype === "flight") || a.type === "flight";
      if (isFlightType && !a.is_arrival && a.destination_airport) {
        // Remove existing arrival linked to this departure (bond_id = departure id)
        const cleanDays = days.map(d => ({
          ...d,
          activities: d.activities.filter(x => !(x.is_arrival && x.flight_bond_id === a.id)),
        }));
        // Insert arrival right after the departure in the same day
        const arrival: BuilderActivity = {
          ...createEmptyActivity("transport", a.subtype ?? "flight"),
          name: `Arrive at ${a.destination_airport}`,
          location: a.destination_airport,
          time: a.time, // user can adjust
          duration: "",
          airline: a.airline,
          flight_number: a.flight_number,
          flight_class: a.flight_class,
          flight_bond_id: a.id,
          is_arrival: true,
          image_url: a.image_url,
        };
        const updatedDays = cleanDays.map(d => {
          if (d.id !== editingDayId) return d;
          const depIdx = d.activities.findIndex(x => x.id === a.id);
          const acts = [...d.activities];
          acts.splice(depIdx + 1, 0, arrival);
          return { ...d, activities: acts };
        });
        return { ...p, days: updatedDays };
      }

      // Remove arrival if destination_airport was cleared
      if (isFlightType && !a.is_arrival && !a.destination_airport) {
        const cleanDays = days.map(d => ({
          ...d,
          activities: d.activities.filter(x => !(x.is_arrival && x.flight_bond_id === a.id)),
        }));
        return { ...p, days: cleanDays };
      }

      // 3. Auto-generate hotel checkout when nights is filled on check-in
      if (a.type === "accommodation" && !a.is_checkout && a.nights) {
        // Find existing checkout before removing (preserve user-entered data like notes/booking)
        const existingCheckout = days.flatMap(d => d.activities).find(
          x => x.is_checkout && (x.hotel_bond_id === a.id || (!x.hotel_bond_id && x.location === a.location && !!x.location))
        );
        // Remove existing checkout — by bond ID, with location fallback for older/AI-generated trips
        const cleanDays = days.map(d => ({
          ...d,
          activities: d.activities.filter(x => !(
            x.is_checkout && (x.hotel_bond_id === a.id || (!x.hotel_bond_id && x.location === a.location && !!x.location))
          )),
        }));
        // Target day = check-in day index + nights; default checkout time 12:00
        const dayIdx = cleanDays.findIndex(d => d.id === editingDayId);
        const targetDayIdx = Math.min(dayIdx + a.nights, cleanDays.length - 1);
        const hotelName = (a.name || "").replace(/^Check-in:\s*/i, "") || a.location || "Hotel";
        const checkout: BuilderActivity = {
          ...(existingCheckout ?? createEmptyActivity("accommodation")),
          name: `Check-out: ${hotelName}`,
          location: a.location,
          time: a.checkout_time || existingCheckout?.time || "12:00",
          duration: "",
          hotel_bond_id: a.id,
          is_checkout: true,
          stars: a.stars,
          image_url: a.image_url,
        };
        const updatedDays = cleanDays.map((d, i) => {
          if (i !== targetDayIdx) return d;
          return { ...d, activities: [...d.activities, checkout] };
        });
        return { ...p, days: updatedDays };
      }

      // Remove checkout if nights was cleared
      if (a.type === "accommodation" && !a.is_checkout && !a.nights) {
        const cleanDays = days.map(d => ({
          ...d,
          activities: d.activities.filter(x => !(
            x.is_checkout && (x.hotel_bond_id === a.id || (!x.hotel_bond_id && x.location === a.location && !!x.location))
          )),
        }));
        return { ...p, days: cleanDays };
      }

      return { ...p, days };
    });
  };

  // Live-save: called on every field change when editing an existing activity
  const handleLiveSaveActivity = (a: BuilderActivity) => {
    if (editingIndex < 0) return;
    setTrip((p) => {
      let days = p.days.map((d) => {
        if (d.id !== editingDayId) return d;
        const acts = [...d.activities];
        acts[editingIndex] = a;
        return { ...d, activities: acts };
      });
      // Sync hotel partner card name/location live
      if (a.type === "accommodation" && !a.is_checkout) {
        const hotelName = (a.name || "").replace(/^Check-in:\s*/i, "");
        days = days.map(d => ({
          ...d,
          activities: d.activities.map(x =>
            x.is_checkout && x.hotel_bond_id === a.id
              ? { ...x, name: hotelName ? `Check-out: ${hotelName}` : x.name, location: a.location }
              : x
          ),
        }));
      } else if (a.type === "accommodation" && a.is_checkout && a.hotel_bond_id) {
        const hotelName = (a.name || "").replace(/^Check-out:\s*/i, "");
        days = days.map(d => ({
          ...d,
          activities: d.activities.map(x =>
            x.id === a.hotel_bond_id
              ? { ...x, name: hotelName ? `Check-in: ${hotelName}` : x.name }
              : x
          ),
        }));
      }
      return { ...p, days };
    });
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
    setTrip((p) => {
      // Get the activity being deleted so we can clean up bonded activities
      const day = p.days.find(d => d.id === dayId);
      const activity = day?.activities[index];
      const isFlightDep = activity && (activity.type === "transport" || activity.type === "flight") && !activity.is_arrival;
      const isHotelCheckin = activity?.type === "accommodation" && !activity.is_checkout;

      return {
        ...p,
        days: p.days.map((d) => {
          let acts = [...d.activities];
          // Remove the activity itself from its day
          if (d.id === dayId) acts = acts.filter((_, i) => i !== index);
          // Remove linked arrival if deleting a flight departure
          if (isFlightDep && activity) acts = acts.filter(x => !(x.is_arrival && x.flight_bond_id === activity.id));
          // Remove linked checkout if deleting a hotel check-in
          if (isHotelCheckin && activity) acts = acts.filter(x => !(x.is_checkout && x.hotel_bond_id === activity.id));
          return { ...d, activities: acts };
        }),
      };
    });
  };

  const copyActivity = (dayId: string, index: number) => {
    setTrip((p) => ({
      ...p,
      days: p.days.map((d) => {
        if (d.id !== dayId) return d;
        const copy = { ...d.activities[index], id: generateId() };
        const acts = [...d.activities];
        acts.splice(index + 1, 0, copy);
        return { ...d, activities: acts };
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

  // ─── Delete confirmation ─────────────────────────────────────────
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteDayId, setDeleteDayId] = useState<string | null>(null);

  const confirmRemoveDay = (dayId: string) => {
    if (trip.days.length <= 1) { toast.error("Need at least one day"); return; }
    setDeleteDayId(dayId);
    setDeleteConfirmOpen(true);
  };

  const executeRemoveDay = () => {
    if (deleteDayId) {
      setTrip((p) => ({ ...p, days: p.days.filter((d) => d.id !== deleteDayId) }));
    }
    setDeleteConfirmOpen(false);
    setDeleteDayId(null);
  };

  // ─── JSON Export ─────────────────────────────────────────────────
  const handleExportJSON = () => {
    const json = JSON.stringify(trip, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${trip.title.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "trip"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Trip exported as JSON");
  };

  // ─── JSON Import ─────────────────────────────────────────────────
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as SavedTrip;
        if (!parsed.days || !Array.isArray(parsed.days)) throw new Error("Invalid trip file");
        // Give it a fresh ID to avoid collision, keep everything else
        const imported: SavedTrip = {
          ...parsed,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        skipAutoSaveRef.current++;
        tripLoadedRef.current = false; // allow re-save as new trip
        setTrip(imported);
        toast.success(`Imported "${imported.title}"`);
      } catch {
        toast.error("Invalid trip file — could not import");
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    e.target.value = "";
  };

  // ─── PDF Print ───────────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
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
  const GAP = 20;
  const SLOT_WITH_GAP = SLOT_WIDTH + GAP;
  const PADDING = 32; // Must be >= ARC_RADIUS so Day 1 arc stays within the SVG viewport
  const ROW_HEIGHT = 320;
  const ARC_RADIUS = 30;
  const TOP_OFFSET = 80; // extra space at top for Day 1 badge

  const availableWidth = containerWidth - PADDING * 2;
  const slotsPerRow = Math.max(1, Math.floor((availableWidth + GAP) / SLOT_WITH_GAP));

  const totalCost = trip.days.reduce((t, d) => t + d.activities.reduce((s, a) => s + (a.cost || 0), 0), 0);

  // Group tools helpers
  const handleVote = async (activityId: string, v: 1 | -1) => {
    if (!id || !user) return;
    const existing = votes.find(x => x.activity_id === activityId);
    try {
      if (existing?.myVote === v) {
        await removeVote(id, activityId);
        setVotes(prev => prev.map(x => x.activity_id === activityId
          ? { ...x, myVote: 0, up: x.up - (v === 1 ? 1 : 0), down: x.down - (v === -1 ? 1 : 0) }
          : x));
      } else {
        await upsertVote(id, activityId, v);
        setVotes(prev => {
          const found = prev.find(x => x.activity_id === activityId);
          if (found) {
            return prev.map(x => x.activity_id === activityId ? {
              ...x, myVote: v,
              up: v === 1 ? x.up + 1 : (x.myVote === 1 ? x.up - 1 : x.up),
              down: v === -1 ? x.down + 1 : (x.myVote === -1 ? x.down - 1 : x.down),
            } : x);
          }
          return [...prev, { activity_id: activityId, up: v === 1 ? 1 : 0, down: v === -1 ? 1 : 0, myVote: v }];
        });
      }
    } catch { toast.error("Failed to save vote"); }
  };

  const handleAddExpense = async () => {
    if (!id || !expenseDesc.trim() || !expenseAmount) return;
    setAddingExpense(true);
    try {
      const exp = await addExpense(id, expenseDesc.trim(), Number(expenseAmount));
      setExpenses(prev => [...prev, exp]);
      setExpenseDesc("");
      setExpenseAmount("");
    } catch { toast.error("Failed to add expense"); }
    finally { setAddingExpense(false); }
  };

  const handleDeleteExpense = async (expId: string) => {
    try {
      await deleteExpense(expId);
      setExpenses(prev => prev.filter(e => e.id !== expId));
    } catch { toast.error("Failed to delete expense"); }
  };

  // Collaborator member IDs (owner + accepted collabs)
  const memberIds = [
    ...(trip.days.length > 0 && user ? [user.id] : []),
    ...collaborators.filter(c => c.status === "accepted").map(c => c.user_id ?? c.id),
  ];

  // Key activities for the overview panel (flights + hotel check-in/out only)
  const keyActivities = useMemo(() =>
    trip.days.flatMap((day, di) =>
      day.activities
        .filter(a => a.type === "flight" || a.type === "accommodation")
        .map(a => ({ ...a, dayLabel: day.date || `Day ${di + 1}` }))
    ),
  [trip.days]);

  // Separated flight/hotel activities + cost breakdown for the rich overview
  const flightActivities = useMemo(() =>
    trip.days.flatMap((day, di) =>
      day.activities
        .filter(a => (a.type === "flight" || (a.type === "transport" && a.subtype === "flight")) && !a.is_arrival)
        .map(a => ({ ...a, dayLabel: day.date ? formatDate(day.date) : `Day ${di + 1}` }))
    ),
  [trip.days, formatDate]);

  const hotelActivities = useMemo(() =>
    trip.days.flatMap((day, di) =>
      day.activities
        .filter(a => a.type === "accommodation" && !a.is_checkout)
        .map(a => ({ ...a, dayLabel: day.date ? formatDate(day.date) : `Day ${di + 1}` }))
    ),
  [trip.days, formatDate]);

  const costByCategory = useMemo(() => {
    const allActs = trip.days.flatMap(d => d.activities);
    const isFlightAct = (a: BuilderActivity) => a.type === "flight" || (a.type === "transport" && a.subtype === "flight");
    const sum = (acts: BuilderActivity[]) => acts.reduce((s, a) => s + (a.cost || 0), 0);
    return {
      flights:    sum(allActs.filter(isFlightAct)),
      hotels:     sum(allActs.filter(a => a.type === "accommodation")),
      dining:     sum(allActs.filter(a => ["food", "dining", "cafe"].includes(a.type))),
      transport:  sum(allActs.filter(a => a.type === "transport" && a.subtype !== "flight")),
      activities: sum(allActs.filter(a => ["experience", "activity", "sightseeing", "shopping"].includes(a.type))),
      other:      sum(allActs.filter(a => !isFlightAct(a) && !["accommodation","food","dining","cafe","transport","experience","activity","sightseeing","shopping"].includes(a.type))),
    };
  }, [trip.days]);

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

  const step = SLOT_WIDTH + GAP;
  const getRowWidth = (n: number) => n * SLOT_WIDTH + Math.max(0, n - 1) * GAP;

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
        // Day 1: snake runs horizontally through the badge center (TOP_OFFSET/2),
        // arcs left → down → right to enter the first row — badge sits centered on the line.
        const badgeCx = containerWidth / 2;
        const badgeCenterY = TOP_OFFSET / 2; // badge is translate(-50%,-50%) so pos.y IS the center
        parts.push(`M ${badgeCx} ${badgeCenterY}`);
        parts.push(`L ${PADDING} ${badgeCenterY}`);
        parts.push(`A ${R} ${R} 0 0 0 ${PADDING - R} ${badgeCenterY + R}`);
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
        <section className="relative text-primary-foreground py-8 md:py-12 overflow-hidden print:hidden">
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

                    {/* Save a Copy — shown when viewing a public trip you don't own */}
                    {user && isOwner === false && (
                      <Button
                        size="sm"
                        className="gap-1.5 shrink-0"
                        onClick={async () => {
                          try {
                            const copy: import("@/lib/tripTypes").SavedTrip = {
                              ...trip,
                              id: crypto.randomUUID(),
                              source: 'custom',
                              isBucketList: false,
                              isPublic: false,
                              isFavorite: false,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            };
                            await saveToStorage(copy);
                            toast.success("Saved a copy to your trips!");
                            navigate(`/trip/${copy.id}`, { replace: true });
                          } catch {
                            toast.error("Failed to save a copy");
                          }
                        }}
                      >
                        <CopyPlus className="w-3.5 h-3.5" /> Use this itinerary
                      </Button>
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
                    <p className="text-2xl font-bold">{currencySymbol}{totalCost.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Trip Summary — rich overview panel below hero ── */}
        {(flightActivities.length > 0 || hotelActivities.length > 0 || totalCost > 0 || (id && user && collaborators.filter(c => c.status === "accepted").length > 0)) && (
          <div className="bg-card border-b border-border print:hidden">
            <div className="container mx-auto px-4">
              <div className="max-w-6xl mx-auto">
                <button
                  onClick={() => setOverviewOpen(v => !v)}
                  className="flex items-center justify-between py-3 w-full text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Plane className="w-4 h-4 text-primary" />
                    Trip Summary
                  </span>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", overviewOpen && "rotate-180")} />
                </button>

                {overviewOpen && (
                  <div className="pb-5 space-y-5">

                    {/* Row 1: Flights · Hotels · Cost Breakdown */}
                    {(flightActivities.length > 0 || hotelActivities.length > 0 || totalCost > 0) && (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

                        {/* Flights */}
                        {flightActivities.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              <Plane className="w-3.5 h-3.5 text-sky-500" /> Flights
                            </h4>
                            {flightActivities.map((a) => (
                              <div key={a.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50">
                                <Plane className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1 text-xs">
                                  <p className="font-semibold text-foreground truncate">{a.name}</p>
                                  {(a.airline || a.flight_number) && (
                                    <p className="text-muted-foreground">{[a.airline, a.flight_number].filter(Boolean).join(" · ")}</p>
                                  )}
                                  <p className="text-muted-foreground">{a.dayLabel}{a.time ? ` · ${a.time}` : ""}</p>
                                </div>
                                {a.cost > 0 && <span className="text-xs font-bold text-sky-600 dark:text-sky-400 shrink-0">{currencySymbol}{a.cost.toLocaleString()}</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Hotels */}
                        {hotelActivities.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              <Hotel className="w-3.5 h-3.5 text-amber-500" /> Hotels
                            </h4>
                            {hotelActivities.map((a) => (
                              <div key={a.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50">
                                <Hotel className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1 text-xs">
                                  <p className="font-semibold text-foreground truncate">{a.name}</p>
                                  {(a.nights || a.stars) && (
                                    <p className="text-muted-foreground">
                                      {a.nights ? `${a.nights} night${a.nights !== 1 ? "s" : ""}` : ""}
                                      {a.nights && a.stars ? " · " : ""}
                                      {a.stars ? "★".repeat(Math.min(a.stars, 5)) : ""}
                                    </p>
                                  )}
                                  <p className="text-muted-foreground">{a.dayLabel}</p>
                                </div>
                                {a.cost > 0 && <span className="text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">{currencySymbol}{a.cost.toLocaleString()}</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Cost Breakdown */}
                        {totalCost > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Cost Breakdown
                            </h4>
                            <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                              {[
                                { label: "Flights",    icon: Plane,    color: "text-sky-500",            amount: costByCategory.flights },
                                { label: "Hotels",     icon: Hotel,    color: "text-amber-500",          amount: costByCategory.hotels },
                                { label: "Dining",     icon: Utensils, color: "text-orange-500",         amount: costByCategory.dining },
                                { label: "Transport",  icon: Bus,      color: "text-violet-500",         amount: costByCategory.transport },
                                { label: "Activities", icon: Camera,   color: "text-emerald-500",        amount: costByCategory.activities },
                                { label: "Other",      icon: Tag,      color: "text-muted-foreground",   amount: costByCategory.other },
                              ].filter(c => c.amount > 0).map(({ label, icon: Icon, color, amount }) => (
                                <div key={label} className="flex items-center justify-between gap-2 text-xs">
                                  <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <Icon className={cn("w-3 h-3", color)} />{label}
                                  </span>
                                  <span className="font-semibold text-foreground">{currencySymbol}{amount.toLocaleString()}</span>
                                </div>
                              ))}
                              <div className="pt-1.5 border-t border-border flex items-center justify-between text-sm font-bold text-foreground">
                                <span>Total</span>
                                <span>{currencySymbol}{totalCost.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Row 2: Group section — collaborative trips only */}
                    {id && user && collaborators.filter(c => c.status === "accepted").length > 0 && (
                      <div className="space-y-3 border-t border-border pt-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-primary" /> Group
                        </h4>

                        {/* Member balance cards */}
                        {memberIds.length > 0 && (() => {
                          const nets = expenses.length > 0 && memberIds.length > 1 ? calcBalances(expenses, memberIds) : {};
                          const profileMap: Record<string, { name: string; avatar?: string }> = {};
                          if (user) profileMap[user.id] = { name: user.user_metadata?.display_name ?? "You", avatar: user.user_metadata?.avatar_url };
                          collaborators.forEach(c => {
                            const uid = c.user_id ?? c.id;
                            profileMap[uid] = { name: c.profile.display_name ?? c.profile.handle ?? "Member", avatar: c.profile.avatar_url };
                          });
                          return (
                            <div className="flex flex-wrap gap-2">
                              {memberIds.map(uid => {
                                const prof = profileMap[uid] ?? { name: "Member" };
                                const net = nets[uid] ?? 0;
                                return (
                                  <div key={uid} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card border border-border min-w-[120px]">
                                    {prof.avatar
                                      ? <img src={prof.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                                      : <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">{prof.name.slice(0, 1).toUpperCase()}</div>
                                    }
                                    <div>
                                      <p className="text-xs font-medium text-foreground">{uid === user.id ? "You" : prof.name}</p>
                                      {expenses.length > 0 && (
                                        <p className={cn("text-xs font-semibold", net > 0 ? "text-emerald-600" : net < 0 ? "text-red-500" : "text-muted-foreground")}>
                                          {Math.abs(net) < 0.01 ? "Settled" : `${net > 0 ? "+" : ""}${currencySymbol}${Math.abs(net).toFixed(2)}`}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {/* Votes + Expenses tabs */}
                        <div className="rounded-xl border border-border overflow-hidden">
                          <div className="flex border-b border-border">
                            {(["votes", "expenses"] as const).map(tab => (
                              <button
                                key={tab}
                                onClick={() => setGroupTab(tab)}
                                className={cn(
                                  "flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize",
                                  groupTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                              >
                                {tab === "votes" ? <ThumbsUp className="w-3.5 h-3.5" /> : <Receipt className="w-3.5 h-3.5" />}
                                {tab}
                              </button>
                            ))}
                          </div>

                          {/* ── Votes tab ── */}
                          {groupTab === "votes" && (
                            <div className="p-4 space-y-2">
                              <p className="text-xs text-muted-foreground mb-3">Vote on activities to help the group decide what to keep.</p>
                              {trip.days.flatMap(d => d.activities).length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No activities yet.</p>
                              ) : (
                                trip.days.flatMap((d, di) => d.activities.map((a) => {
                                  const v = votes.find(x => x.activity_id === a.id);
                                  return (
                                    <div key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-xs text-muted-foreground shrink-0">D{di + 1}</span>
                                        <span className="text-sm font-medium truncate">{a.name || "Untitled"}</span>
                                        {a.location && <span className="text-xs text-muted-foreground truncate hidden sm:block">· {a.location}</span>}
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          onClick={() => handleVote(a.id, 1)}
                                          className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all border", v?.myVote === 1 ? "bg-emerald-100 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300" : "border-border bg-background text-muted-foreground hover:text-emerald-600")}
                                        >
                                          <ThumbsUp className="w-3 h-3" />{v?.up ?? 0}
                                        </button>
                                        <button
                                          onClick={() => handleVote(a.id, -1)}
                                          className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all border", v?.myVote === -1 ? "bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300" : "border-border bg-background text-muted-foreground hover:text-red-500")}
                                        >
                                          <ThumbsDown className="w-3 h-3" />{v?.down ?? 0}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }))
                              )}
                            </div>
                          )}

                          {/* ── Expenses tab ── */}
                          {groupTab === "expenses" && (
                            <div className="p-4 space-y-4">
                              <div className="flex gap-2 items-end">
                                <div className="flex-1 space-y-1">
                                  <label className="text-xs text-muted-foreground">Description</label>
                                  <input
                                    value={expenseDesc}
                                    onChange={e => setExpenseDesc(e.target.value)}
                                    placeholder="e.g. Dinner at La Piazza"
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                  />
                                </div>
                                <div className="w-28 space-y-1">
                                  <label className="text-xs text-muted-foreground">Amount ({currencySymbol})</label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={expenseAmount}
                                    onChange={e => setExpenseAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                  />
                                </div>
                                <Button size="sm" disabled={addingExpense || !expenseDesc.trim() || !expenseAmount} onClick={handleAddExpense} className="shrink-0">
                                  {addingExpense ? <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                </Button>
                              </div>
                              {expenses.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No expenses logged yet.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {expenses.map(exp => (
                                    <div key={exp.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted/40 text-sm">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <DollarSign className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        <span className="truncate font-medium">{exp.description}</span>
                                        <span className="text-muted-foreground text-xs shrink-0">
                                          by {exp.paid_by_profile?.display_name ?? exp.paid_by_profile?.handle ?? "someone"}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-bold text-foreground">{currencySymbol}{Number(exp.amount).toLocaleString()}</span>
                                        {exp.paid_by === user.id && (
                                          <button onClick={() => handleDeleteExpense(exp.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pending invite banner */}
        {pendingInviteId && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-3 print:hidden">
            <div className="container mx-auto max-w-6xl flex items-center justify-between gap-4">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <span className="font-semibold">{ownerProfile?.display_name ?? ownerProfile?.handle ?? "Someone"}</span> invited you to collaborate on this trip.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" onClick={handleAcceptInvite} className="gap-1.5">
                  Accept & Join
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-amber-700 dark:text-amber-400"
                  onClick={async () => {
                    if (pendingInviteId) {
                      try { await declineInvite(pendingInviteId); } catch { /* non-critical */ }
                    }
                    navigate("/profile");
                  }}
                >
                  Decline
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Print-only trip header */}
        <div className="hidden print:block px-8 pt-6 pb-4 border-b-2 border-gray-300">
          <h1 className="text-2xl font-bold text-black">{trip.title}</h1>
          {trip.destination && <p className="text-sm text-gray-600 mt-0.5">📍 {trip.destination}</p>}
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
            <span>{trip.days.length} day{trip.days.length !== 1 ? "s" : ""}</span>
            <span>{trip.travelers} traveler{trip.travelers !== 1 ? "s" : ""}</span>
            {totalCost > 0 && <span>{currencySymbol}{totalCost.toLocaleString()} total</span>}
          </div>
        </div>

        {/* Journey Section */}
        <section className="py-6 pb-12">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto" ref={containerRef}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Your Journey
                </h2>
                <div className="flex items-center gap-1">
                  {/* Undo / Redo */}
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={historySize === 0} onClick={handleUndo}
                    title={`Undo (${historySize} step${historySize !== 1 ? "s" : ""}) — Ctrl+Z`}>
                    <Undo2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={futureSize === 0} onClick={handleRedo}
                    title={`Redo (${futureSize} step${futureSize !== 1 ? "s" : ""}) — Ctrl+Y`}>
                    <Redo2 className="w-4 h-4" />
                  </Button>

                  {/* Divider */}
                  <div className="w-px h-5 bg-border mx-1" />

                  {/* Import JSON */}
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground"
                    title="Import trip from JSON" onClick={() => importFileRef.current?.click()}>
                    <FileUp className="w-4 h-4" />
                  </Button>
                  <input ref={importFileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportJSON} />

                  {/* Export JSON */}
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground"
                    title="Export trip as JSON" onClick={handleExportJSON}>
                    <FileDown className="w-4 h-4" />
                  </Button>

                  {/* Print / PDF */}
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground"
                    title="Print / Save as PDF" onClick={handlePrint}>
                    <Printer className="w-4 h-4" />
                  </Button>

                  {/* Divider */}
                  <div className="w-px h-5 bg-border mx-1" />

                  {/* Costs by day toggle */}
                  <Button
                    variant={showDayCosts ? "default" : "ghost"}
                    size="icon"
                    className="w-8 h-8"
                    title={showDayCosts ? "Hide day costs" : "Show cost per day"}
                    onClick={() => setShowDayCosts(v => !v)}
                  >
                    <span className="text-xs font-bold">{currencySymbol}</span>
                  </Button>
                </div>
              </div>

              {/* Activity type filter chips */}
              {trip.days.some(d => d.activities.length > 0) && (
                <div className="flex items-center gap-2 mb-4 flex-wrap print:hidden">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {Object.entries(activityTypeConfig)
                    .filter(([key]) => ["transport","accommodation","food","experience","flight","sightseeing","activity","shopping","dining","cafe"].includes(key))
                    .filter(([key]) => trip.days.some(d => d.activities.some(a => a.type === key || (a.subtype === key))))
                    .map(([key, cfg]) => {
                      const Icon = cfg.icon;
                      const active = filterTypes.includes(key);
                      return (
                        <button
                          key={key}
                          onClick={() => setFilterTypes(prev => prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key])}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition-all",
                            active ? cn("border-transparent", cfg.bgColor, cfg.color) : "border-border bg-background text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Icon className="w-3 h-3" />{cfg.label}
                        </button>
                      );
                    })}
                  {filterTypes.length > 0 && (
                    <button onClick={() => setFilterTypes([])} className="text-xs text-muted-foreground hover:text-foreground underline ml-1">
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* Journey Canvas — hidden on print */}
              <div className="relative print:hidden" style={{ height: svgHeight }}>
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
                  const dayCost = showDayCosts ? pos.day.activities.reduce((s, a) => s + (a.cost || 0), 0) : 0;
                  return (
                    <>
                    {showDayCosts && dayCost > 0 && (
                      <div
                        key={`cost-${idx}`}
                        className="absolute text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full z-20 whitespace-nowrap"
                        style={{ left: pos.x, top: pos.y + 24, transform: "translate(-50%, 0)" }}
                      >
                        {currencySymbol}{dayCost.toLocaleString()}
                      </div>
                    )}

                    <div key={idx} className="absolute flex items-center gap-2 bg-background pl-0.5 pr-3 h-10 rounded-full shadow-lg border border-border z-20" style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }}>
                      <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center shrink-0">{dayIndex + 1}</div>
                      <Popover open={openDayPicker === pos.day.id} onOpenChange={(v) => setOpenDayPicker(v ? pos.day.id : null)}>
                        <PopoverTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary transition-colors whitespace-nowrap"
                          >
                            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            {pos.day.date
                              ? formatDate(pos.day.date)
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
                        <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => confirmRemoveDay(pos.day.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    </>
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

                      // Count activities in previous rows of the same day to compute the global index
                      let prevCount = 0;
                      for (const r of rowLayouts) {
                        if (r.dayIndex === row.dayIndex && r.rowIndex < row.rowIndex) {
                          prevCount += r.slots.filter((s) => s !== "add").length;
                        }
                      }
                      // Compute proper activity index excluding the "add" slot
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

                      const gap = showTransport && (
                        <div className="shrink-0" style={{ width: GAP }} />
                      );

                      return (
                        <div
                          key={isAdd ? `add-${row.dayIndex}` : activity!.id}
                          className={cn(
                            "flex items-center transition-opacity duration-200",
                            !isAdd && filterTypes.length > 0 && !filterTypes.includes(activity!.type) && !filterTypes.includes(activity!.subtype ?? "") && "opacity-20"
                          )}
                        >
                          {!row.isRTL && gap}
                          {isAdd ? (
                            <AddSlotCard
                              onClick={() => openAddActivity(trip.days[row.dayIndex].id)}
                              isDragOver={isAddDragOver}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const SCROLL_ZONE = 80;
                                const SCROLL_SPEED = 10;
                                if (dragScrollRef.current) clearInterval(dragScrollRef.current);
                                if (e.clientY < SCROLL_ZONE) {
                                  dragScrollRef.current = setInterval(() => window.scrollBy(0, -SCROLL_SPEED), 16);
                                } else if (e.clientY > window.innerHeight - SCROLL_ZONE) {
                                  dragScrollRef.current = setInterval(() => window.scrollBy(0, SCROLL_SPEED), 16);
                                }
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
                            <div className="relative">
                            {/* Vote badge — shown when overview is open and activity has votes */}
                            {overviewOpen && !isAdd && (votes.find(x => x.activity_id === activity!.id)?.up ?? 0) + (votes.find(x => x.activity_id === activity!.id)?.down ?? 0) > 0 && (
                              <div className="absolute bottom-1 left-1 z-20 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 border border-border text-[10px] font-semibold pointer-events-none">
                                {(votes.find(x => x.activity_id === activity!.id)?.up ?? 0) > 0 && <span className="text-emerald-600 flex items-center gap-0.5"><ThumbsUp className="w-2.5 h-2.5" />{votes.find(x => x.activity_id === activity!.id)?.up}</span>}
                                {(votes.find(x => x.activity_id === activity!.id)?.down ?? 0) > 0 && <span className="text-red-500 flex items-center gap-0.5"><ThumbsDown className="w-2.5 h-2.5" />{votes.find(x => x.activity_id === activity!.id)?.down}</span>}
                              </div>
                            )}
                            <BuilderSlot
                              activity={activity!}
                              onEdit={() => openEditActivity(trip.days[row.dayIndex].id, globalActIndex, activity!)}
                              onDelete={() => deleteActivity(trip.days[row.dayIndex].id, globalActIndex)}
                              onCopy={() => copyActivity(trip.days[row.dayIndex].id, globalActIndex)}
                              currencySymbol={currencySymbol}
                              bondColor={
                                activity!.flight_bond_id ? bondColorMap[activity!.flight_bond_id]
                                : activity!.hotel_bond_id ? bondColorMap[activity!.hotel_bond_id]
                                : bondColorMap[activity!.id]
                              }
                              isDraggable={isDraggable && filterTypes.length === 0}
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

                                // Auto-scroll when dragging near top/bottom of viewport
                                const SCROLL_ZONE = 80;
                                const SCROLL_SPEED = 10;
                                if (dragScrollRef.current) clearInterval(dragScrollRef.current);
                                if (e.clientY < SCROLL_ZONE) {
                                  dragScrollRef.current = setInterval(() => window.scrollBy(0, -SCROLL_SPEED), 16);
                                } else if (e.clientY > window.innerHeight - SCROLL_ZONE) {
                                  dragScrollRef.current = setInterval(() => window.scrollBy(0, SCROLL_SPEED), 16);
                                }

                                // Calculate drop position based on mouse X relative to slot center
                                const rect = e.currentTarget.getBoundingClientRect();
                                const position: 'before' | 'after' = e.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
                                setDragOverItem({ dayId: currentDayId, activityIndex: globalActIndex, position });
                              }}
                              onDragEnd={() => {
                                if (dragScrollRef.current) { clearInterval(dragScrollRef.current); dragScrollRef.current = null; }
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
                            </div>
                          )}
                          {row.isRTL && gap}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Add Day — bottom of timeline */}
              <div className="flex justify-center mt-8 print:hidden">
                <Button variant="outline" onClick={addDay} className="gap-2 px-6">
                  <Plus className="w-4 h-4" /> Add Day
                </Button>
              </div>


              {/* ── Print-only itinerary view ── */}
              <div className="hidden print:block space-y-8">
                {trip.days.map((day, di) => {
                  const dayLabel = day.date
                    ? new Date(day.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
                    : `Day ${di + 1}`;
                  return (
                    <div key={day.id} style={{ breakInside: "avoid" }}>
                      <div className="flex items-center gap-3 mb-3 pb-2 border-b-2 border-gray-200">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">{di + 1}</div>
                        <div>
                          <p className="font-bold text-base text-foreground">{dayLabel}</p>
                          {day.theme && day.theme !== `Day ${di + 1}` && (
                            <p className="text-xs text-muted-foreground">{day.theme}</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 pl-11">
                        {day.activities.map((act) => {
                          const cfg = getActivityConfig(act);
                          const Icon = cfg.icon;
                          return (
                            <div key={act.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                              <div className="flex items-center gap-1 w-14 shrink-0">
                                <Icon className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs font-bold text-foreground">{act.time}</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-foreground">{act.name || "Untitled"}</p>
                                {act.location && <p className="text-xs text-muted-foreground">{act.location}</p>}
                                {act.notes && <p className="text-xs text-gray-500 mt-0.5">{act.notes}</p>}
                                {act.booking_url && <p className="text-xs text-blue-600 mt-0.5">{act.booking_url}</p>}
                              </div>
                              <div className="text-right shrink-0">
                                {act.duration && <p className="text-xs text-muted-foreground">{act.duration}</p>}
                                {act.cost > 0 && <p className="text-xs font-bold text-foreground">{currencySymbol}{act.cost.toLocaleString()}</p>}
                              </div>
                            </div>
                          );
                        })}
                        {day.activities.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">No activities</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="pt-4 border-t-2 border-gray-200 flex justify-between text-sm font-bold">
                  <span>Total Cost</span>
                  <span>{currencySymbol}{totalCost.toLocaleString()}</span>
                </div>
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

      {/* Delete Day Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" /> Delete Day?
            </DialogTitle>
            <DialogDescription>
              This will permanently remove the day and all its activities. This action can be undone with Ctrl+Z.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={executeRemoveDay}>Delete Day</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Dialog */}
      <ActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activity={editingActivity}
        onSave={handleSaveActivity}
        isEditing={editingIndex >= 0}
        onLiveSave={handleLiveSaveActivity}
        onRevert={handleRevertActivity}
        currencySymbol={currencySymbol}
        days={trip.days}
        currentDayId={editingDayId}
      />
    </div>
  );
};

export default TripBuilder;
