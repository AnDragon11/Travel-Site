import { useNavigate } from "react-router-dom";
import { SavedTrip } from "@/lib/tripTypes";
import { MapPin, Lock, Eye, Bookmark, Trash2 } from "lucide-react";

// ─── Trip Card (photo-first, diary/bucket list style) ─────────────────
export const TripCard = ({
  trip, isOwn, onTogglePublic, onToggleBucketList, onDelete, onBucketList,
}: {
  trip: SavedTrip;
  isOwn: boolean;
  onTogglePublic?: (id: string, val: boolean) => void;
  onToggleBucketList?: (id: string, val: boolean) => void;
  onDelete?: (id: string) => void;
  onBucketList?: (trip: SavedTrip) => void;
}) => {
  const navigate = useNavigate();
  const firstAct = trip.days?.[0]?.activities?.[0] as unknown as (Record<string, string>) | undefined;
  const coverPhoto = trip.thumbnail ?? trip.photos?.[0] ?? firstAct?.image_url ?? firstAct?.image;
  const startDate = trip.days?.[0]?.date
    ? new Date(trip.days[0].date + "T00:00:00").toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;

  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer group aspect-square bg-muted"
      onClick={() => navigate(`/trip/${trip.id}`, { state: { trip } })}
    >
      {/* Cover image or placeholder */}
      {coverPhoto ? (
        <img src={coverPhoto} alt={trip.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
          <MapPin className="w-10 h-10 text-white/50" />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-white text-sm font-semibold leading-tight truncate">{trip.title}</p>
        <p className="text-white/70 text-xs mt-0.5 truncate">{trip.destination}{startDate ? ` · ${startDate}` : ""}</p>
      </div>

      {/* Top-right actions */}
      <div className="absolute top-2 right-2 flex gap-1" onClick={e => e.stopPropagation()}>
        {isOwn && onTogglePublic && (
          <button
            onClick={() => onTogglePublic(trip.id, !(trip.isPublic ?? true))}
            className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            title={trip.isPublic !== false ? "Make private" : "Make public"}
          >
            {trip.isPublic !== false ? <Eye className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          </button>
        )}
        {isOwn && onToggleBucketList && (
          <button
            onClick={() => onToggleBucketList(trip.id, !trip.isBucketList)}
            className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-primary/80 transition-colors"
            title={trip.isBucketList ? "Move to Travel Diary" : "Move to Bucket List"}
          >
            <Bookmark className={`w-3.5 h-3.5 ${trip.isBucketList ? "fill-white" : ""}`} />
          </button>
        )}
        {isOwn && onDelete && (
          <button
            onClick={() => onDelete(trip.id)}
            className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500/80 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        {!isOwn && onBucketList && (
          <button
            onClick={() => onBucketList(trip)}
            className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-primary/80 transition-colors"
            title="Add to bucket list"
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Private badge */}
      {isOwn && trip.isPublic === false && (
        <div className="absolute top-2 left-2">
          <span className="flex items-center gap-1 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
            <Lock className="w-3 h-3" /> Private
          </span>
        </div>
      )}
    </div>
  );
};
