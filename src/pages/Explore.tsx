import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Users, Heart, Compass, Filter, Search, X } from "lucide-react";
import { SavedTrip } from "@/lib/tripTypes";
import { cn } from "@/lib/utils";
import { loadTrips, saveTrip } from "@/services/storageService";
import { toast } from "sonner";

// Placeholder trips marked as samples
const PLACEHOLDER_TRIPS: SavedTrip[] = [
  {
    id: "sample-1",
    source: "ai",
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-15T10:00:00Z",
    title: "Romantic Getaway in Paris",
    destination: "Paris, France",
    travelers: 2,
    rating: 5,
    review: "An absolutely magical experience! The Eiffel Tower at sunset was breathtaking, and the cozy cafés along the Seine made every moment special.",
    tags: ["Romance", "Culture", "Fine Dining"],
    isFavorite: true,
    days: [
      {
        date: "2025-03-15",
        activities: [
          {
            id: "act-1",
            time: "09:00",
            title: "Visit Eiffel Tower",
            description: "Iconic landmark with stunning views",
            location: "Champ de Mars",
            cost: 26,
            image: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f",
            duration: "2 hours",
            transportType: "metro",
            transportDuration: "20 min",
            category: "sightseeing"
          },
          {
            id: "act-2",
            time: "14:00",
            title: "Louvre Museum",
            description: "World's largest art museum",
            location: "Rue de Rivoli",
            cost: 17,
            image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a",
            duration: "3 hours",
            transportType: "walk",
            transportDuration: "10 min",
            category: "culture"
          }
        ]
      },
      {
        date: "2025-03-16",
        activities: [
          {
            id: "act-3",
            time: "10:00",
            title: "Versailles Palace",
            description: "Royal château with magnificent gardens",
            location: "Versailles",
            cost: 20,
            image: "https://images.unsplash.com/photo-1542649180-330233d55156",
            duration: "4 hours",
            transportType: "train",
            transportDuration: "45 min",
            category: "sightseeing"
          }
        ]
      }
    ],
    aiMetadata: {
      comfortLevel: 3,
      comfortLevelName: "Premium",
      comfortLevelEmoji: "💎",
      originalDates: "2025-03-15 - 2025-03-16"
    }
  },
  {
    id: "sample-2",
    source: "custom",
    createdAt: "2025-01-10T14:30:00Z",
    updatedAt: "2025-01-10T14:30:00Z",
    title: "Adventure in Iceland",
    destination: "Reykjavik, Iceland",
    travelers: 4,
    rating: 5,
    review: "The Northern Lights were incredible! Hiking on glaciers and soaking in the Blue Lagoon - pure adventure.",
    tags: ["Adventure", "Nature", "Photography"],
    days: [
      {
        date: "2025-06-10",
        activities: [
          {
            id: "act-4",
            time: "07:00",
            title: "Golden Circle Tour",
            description: "Geysers, waterfalls, and geothermal areas",
            location: "South Iceland",
            cost: 89,
            image: "https://images.unsplash.com/photo-1504893524553-b855bce32c67",
            duration: "8 hours",
            transportType: "bus",
            transportDuration: "1 hour",
            category: "adventure"
          },
          {
            id: "act-5",
            time: "18:00",
            title: "Blue Lagoon",
            description: "Geothermal spa in lava field",
            location: "Grindavík",
            cost: 75,
            image: "https://images.unsplash.com/photo-1551361415-69c87624334f",
            duration: "2 hours",
            transportType: "car",
            transportDuration: "30 min",
            category: "relaxation"
          }
        ]
      }
    ]
  },
  {
    id: "sample-3",
    source: "custom",
    createdAt: "2025-01-08T09:15:00Z",
    updatedAt: "2025-01-08T09:15:00Z",
    title: "Tokyo Food & Culture Tour",
    destination: "Tokyo, Japan",
    travelers: 3,
    rating: 5,
    review: "Sushi at Tsukiji Market was life-changing. The blend of ancient temples and futuristic tech is mind-blowing!",
    tags: ["Food", "Culture", "Shopping"],
    days: [
      {
        date: "2025-04-20",
        activities: [
          {
            id: "act-6",
            time: "06:00",
            title: "Tsukiji Fish Market",
            description: "Fresh sushi breakfast experience",
            location: "Chuo City",
            cost: 35,
            image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1",
            duration: "2 hours",
            transportType: "metro",
            transportDuration: "15 min",
            category: "food"
          },
          {
            id: "act-7",
            time: "11:00",
            title: "Senso-ji Temple",
            description: "Tokyo's oldest Buddhist temple",
            location: "Asakusa",
            cost: 0,
            image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e",
            duration: "1.5 hours",
            transportType: "metro",
            transportDuration: "20 min",
            category: "culture"
          },
          {
            id: "act-8",
            time: "19:00",
            title: "Shibuya Crossing",
            description: "World's busiest pedestrian crossing",
            location: "Shibuya",
            cost: 0,
            image: "https://images.unsplash.com/photo-1542051841857-5f90071e7989",
            duration: "1 hour",
            transportType: "metro",
            transportDuration: "10 min",
            category: "sightseeing"
          }
        ]
      }
    ]
  },
  {
    id: "sample-4",
    source: "custom",
    createdAt: "2025-01-05T16:45:00Z",
    updatedAt: "2025-01-05T16:45:00Z",
    title: "Beach Relaxation in Bali",
    destination: "Bali, Indonesia",
    travelers: 2,
    rating: 4,
    review: "Perfect for unwinding. The rice terraces are stunning, and the beach clubs offer amazing sunset views.",
    tags: ["Beach", "Relaxation", "Yoga"],
    days: [
      {
        date: "2025-07-01",
        activities: [
          {
            id: "act-9",
            time: "09:00",
            title: "Tegallalang Rice Terraces",
            description: "Iconic green rice paddies",
            location: "Ubud",
            cost: 15,
            image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4",
            duration: "2 hours",
            transportType: "scooter",
            transportDuration: "30 min",
            category: "nature"
          },
          {
            id: "act-10",
            time: "15:00",
            title: "Beach Club Afternoon",
            description: "Infinity pool and ocean views",
            location: "Seminyak Beach",
            cost: 50,
            image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19",
            duration: "4 hours",
            transportType: "taxi",
            transportDuration: "25 min",
            category: "relaxation"
          }
        ]
      }
    ]
  },
  {
    id: "sample-5",
    source: "custom",
    createdAt: "2025-01-02T11:20:00Z",
    updatedAt: "2025-01-02T11:20:00Z",
    title: "New York City Explorer",
    destination: "New York, USA",
    travelers: 1,
    rating: 5,
    review: "The energy of NYC is unmatched! Broadway shows, Central Park, and the best pizza on every corner.",
    tags: ["Urban", "Entertainment", "Food"],
    isFavorite: true,
    days: [
      {
        date: "2025-05-12",
        activities: [
          {
            id: "act-11",
            time: "08:00",
            title: "Central Park Walk",
            description: "Morning stroll through iconic park",
            location: "Central Park",
            cost: 0,
            image: "https://images.unsplash.com/photo-1568515387631-8b650bbcdb90",
            duration: "2 hours",
            transportType: "walk",
            transportDuration: "5 min",
            category: "nature"
          },
          {
            id: "act-12",
            time: "14:00",
            title: "Metropolitan Museum",
            description: "World-class art collection",
            location: "5th Avenue",
            cost: 30,
            image: "https://images.unsplash.com/photo-1585336103105-3e51b1154524",
            duration: "3 hours",
            transportType: "walk",
            transportDuration: "10 min",
            category: "culture"
          },
          {
            id: "act-13",
            time: "20:00",
            title: "Broadway Show",
            description: "Hamilton musical performance",
            location: "Times Square",
            cost: 150,
            image: "https://images.unsplash.com/photo-1503095396549-807759245b35",
            duration: "2.5 hours",
            transportType: "metro",
            transportDuration: "15 min",
            category: "entertainment"
          }
        ]
      }
    ]
  }
];

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

  useEffect(() => {
    loadTrips().then(setSavedTrips);
  }, []);

  // Sample trips have non-UUID ids like "sample-5" — match by title instead
  const isTripFavorited = (trip: SavedTrip): boolean => {
    if (trip.id.startsWith("sample-")) {
      return savedTrips.some(t => t.title === trip.title && t.isFavorite);
    }
    return savedTrips.find(t => t.id === trip.id)?.isFavorite || false;
  };

  const toggleFavorite = async (trip: SavedTrip) => {
    // For sample trips, find the saved copy by title (their ids aren't valid UUIDs)
    const existingTrip = trip.id.startsWith("sample-")
      ? savedTrips.find(t => t.title === trip.title)
      : savedTrips.find(t => t.id === trip.id);

    if (existingTrip) {
      const updated = { ...existingTrip, isFavorite: !existingTrip.isFavorite };
      // Optimistic update — instant UI, no re-fetch
      setSavedTrips(prev => prev.map(t => t.id === existingTrip.id ? updated : t));
      toast.success(updated.isFavorite ? "Added to favorites" : "Removed from favorites");
      saveTrip(updated).catch((e: unknown) => {
        // Roll back on failure
        setSavedTrips(prev => prev.map(t => t.id === existingTrip.id ? existingTrip : t));
        toast.error(e instanceof Error ? e.message : "Failed to save");
      });
    } else {
      // New trip — generate a proper UUID so Supabase accepts it
      const newTrip = { ...trip, id: crypto.randomUUID(), isFavorite: true };
      setSavedTrips(prev => [...prev, newTrip]);
      toast.success("Trip saved to favorites!");
      saveTrip(newTrip).catch((e: unknown) => {
        setSavedTrips(prev => prev.filter(t => t.id !== newTrip.id));
        toast.error(e instanceof Error ? e.message : "Failed to save");
      });
    }
  };

  const destinations = Array.from(new Set(PLACEHOLDER_TRIPS.map(t => t.destination)));
  const allTags = Array.from(new Set(PLACEHOLDER_TRIPS.flatMap(t => t.tags || [])));

  const calculateTripCost = (trip: SavedTrip) =>
    trip.days.reduce((t, d) => t + d.activities.reduce((s, a) => s + (a.cost || 0), 0), 0);

  const hasActiveFilters = !!(searchQuery || selectedDestination || selectedTags.length > 0 ||
                           minBudget !== null || maxBudget !== null);

  const filteredTrips = PLACEHOLDER_TRIPS.filter(trip => {
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
      case 'popular': return (b.rating || 0) - (a.rating || 0);
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
    const coverImage = trip.days[0]?.activities[0]?.image;

    return (
      <div
        className="bg-card rounded-xl border border-border/50 overflow-hidden hover:shadow-md transition-all group cursor-pointer"
        onClick={() => navigate(`/trip/${trip.id}`)}
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
