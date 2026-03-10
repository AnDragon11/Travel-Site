import React from "react";
import {
  Plane, Hotel, Utensils, Camera, MapPin, Ticket, Coffee, ShoppingBag, Bus, Car, Train,
  Footprints, Bike, Wine,
} from "lucide-react";
import { BuilderActivity } from "./builderTypes";

// ─── Canvas Layout Constants ──────────────────────────────────────
export const SLOT_WIDTH = 200;
export const SLOT_HEIGHT = 240;
export const GAP = 20;
export const SLOT_WITH_GAP = SLOT_WIDTH + GAP;
export const PADDING = 32; // Must be >= ARC_RADIUS so Day 1 arc stays within the SVG viewport
export const ROW_HEIGHT = 320;
export const ARC_RADIUS = 30;
export const TOP_OFFSET = 80; // extra space at top for Day 1 badge

// ─── Activity Type Config ─────────────────────────────────────────
export const activityTypeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
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

// ─── Primary Types ────────────────────────────────────────────────
export const primaryTypes = ["transport", "accommodation", "food", "experience"] as const;

// ─── Subtypes ─────────────────────────────────────────────────────
export const transportSubtypes = [
  { value: "flight",   icon: Plane,      label: "Flight"        },
  { value: "train",    icon: Train,      label: "Train / Metro" },
  { value: "bus",      icon: Bus,        label: "Bus / Tram"    },
  { value: "car",      icon: Car,        label: "Drive / Taxi"  },
  { value: "cycling",  icon: Bike,       label: "Cycling"       },
  { value: "walking",  icon: Footprints, label: "Walking"       },
];

export const foodSubtypes = [
  { value: "restaurant", icon: Utensils, label: "Restaurant" },
  { value: "bar",        icon: Wine,     label: "Bar"        },
  { value: "cafe",       icon: Coffee,   label: "Café"       },
];

export const experienceSubtypes = [
  { value: "sightseeing", icon: Camera,      label: "Sightseeing" },
  { value: "shopping",    icon: ShoppingBag, label: "Shopping"    },
  { value: "activity",    icon: Ticket,      label: "Activity"    },
];

// ─── Hotel Amenities ──────────────────────────────────────────────
export const HOTEL_AMENITIES = [
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

// ─── Bond Colors ──────────────────────────────────────────────────
export const BOND_COLORS = ['sky', 'emerald', 'amber', 'rose', 'violet', 'orange', 'teal'] as const;
export type BondColor = typeof BOND_COLORS[number];

export const BOND_STYLE: Record<BondColor, { left: string; right: string }> = {
  sky:     { left: "border-l-4 border-l-sky-400",     right: "border-r-4 border-r-sky-400"     },
  emerald: { left: "border-l-4 border-l-emerald-400", right: "border-r-4 border-r-emerald-400" },
  amber:   { left: "border-l-4 border-l-amber-400",   right: "border-r-4 border-r-amber-400"   },
  rose:    { left: "border-l-4 border-l-rose-400",    right: "border-r-4 border-r-rose-400"    },
  violet:  { left: "border-l-4 border-l-violet-400",  right: "border-r-4 border-r-violet-400"  },
  orange:  { left: "border-l-4 border-l-orange-400",  right: "border-r-4 border-r-orange-400"  },
  teal:    { left: "border-l-4 border-l-teal-400",    right: "border-r-4 border-r-teal-400"    },
};

export const BOND_COLOR_HEX: Record<string, string> = {
  sky:     '#38bdf8',
  emerald: '#34d399',
  amber:   '#fbbf24',
  rose:    '#fb7185',
  violet:  '#a78bfa',
  orange:  '#fb923c',
  teal:    '#2dd4bf',
};

// ─── Placeholder Images ───────────────────────────────────────────
export const placeholderImages: Record<string, string> = {
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

// ─── Helper Functions ─────────────────────────────────────────────

// Helper: get effective icon/color for an activity (handles subtypes + legacy)
export const getActivityConfig = (activity: { type: string; subtype?: string }) => {
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
export const defaultActivityName = (type: string, subtype?: string): string => {
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

export const getPlaceholderImage = (activity: { type: string; subtype?: string }): string =>
  placeholderImages[activity.subtype ?? ""] ||
  placeholderImages[activity.type] ||
  placeholderImages.activity;
