import { cn } from "@/lib/utils";
import {
  Plane, Clock, MapPin, GripVertical, Pencil, CopyPlus, Trash2, ExternalLink, Star,
  MessageSquare, Plus, Paperclip,
} from "lucide-react";
import { BuilderActivity } from "@/lib/builderTypes";
import { getActivityConfig, getPlaceholderImage, BOND_STYLE, BondColor } from "@/lib/builderConstants";

// ─── Activity Slot ─────────────────────────────────────────────────
export const BuilderSlot = ({
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
  isRTL = false,
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
  isRTL?: boolean;
}) => {
  const config = getActivityConfig(activity);
  const Icon = config.icon;
  const imageUrl = activity.image_url || getPlaceholderImage(activity);
  const isHotelCheckout = activity.type === "accommodation" && activity.is_checkout;
  const isFlightArrival = (activity.type === "transport" || activity.type === "flight") && activity.is_arrival;
  const bondStyle = bondColor ? BOND_STYLE[bondColor as BondColor] : null;
  const isSecondCard = isFlightArrival || isHotelCheckout;

  // Visual position of insertion line, accounting for RTL
  const lineLeft  = isDragOver && (isRTL ? dropPosition === 'after'  : dropPosition === 'before');
  const lineRight = isDragOver && (isRTL ? dropPosition === 'before' : dropPosition === 'after');

  return (
    <div className="relative" style={{ width: 200 }}>
      {/* Insertion line — left side */}
      {lineLeft && (
        <div className="absolute -left-[11px] top-0 bottom-0 w-[3px] rounded-full bg-primary z-30 shadow-[0_0_10px_2px_hsl(var(--primary)/0.5)] animate-in fade-in duration-100" />
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
          isDragging && "opacity-0 pointer-events-none",
          // Bond strip: mirrored on RTL rows so the stripe always faces the partner card
          bondStyle && isSecondCard && (isRTL ? bondStyle.right : bondStyle.left),
          bondStyle && !isSecondCard && (isRTL ? bondStyle.left : bondStyle.right),
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
          {(activity.attachments?.length ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-muted-foreground shrink-0" title={`${activity.attachments!.length} attachment${activity.attachments!.length !== 1 ? "s" : ""}`}>
              <Paperclip className="w-3 h-3" />
              <span className="text-[10px]">{activity.attachments!.length}</span>
            </span>
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

        {/* Tags */}
        {activity.tags && activity.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 px-3 pb-2">
            {activity.tags.map((tag, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium border border-border/50">
                {tag}
              </span>
            ))}
          </div>
        )}

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

      {/* Insertion line — right side */}
      {lineRight && (
        <div className="absolute -right-[11px] top-0 bottom-0 w-[3px] rounded-full bg-primary z-30 shadow-[0_0_10px_2px_hsl(var(--primary)/0.5)] animate-in fade-in duration-100" />
      )}
    </div>
  );
};

// ─── Add Activity Card ──────────────────────────────────────────────
export const AddSlotCard = ({
  onClick,
  onDragOver,
  onDrop,
  isDragOver = false,
  bondColor,
}: {
  onClick: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
  bondColor?: string; // hex color from snake timeline segment
}) => (
  <button
    onClick={onClick}
    onDragOver={onDragOver}
    onDrop={onDrop}
    style={bondColor ? { borderColor: bondColor + "99", backgroundColor: bondColor + "14" } : undefined}
    className={cn(
      "flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 w-[200px] h-[240px] shrink-0 cursor-pointer group",
      !bondColor && "border-border/60 hover:border-primary/50 bg-muted hover:bg-muted/80",
      isDragOver && "ring-2 ring-primary ring-offset-2 border-primary"
    )}
  >
    <div
      className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors", !bondColor && "bg-primary/10 group-hover:bg-primary/20")}
      style={bondColor ? { backgroundColor: bondColor + "33" } : undefined}
    >
      <Plus className={cn("w-6 h-6", !bondColor && "text-primary")} style={bondColor ? { color: bondColor } : undefined} />
    </div>
    <span
      className={cn("text-sm font-medium transition-colors", !bondColor && "text-muted-foreground group-hover:text-foreground")}
      style={bondColor ? { color: bondColor } : undefined}
    >
      Add Activity
    </span>
  </button>
);

// ─── Drag Ghost Placeholder ─────────────────────────────────────────
export const DragGhost = () => (
  <div
    className="rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 w-[200px] shrink-0 flex items-center justify-center pointer-events-none animate-in fade-in zoom-in-95 duration-150"
    style={{ minHeight: 240 }}
  >
    <GripVertical className="w-6 h-6 text-primary/30" />
  </div>
);
