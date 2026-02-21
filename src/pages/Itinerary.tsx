import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useTripContext } from "@/context/TripContext";
import {
  Plane,
  Hotel,
  Utensils,
  Camera,
  MapPin,
  Clock,
  Calendar,
  Users,
  Download,
  Share2,
  Ticket,
  Coffee,
  ShoppingBag,
  Bus,
  Car,
  Train,
  Footprints,
  GripVertical,
  Save,
  Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { convertItineraryToTrip } from "@/lib/tripConverter";
import { saveTrip } from "@/services/storageService";

// Activity type config
const activityTypeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  accommodation: { icon: Hotel, color: "text-blue-500", bgColor: "bg-blue-50/60 dark:bg-blue-950/40 border-blue-200/50 dark:border-blue-800/50" },
  dining: { icon: Utensils, color: "text-orange-500", bgColor: "bg-orange-50/60 dark:bg-orange-950/40 border-orange-200/50 dark:border-orange-800/50" },
  sightseeing: { icon: Camera, color: "text-emerald-500", bgColor: "bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-800/50" },
  activity: { icon: Ticket, color: "text-purple-500", bgColor: "bg-purple-50/60 dark:bg-purple-950/40 border-purple-200/50 dark:border-purple-800/50" },
  transport: { icon: Bus, color: "text-cyan-500", bgColor: "bg-cyan-50/60 dark:bg-cyan-950/40 border-cyan-200/50 dark:border-cyan-800/50" },
  shopping: { icon: ShoppingBag, color: "text-pink-500", bgColor: "bg-pink-50/60 dark:bg-pink-950/40 border-pink-200/50 dark:border-pink-800/50" },
  cafe: { icon: Coffee, color: "text-amber-500", bgColor: "bg-amber-50/60 dark:bg-amber-950/40 border-amber-200/50 dark:border-amber-800/50" },
  flight: { icon: Plane, color: "text-sky-500", bgColor: "bg-sky-50/60 dark:bg-sky-950/40 border-sky-200/50 dark:border-sky-800/50" },
};

// Transport config
const transportConfig: Record<string, { icon: React.ElementType; label: string }> = {
  walk: { icon: Footprints, label: "Walk" },
  car: { icon: Car, label: "Drive" },
  bus: { icon: Bus, label: "Bus" },
  train: { icon: Train, label: "Train" },
};

interface Activity {
  time: string;
  name: string;
  type: string;
  duration: string;
  location: string;
  cost?: number;
  notes?: string;
  booking_url?: string;
  image_url?: string;
  amenities?: string[];
  flight_class?: string;
  rating?: number;
  address?: string;
  phone?: string;
  website?: string;
  confirmation_code?: string;
  provider?: string;
  category?: string;
}

interface TransportInfo {
  type: "walk" | "car" | "bus" | "train";
  duration: string;
}

interface SlotData {
  id: string;
  activity: Activity;
  dayIndex: number;
  activityIndex: number;
  isFlightSlot?: boolean;
  transport?: TransportInfo;
}

const getPlaceholderTransport = (): TransportInfo => {
  const types: Array<"walk" | "car" | "bus" | "train"> = ["walk", "car", "bus", "train"];
  const durations = ["5 min", "10 min", "15 min", "20 min"];
  return {
    type: types[Math.floor(Math.random() * types.length)],
    duration: durations[Math.floor(Math.random() * durations.length)],
  };
};

// Placeholder images by activity type
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

