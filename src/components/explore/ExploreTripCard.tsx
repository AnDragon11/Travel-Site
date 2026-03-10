import { useNavigate, Link } from "react-router-dom";
import { SavedTrip } from "@/lib/tripTypes";
import { cn } from "@/lib/utils";
import { MapPin, Heart, Compass } from "lucide-react";

// Defined outside Explore so React sees a stable component type — prevents unmount/remount on every parent re-render
export const ExploreTripCard = ({
  trip,
  isFavorited,
  onToggleFavorite,
  author,
  currencySymbol = "€",
}: {
  trip: SavedTrip;
  isFavorited: boolean;
  onToggleFavorite: (trip: SavedTrip) => void;
  author?: { display_name: string | null; handle: string | null; avatar_url: string | null };
  currencySymbol?: string;
}) => {
  const navigate = useNavigate();
  const totalCost = trip.days.reduce((t, d) => t + d.activities.reduce((s, a) => s + ((a as { cost?: number }).cost || 0), 0), 0);
  const firstAct = trip.days[0]?.activities[0] as { image_url?: string; image?: string } | undefined;
  const coverImage = trip.thumbnail ?? firstAct?.image_url ?? firstAct?.image;

  return (
    <div
      className="bg-card rounded-xl border border-border/50 overflow-hidden hover:shadow-md transition-all group cursor-pointer"
      onClick={() => navigate(`/trip/${trip.id}`, { state: { trip, from: 'explore' } })}
    >
      {/* Cover image */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {coverImage ? (
          <img
            src={coverImage}
            alt={trip.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Compass className="w-8 h-8 text-primary/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Overlay info at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-semibold text-white text-sm line-clamp-1 drop-shadow">{trip.title}</h3>
          <div className="flex items-center gap-2 mt-1 text-white/80 text-xs">
            <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{trip.destination}</span>
            <span>·</span>
            <span>{trip.days.length}d</span>
            <span>·</span>
            <span>{trip.travelers} traveler{trip.travelers !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(trip); }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
        >
          <Heart className={cn("w-4 h-4", isFavorited ? "fill-red-500 text-red-500" : "text-white")} />
        </button>
      </div>

      {/* Below-image strip */}
      {author && (
        <div className="px-3 pt-2 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          {author.avatar_url ? (
            <img src={author.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
              {(author.display_name || author.handle || '?')[0].toUpperCase()}
            </div>
          )}
          <Link
            to={author.handle ? `/profile/@${author.handle}` : '#'}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate"
          >
            {author.display_name || (author.handle ? `@${author.handle}` : 'Anonymous')}
          </Link>
        </div>
      )}
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex gap-1">
          {(trip.tags || []).slice(0, 2).map((tag, i) => (
            <span key={i} className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
        {totalCost > 0 && (
          <span className="text-xs font-bold text-primary">{currencySymbol}{totalCost.toLocaleString()}</span>
        )}
      </div>
    </div>
  );
};
