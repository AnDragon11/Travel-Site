import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Compass, Filter, Search, X, AlertCircle, Loader2, Tag, ChevronDown, Users } from "lucide-react";
import { SavedTrip } from "@/lib/tripTypes";
import { cn } from "@/lib/utils";
import { loadTrips, saveTrip, deleteTrip } from "@/services/storageService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePreferences } from "@/context/PreferencesContext";
import { useAuth } from "@/context/AuthContext";
import { ExploreTripCard } from "@/components/explore/ExploreTripCard";

type SortOption = 'recent' | 'popular' | 'budget-low' | 'budget-high';

const Explore = () => {
  const { currencySymbol } = usePreferences();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [minBudget, setMinBudget] = useState<number | null>(null);
  const [maxBudget, setMaxBudget] = useState<number | null>(null);
  const [minDays, setMinDays] = useState<number | null>(null);
  const [maxDays, setMaxDays] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [showFilters, setShowFilters] = useState(false);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [followingOnly, setFollowingOnly] = useState(false);
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [dbPublicTrips, setDbPublicTrips] = useState<SavedTrip[]>([]);
  const [tripAuthors, setTripAuthors] = useState<Record<string, { display_name: string | null; handle: string | null; avatar_url: string | null }>>({});
  const [tripUserIds, setTripUserIds] = useState<Record<string, string>>({});
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPublicTrips = () => {
    setLoadingTrips(true);
    setLoadError(null);
    loadTrips().then(setSavedTrips).catch(() => {/* own trips failing is non-critical */});
    supabase
      .from("trips")
      .select("*, profiles(display_name, handle, avatar_url)")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        setLoadingTrips(false);
        if (error || !data) {
          setLoadError("Could not load trips. Check your connection and try again.");
          return;
        }
        const authors: typeof tripAuthors = {};
        const userIds: Record<string, string> = {};
        setDbPublicTrips(data.map(row => {
          const profile = row.profiles as { display_name: string | null; handle: string | null; avatar_url: string | null } | null;
          if (profile) authors[row.id] = profile;
          if (row.user_id) userIds[row.id] = row.user_id;
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
        setTripUserIds(userIds);
      });
  };

  useEffect(() => {
    loadPublicTrips();
  }, []);

  useEffect(() => {
    if (!user) { setFollowedUserIds(new Set()); return; }
    supabase.from("follows").select("following_id").eq("follower_id", user.id)
      .then(({ data }) => {
        setFollowedUserIds(new Set((data ?? []).map(r => r.following_id as string)));
      });
  }, [user]);

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
                           minBudget !== null || maxBudget !== null || minDays !== null || maxDays !== null || followingOnly);

  const filteredTrips = allTrips.filter(trip => {
    if (followingOnly && !followedUserIds.has(tripUserIds[trip.id])) return false;
    if (searchQuery && !trip.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !trip.destination.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedDestination && trip.destination !== selectedDestination) return false;
    if (selectedTags.length > 0) {
      if (!selectedTags.some(tag => (trip.tags || []).includes(tag))) return false;
    }
    const tripCost = calculateTripCost(trip);
    if (minBudget !== null && tripCost < minBudget) return false;
    if (maxBudget !== null && tripCost > maxBudget) return false;
    if (minDays !== null && trip.days.length < minDays) return false;
    if (maxDays !== null && trip.days.length > maxDays) return false;
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
    setMinDays(null);
    setMaxDays(null);
    setSortBy('popular');
    setFollowingOnly(false);
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
            {user && (
              <Button
                variant={followingOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setFollowingOnly(v => !v)}
                className="shrink-0 gap-1.5"
                title="Show only trips from people you follow"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Following</span>
              </Button>
            )}
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

          {/* Tag filter strip */}
          {allTags.length > 0 && (
            <div className="mb-3">
              <button
                onClick={() => setShowTagFilter(v => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                <Tag className="w-3.5 h-3.5" />
                Tags
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTagFilter ? "rotate-180" : ""}`} />
                {selectedTags.length > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{selectedTags.length}</span>
                )}
              </button>
              {showTagFilter && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        selectedTags.includes(tag)
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent text-accent-foreground hover:bg-accent/70"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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

                {/* Duration */}
                <div className="sm:w-44 shrink-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Duration (days)</p>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      placeholder="Min"
                      min={1}
                      value={minDays || ""}
                      onChange={(e) => setMinDays(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                    <span className="text-muted-foreground text-sm shrink-0">–</span>
                    <input
                      type="number"
                      placeholder="Max"
                      min={1}
                      value={maxDays || ""}
                      onChange={(e) => setMaxDays(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                </div>

                {/* Budget */}
                <div className="sm:w-52 shrink-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Budget ({currencySymbol})</p>
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
          {loadingTrips ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : loadError ? (
            <div className="bg-card rounded-xl border border-destructive/30 p-12 text-center">
              <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Failed to load trips</h3>
              <p className="text-sm text-muted-foreground mb-4">{loadError}</p>
              <Button onClick={loadPublicTrips} variant="outline" size="sm">Try again</Button>
            </div>
          ) : filteredTrips.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredTrips.map(trip => (
                <ExploreTripCard
                  key={trip.id}
                  trip={trip}
                  isFavorited={isTripFavorited(trip)}
                  onToggleFavorite={toggleFavorite}
                  author={tripAuthors[trip.id]}
                  currencySymbol={currencySymbol}
                />
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border/50 p-12 text-center">
              <Compass className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">No trips found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters ? "Try adjusting your filters" : "Be the first to share a trip!"}
              </p>
              {hasActiveFilters && <Button onClick={clearFilters} variant="outline" size="sm">Clear Filters</Button>}
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Explore;