// Activity Slot Component
const ActivitySlot = ({ 
  slot, 
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: { 
  slot: SlotData;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent, slot: SlotData) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, slot: SlotData) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, slot: SlotData) => void;
}) => {
  const config = activityTypeConfig[slot.activity.type] || activityTypeConfig.activity;
  const Icon = config.icon;
  const isAccommodation = slot.activity.type === 'accommodation';
  const isDraggable = !slot.isFlightSlot;
  const imageUrl = slot.activity.image_url || placeholderImages[slot.activity.type] || placeholderImages.activity;

  return (
    <div
      draggable={isDraggable}
      onDragStart={(e) => isDraggable && onDragStart(e, slot)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, slot)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, slot)}
      className={cn(
        "relative group flex flex-col rounded-xl border transition-all duration-200 w-[200px] h-[240px] shrink-0 bg-card overflow-hidden",
        config.bgColor,
        isDragging && "opacity-40 scale-95",
        isDragOver && "ring-2 ring-primary ring-offset-2 scale-105",
        isDraggable ? "cursor-grab active:cursor-grabbing hover:shadow-lg hover:-translate-y-1" : "cursor-default"
      )}
    >
      {isDraggable && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-80 transition-opacity z-10">
          <GripVertical className="w-4 h-4 text-white drop-shadow-md" />
        </div>
      )}

      {/* Image area */}
      <div className="relative w-full h-[110px] shrink-0">
        <img
          src={imageUrl}
          alt={slot.activity.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Type badge overlay */}
        <div className={cn(
          "absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-sm bg-background/70 shadow-sm",
          config.color
        )}>
          <Icon className="w-3 h-3" />
          <span className="capitalize">{slot.activity.type}</span>
        </div>
        {/* Time badge */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-sm bg-background/70 text-foreground shadow-sm">
          {slot.activity.time}
        </div>
      </div>

      {/* Text area */}
      <div className="flex flex-col flex-1 p-3">
        <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight mb-1">
          {slot.activity.name}
        </h4>

        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-auto">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{slot.activity.location}</span>
        </div>

        <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/30">
          <span className="text-[11px] text-muted-foreground">{slot.activity.duration}</span>
          {slot.activity.cost !== undefined && (
            <span className="text-xs font-semibold text-foreground">€{slot.activity.cost}</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Transport bubble between activities
const TransportBubble = ({ transport }: { transport?: TransportInfo }) => {
  const TransportIcon = transport ? transportConfig[transport.type]?.icon || Bus : null;
  if (!transport || !TransportIcon) return null;

  return (
    <div className="flex flex-col items-center justify-center w-11 h-11 bg-background rounded-full border border-border shadow-sm z-10">
      <TransportIcon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-[8px] font-medium text-muted-foreground">{transport.duration}</span>
    </div>
  );
};

const Itinerary = () => {
  const navigate = useNavigate();
  const { itinerary } = useTripContext();
  const [dayActivities, setDayActivities] = useState<Record<number, SlotData[]>>({});
  const [draggedSlot, setDraggedSlot] = useState<SlotData | null>(null);
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);
  const [departureSlot, setDepartureSlot] = useState<SlotData | null>(null);
  const [returnSlot, setReturnSlot] = useState<SlotData | null>(null);
  const [containerWidth, setContainerWidth] = useState(1000);
  const [isSaved, setIsSaved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Build slots from itinerary
  useEffect(() => {
    if (!itinerary) return;

    setDepartureSlot({
      id: 'flight-departure',
      activity: {
        time: '06:00',
        name: itinerary.flights.outbound.split(',')[0],
        type: 'flight',
        duration: '2-3h',
        location: 'Airport',
      },
      dayIndex: 0,
      activityIndex: -1,
      isFlightSlot: true,
    });

    setReturnSlot({
      id: 'flight-return',
      activity: {
        time: '18:00',
        name: itinerary.flights.return.split(',')[0],
        type: 'flight',
        duration: '2-3h',
        location: 'Airport',
      },
      dayIndex: itinerary.daily_itinerary.length - 1,
      activityIndex: -1,
      isFlightSlot: true,
    });

    const grouped: Record<number, SlotData[]> = {};
    itinerary.daily_itinerary.forEach((day, dayIndex) => {
      grouped[dayIndex] = day.activities.map((activity, activityIndex) => ({
        id: `day-${dayIndex}-activity-${activityIndex}`,
        activity,
        dayIndex,
        activityIndex,
        transport: activityIndex > 0 ? getPlaceholderTransport() : undefined,
      }));
    });
    setDayActivities(grouped);
  }, [itinerary]);

  useEffect(() => {
    if (!itinerary) {
      navigate("/");
    }
  }, [itinerary, navigate]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, slot: SlotData) => {
    setDraggedSlot(slot);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedSlot(null);
    setDragOverSlotId(null);
  }, []);

  const canDrop = useCallback((source: SlotData, target: SlotData): boolean => {
    if (target.isFlightSlot) return false;
    if (source.id === target.id) return false;
    // Accommodation can only be swapped within the same day
    const sourceIsAccom = source.activity.type === 'accommodation';
    const targetIsAccom = target.activity.type === 'accommodation';
    if (sourceIsAccom && source.dayIndex !== target.dayIndex) return false;
    if (targetIsAccom && source.dayIndex !== target.dayIndex) return false;
    return true;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetSlot: SlotData) => {
    e.preventDefault();
    if (draggedSlot && canDrop(draggedSlot, targetSlot)) {
      setDragOverSlotId(targetSlot.id);
    }
  }, [draggedSlot, canDrop]);

  const handleDragLeave = useCallback(() => {
    setDragOverSlotId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetSlot: SlotData) => {
    e.preventDefault();
    setDragOverSlotId(null);
    
    if (!draggedSlot || !canDrop(draggedSlot, targetSlot)) {
      setDraggedSlot(null);
      return;
    }

    const sourceDayIndex = draggedSlot.dayIndex;
    const targetDayIndex = targetSlot.dayIndex;

    setDayActivities(prev => {
      const newState = { ...prev };
      const sourceDay = [...(newState[sourceDayIndex] || [])];
      const targetDay = sourceDayIndex === targetDayIndex ? sourceDay : [...(newState[targetDayIndex] || [])];
      
      const sourceIndex = sourceDay.findIndex(s => s.id === draggedSlot.id);
      const targetIndex = targetDay.findIndex(s => s.id === targetSlot.id);
      
      if (sourceIndex === -1 || targetIndex === -1) return prev;

      if (sourceDayIndex === targetDayIndex) {
        const [removed] = sourceDay.splice(sourceIndex, 1);
        sourceDay.splice(targetIndex, 0, removed);
        newState[sourceDayIndex] = sourceDay;
      } else {
        const [removed] = sourceDay.splice(sourceIndex, 1);
        removed.dayIndex = targetDayIndex;
        targetDay.splice(targetIndex, 0, removed);
        newState[sourceDayIndex] = sourceDay;
        newState[targetDayIndex] = targetDay;
      }

      return newState;
    });

    setDraggedSlot(null);
  }, [draggedSlot, canDrop]);

  // Save and customize handlers
  const { clearTrip } = useTripContext();

  const handleSaveTrip = async () => {
    if (!itinerary) return;
    try {
      const savedTrip = convertItineraryToTrip(itinerary);
      await saveTrip(savedTrip);
      setIsSaved(true);
      clearTrip();
      toast.success("Trip saved permanently!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save trip");
    }
  };

  const handleCustomize = async () => {
    if (!itinerary) return;
    try {
      const savedTrip = convertItineraryToTrip(itinerary);
      await saveTrip(savedTrip);
      navigate(`/builder/${savedTrip.id}`);
      toast.success("Opening trip in editor...");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save trip");
    }
  };

  if (!itinerary) {
    return null;
  }

  // Calculate layout constants
  const SLOT_WIDTH = 200;
  const SLOT_HEIGHT = 240;
  const GAP = 14;
  const TRANSPORT_WIDTH = 44;
  const SLOT_WITH_GAP = SLOT_WIDTH + GAP + TRANSPORT_WIDTH;
  const PADDING = 24;
  const availableWidth = containerWidth - PADDING * 2;
  const slotsPerRow = Math.max(1, Math.floor((availableWidth + GAP + TRANSPORT_WIDTH) / SLOT_WITH_GAP));

  // Build all rows for all days
  interface RowData {
    dayIndex: number;
    rowIndexInDay: number;
    totalRowsInDay: number;
    slots: SlotData[];
    isReversed: boolean;
    isFirstRowOfDay: boolean;
    isLastRowOfDay: boolean;
    day: typeof itinerary.daily_itinerary[0];
  }

  const allRows: RowData[] = [];
  let globalRowIndex = 0;

  itinerary.daily_itinerary.forEach((day, dayIndex) => {
    const daySlots: SlotData[] = [];
    
    // Add departure flight for first day
    if (dayIndex === 0 && departureSlot) {
      daySlots.push(departureSlot);
    }
    
    // Add day activities
    daySlots.push(...(dayActivities[dayIndex] || []));
    
    // Add return flight for last day
    if (dayIndex === itinerary.daily_itinerary.length - 1 && returnSlot) {
      daySlots.push(returnSlot);
    }

    // Split into rows
    const dayRows: SlotData[][] = [];
    for (let i = 0; i < daySlots.length; i += slotsPerRow) {
      dayRows.push(daySlots.slice(i, i + slotsPerRow));
    }

    // Add each row - ALL rows are left-to-right (never reversed)
    dayRows.forEach((rowSlots, rowIndexInDay) => {
      allRows.push({
        dayIndex,
        rowIndexInDay,
        totalRowsInDay: dayRows.length,
        slots: rowSlots,
        isReversed: false, // Always L→R
        isFirstRowOfDay: rowIndexInDay === 0,
        isLastRowOfDay: rowIndexInDay === dayRows.length - 1,
        day,
      });
      globalRowIndex++;
    });
  });

  const activitiesCost = itinerary.daily_itinerary.reduce((total, day) => {
    return total + day.activities.reduce((dayTotal, act) => dayTotal + (act.cost || 0), 0);
  }, 0);

  // Calculate SVG path for the snake
  const ROW_HEIGHT = 320;
  const CURVE_RADIUS = 40;
  const CURVE_PAD = 24;

  const step = SLOT_WIDTH + GAP + TRANSPORT_WIDTH;
  const getRowWidth = (slotCount: number) =>
    slotCount * SLOT_WIDTH + Math.max(0, slotCount - 1) * (GAP + TRANSPORT_WIDTH);

  const rowLayouts = useMemo(() => {
    return allRows.map((row, rowIndex) => {
      const slotCount = row.slots.length;
      const rowWidth = getRowWidth(slotCount);
      const rowLeft = row.isReversed ? containerWidth - PADDING - rowWidth : PADDING;
      const yCenter = rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
      const top = rowIndex * ROW_HEIGHT + (ROW_HEIGHT - SLOT_HEIGHT) / 2;

      const getSlotCenterX = (slotIndex: number) => {
        if (!row.isReversed) return rowLeft + slotIndex * step + SLOT_WIDTH / 2;
        // row-reverse: slot 0 is at the right side; subsequent slots move left
        return rowLeft + rowWidth - (slotIndex * step + SLOT_WIDTH / 2);
      };

      const startX = getSlotCenterX(0);
      const endX = getSlotCenterX(Math.max(0, slotCount - 1));

      const endSide: "left" | "right" = row.isReversed ? "left" : "right";
      const startSide: "left" | "right" = row.isReversed ? "right" : "left";

      const startEdgeX = startX + (startSide === "right" ? SLOT_WIDTH / 2 : -SLOT_WIDTH / 2);
      const endEdgeX = endX + (endSide === "right" ? SLOT_WIDTH / 2 : -SLOT_WIDTH / 2);

      return {
        ...row,
        rowIndex,
        slotCount,
        rowWidth,
        rowLeft,
        yCenter,
        top,
        startX,
        endX,
        startEdgeX,
        endEdgeX,
        endSide,
      };
    });
  }, [allRows, containerWidth, PADDING, ROW_HEIGHT, SLOT_HEIGHT, SLOT_WIDTH, step]);
  
  const generateSnakePath = () => {
    if (rowLayouts.length === 0) return "";

    const parts: string[] = [];
    const ARC_RADIUS = 30; // Radius for 180° U-turn arcs

    rowLayouts.forEach((row, idx) => {
      if (row.slotCount === 0) return;

      // Start or continue from left edge of first slot
      if (idx === 0) {
        parts.push(`M ${row.startEdgeX} ${row.yCenter}`);
      }

      // Draw horizontal line through this row to the right edge of last slot
      parts.push(`L ${row.endEdgeX} ${row.yCenter}`);

      // Connector to next row (if any)
      const next = rowLayouts[idx + 1];
      if (!next || next.slotCount === 0) return;

      // Calculate midpoint Y between current row and next row (for horizontal connector)
      const gapY = (row.yCenter + next.yCenter) / 2;

      // Right-side 90° arc: curve from horizontal to vertical (going down-right then turning left)
      // sweep = 1 (clockwise) to curve right then down
      parts.push(`A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${row.endEdgeX + ARC_RADIUS} ${row.yCenter + ARC_RADIUS}`);

      // Vertical line down to the gap level minus arc radius
      parts.push(`L ${row.endEdgeX + ARC_RADIUS} ${gapY - ARC_RADIUS}`);

      // 90° arc: turn from vertical to horizontal (going left)
      parts.push(`A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${row.endEdgeX} ${gapY}`);

      // Horizontal line going LEFT to left side
      parts.push(`L ${next.startEdgeX} ${gapY}`);

      // Left-side 90° arc: curve from horizontal to vertical (going down)
      // sweep = 0 (counter-clockwise) to curve left then down
      parts.push(`A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 0 ${next.startEdgeX - ARC_RADIUS} ${gapY + ARC_RADIUS}`);

      // Vertical line down to next row minus arc radius
      parts.push(`L ${next.startEdgeX - ARC_RADIUS} ${next.yCenter - ARC_RADIUS}`);

      // 90° arc: turn from vertical to horizontal (going right into next row)
      parts.push(`A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 0 ${next.startEdgeX} ${next.yCenter}`);
    });

    return parts.join(" ");
  };

  // Find positions for day badges (on the horizontal connector between rows)
  const getDayBadgePositions = () => {
    const positions: { x: number; y: number; day: typeof itinerary.daily_itinerary[0] }[] = [];
    rowLayouts.forEach((row, idx) => {
      if (!row.isFirstRowOfDay || row.dayIndex === 0) return;
      const prev = rowLayouts[idx - 1];
      if (!prev) return;

      // Badge sits on the horizontal connector line between rows
      const gapY = (prev.yCenter + row.yCenter) / 2;
      
      // Center the badge horizontally
      const x = containerWidth / 2;

      positions.push({ x, y: gapY, day: row.day });
    });

    return positions;
  };

  const svgHeight = allRows.length * ROW_HEIGHT;
  const dayBadgePositions = getDayBadgePositions();
  const snakePath = useMemo(() => generateSnakePath(), [rowLayouts]);

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 pt-16">
        {/* Hero Header */}
        <section className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground py-10 md:py-14">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">{itinerary.destination}</h1>
                  <div className="flex flex-wrap items-center gap-3 text-primary-foreground/80 text-sm">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {itinerary.dates}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {itinerary.travelers} traveler{itinerary.travelers !== 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-primary-foreground/20 px-2 py-0.5 rounded-full text-xs font-medium">
                      {itinerary.comfort_level_emoji} {itinerary.comfort_level_name}
                    </span>
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-primary-foreground/70 text-xs mb-0.5">Total Cost</p>
                  <p className="text-3xl font-bold">${itinerary.total_cost.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5 h-8"
                  onClick={handleSaveTrip}
                  disabled={isSaved}
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaved ? 'Saved' : 'Save Trip'}
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  className="gap-1.5 h-8"
                  onClick={handleCustomize}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Customize
                </Button>

                <Button variant="outline" size="sm" className="gap-1.5 h-8 bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  <Download className="w-3.5 h-3.5" />
                  Download
                </Button>

                <Button variant="outline" size="sm" className="gap-1.5 h-8 bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Summary Cards */}
        <section className="py-6 -mt-4">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                    <Plane className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">Flights</h3>
                </div>
                <p className="text-xs text-muted-foreground truncate mb-1">{itinerary.flights.outbound.split(',')[0]}</p>
                <p className="text-lg font-bold text-foreground">${itinerary.flights.total_cost}</p>
              </div>

              <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center">
                    <Hotel className="w-4 h-4 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">Accommodation</h3>
                </div>
                <p className="text-xs text-muted-foreground truncate mb-1">{itinerary.accommodation.name}</p>
                <p className="text-lg font-bold text-foreground">${itinerary.accommodation.total_cost}</p>
              </div>

              <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                    <Ticket className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">Activities</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{itinerary.daily_itinerary.reduce((t, d) => t + d.activities.length, 0)} planned</p>
                <p className="text-lg font-bold text-foreground">~€{activitiesCost * itinerary.travelers}</p>
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
                  <Clock className="w-5 h-5 text-primary" />
                  Your Journey
                </h2>
                <p className="text-xs text-muted-foreground">Drag activities to rearrange</p>
              </div>

              {/* First day header */}
              {allRows.length > 0 && (
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center shadow-lg">
                    {itinerary.daily_itinerary[0].day}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{itinerary.daily_itinerary[0].date}</p>
                    <p className="text-sm text-muted-foreground">{itinerary.daily_itinerary[0].theme}</p>
                  </div>
                </div>
              )}

              {/* Journey Canvas */}
              <div className="relative" style={{ height: svgHeight }}>
                {/* SVG Snake Path */}
                <svg 
                  className="absolute inset-0 pointer-events-none"
                  width={containerWidth}
                  height={svgHeight}
                  style={{ overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="snakeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
                    </linearGradient>
                  </defs>
                  <path
                    d={snakePath}
                    fill="none"
                    stroke="url(#snakeGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={snakePath}
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth="2"
                    strokeDasharray="8 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* Day badges on connector lines */}
                {dayBadgePositions.map((pos, idx) => (
                  <div
                    key={idx}
                    className="absolute flex items-center gap-2 bg-background px-3 py-1.5 rounded-full shadow-lg border border-border z-20"
                    style={{
                      left: pos.x,
                      top: pos.y,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center">
                      {pos.day.day}
                    </div>
                    <p className="text-sm font-semibold text-foreground pr-1">{pos.day.date}</p>
                  </div>
                ))}

                {/* Activity rows */}
                {rowLayouts.map((row) => (
                  <div
                    key={`row-${row.rowIndex}`}
                    className="absolute flex items-center"
                    style={{
                      top: row.top,
                      left: row.rowLeft,
                      width: row.rowWidth,
                      flexDirection: row.isReversed ? "row-reverse" : "row",
                    }}
                  >
                    {row.slots.map((slot, slotIndex) => {
                      const showTransport = slotIndex > 0;
                      const transport = row.slots[slotIndex]?.transport;

                      return (
                        <div key={slot.id} className="flex items-center">
                          {showTransport && (
                            <div
                              className="flex items-center justify-center"
                              style={{ width: GAP + TRANSPORT_WIDTH }}
                            >
                              <TransportBubble transport={transport} />
                            </div>
                          )}
                          <ActivitySlot
                            slot={slot}
                            isDragging={draggedSlot?.id === slot.id}
                            isDragOver={dragOverSlotId === slot.id}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-3 h-3" />
                  <span>Drag to reorder activities</span>
                </div>
                <div className="flex items-center gap-2">
                  <Plane className="w-3 h-3 text-sky-600" />
                  <span>Flights cannot be moved</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Itinerary;
