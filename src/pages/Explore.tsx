import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { MapPin, Heart, Compass, Filter, Search, X } from "lucide-react";
import { SavedTrip } from "@/lib/tripTypes";
import { cn } from "@/lib/utils";
import { loadTrips, saveTrip, deleteTrip } from "@/services/storageService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


type SortOption = 'recent' | 'popular' | 'budget-low' | 'budget-high';

const Explore = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [minBudget, setMinBudget] = useState<number | null>(null);
  const [maxBudget, setMaxBudget] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [showFilters, setShowFilters] = useState(false);
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [dbPublicTrips, setDbPublicTrips] = useState<SavedTrip[]>([]);
  const [tripAuthors, setTripAuthors] = useState<Record<string, { display_name: string | null; handle: string | null; avatar_url: string | null }>>({});

  useEffect(() => {
    loadTrips().then(setSavedTrips);
    // Load real public trips + author info from DB
    supabase
      .from("trips")
      .select("*, profiles(display_name, handle, avatar_url)")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const authors: typeof tripAuthors = {};
        setDbPublicTrips(data.map(row => {
          const profile = row.profiles as { display_name: string | null; handle: string | null; avatar_url: string | null } | null;
          if (profile) authors[row.id] = profile;
          return {
            id: row.id,
            source: row.source as SavedTrip['source'],
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            title: row.title,
            destination: row.destination,
            travelers: row.travelers,
            days: (row.days as unknown as SavedTrip['days']) ?? [],
            isFavorite: row.is_favorite,
            isPublic: row.is_public,
            isBucketList: row.is_bucket_list,
            photos: (row.photos as string[]) ?? undefined,
            tags: (row.tags as string[]) ?? undefined,
            aiMetadata: row.ai_metadata as SavedTrip['aiMetadata'] ?? undefined,
          };
        }));
        setTripAuthors(authors);
      });
  }, []);

  // A trip is favorited if the user owns it and has isFavorite=true,
  // OR if the user has saved a private copy (matched by title+destination).
  const isTripFavorited = (trip: SavedTrip): boolean => {
    const owned = savedTrips.find(t => t.id === trip.id);
    if (owned) return owned.isFavorite ?? false;
    return savedTrips.some(t => t.isFavorite && t.title === trip.title && t.destination === trip.destination);
  };

  const toggleFavorite = async (trip: SavedTrip) => {
    const isFavorited = isTripFavorited(trip);
    const ownedTrip = savedTrips.find(t => t.id === trip.id);

    if (isFavorited) {
      if (ownedTrip) {
        // Own trip — just clear the favorite flag, no copy to delete
        const updated = { ...ownedTrip, isFavorite: false };
        setSavedTrips(prev => prev.map(t => t.id === ownedTrip.id ? updated : t));
        toast.success("Removed from favorites");
        saveTrip(updated).catch(() => toast.error("Failed to update"));
      } else {
        // Someone else's trip — find and delete the private copy
        const copy = savedTrips.find(t => t.isFavorite && t.title === trip.title && t.destination === trip.destination);
        if (!copy) return;
        setSavedTrips(prev => prev.filter(t => t.id !== copy.id));
        toast.success("Removed from favorites");
        deleteTrip(copy.id).catch((e: unknown) => {
          setSavedTrips(prev => [copy, ...prev]);
          toast.error(e instanceof Error ? e.message : "Failed to remove");
        });
      }
    } else {
      if (ownedTrip) {
        // Own trip — just set the favorite flag, no copy needed
        const updated = { ...ownedTrip, isFavorite: true, isBucketList: true };
        setSavedTrips(prev => prev.map(t => t.id === ownedTrip.id ? updated : t));
        toast.success("Saved to favorites!");
        saveTrip(updated).catch(() => toast.error("Failed to update"));
      } else {
        // Someone else's trip — create a private copy so it doesn't appear in Explore again
        const copy: SavedTrip = { ...trip, id: crypto.randomUUID(), source: 'bucket_list', isFavorite: true, isBucketList: true, isPublic: false };
        setSavedTrips(prev => [...prev, copy]);
        toast.success("Saved to favorites!");
        saveTrip(copy).catch((e: unknown) => {
          setSavedTrips(prev => prev.filter(t => t.id !== copy.id));
          toast.error(e instanceof Error ? e.message : "Failed to save");
        });
      }
    }
  };

  const allTrips = dbPublicTrips;

  const destinations = Array.from(new Set(allTrips.map(t => t.destination)));
  const allTags = Array.from(new Set(allTrips.flatMap(t => t.tags || [])));

  const calculateTripCost = (trip: SavedTrip) =>
    trip.days.reduce((t, d) => t + d.activities.reduce((s, a) => s + (a.cost || 0), 0), 0);

  const hasActiveFilters = !!(searchQuery || selectedDestination || selectedTags.length > 0 ||
                           minBudget !== null || maxBudget !== null);

  const filteredTrips = allTrips.filter(trip => {
    if (searchQuery && !trip.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !trip.destination.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedDestination && trip.destination !== selectedDestination) return false;
    if (selectedTags.length > 0) {
      if (!selectedTags.some(tag => (trip.tags || []).includes(tag))) return false;
    }
    const tripCost = calculateTripCost(trip);
    if (minBudget !== null && tripCost < minBudget) return false;
    if (maxBudget !== null && tripCost > maxBudget) return false;
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'recent': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'popular': return b.travelers - a.travelers;
      case 'budget-low': return calculateTripCost(a) - calculateTripCost(b);
      case 'budget-high': return calculateTripCost(b) - calculateTripCost(a);
      default: return 0;
    }
  });

  const toggleTag = (tag: string) =>
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedDestination(null);
    setSelectedTags([]);
    setMinBudget(null);
    setMaxBudget(null);
    setSortBy('popular');
  };

  const TripCard = ({ trip }: { trip: SavedTrip }) => {
    const totalCost = calculateTripCost(trip);
    const isFavorited = isTripFavorited(trip);
    const firstAct = trip.days[0]?.activities[0] as any;
    const coverImage = firstAct?.image_url || firstAct?.image;
    const author = tripAuthors[trip.id];

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
            onClick={(e) => { e.stopPropagation(); toggleFavorite(trip); }}
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
              to={author.handle ? `/user/${author.handle}` : '#'}
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
            <span className="text-xs font-bold text-primary">€{totalCost.toLocaleString()}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16">
        <div className="container mx-auto px-4 py-5">

          {/* Top bar: search + sort + filter button */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search destinations or trips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm shrink-0"
            >
              <option value="popular">Popular</option>
              <option value="recent">Recent</option>
              <option value="budget-low">Price ↑</option>
              <option value="budget-high">Price ↓</option>
            </select>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0 gap-1.5"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0 gap-1 text-muted-foreground">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Collapsible filters panel */}
          {showFilters && (
            <div className="bg-card rounded-xl border border-border/50 p-4 mb-4">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Destination */}
                <div className="sm:w-48 shrink-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Destination</p>
                  <select
                    value={selectedDestination || ""}
                    onChange={(e) => setSelectedDestination(e.target.value || null)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="">All</option>
                    {destinations.map(dest => (
                      <option key={dest} value={dest}>{dest}</option>
                    ))}
                  </select>
                </div>

                {/* Budget */}
                <div className="sm:w-52 shrink-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Budget (€)</p>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      placeholder="Min"
                      value={minBudget || ""}
                      onChange={(e) => setMinBudget(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                    <span className="text-muted-foreground text-sm shrink-0">–</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={maxBudget || ""}
                      onChange={(e) => setMaxBudget(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                </div>

                {/* Interests */}
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Interests</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium transition-all",
                          selectedTags.includes(tag)
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent text-accent-foreground hover:bg-accent/70"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trip grid — full width */}
          {filteredTrips.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredTrips.map(trip => <TripCard key={trip.id} trip={trip} />)}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border/50 p-12 text-center">
              <Compass className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">No trips found</h3>
              <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters</p>
              <Button onClick={clearFilters} variant="outline" size="sm">Clear Filters</Button>
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Explore;
