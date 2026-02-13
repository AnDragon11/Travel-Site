import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Users, Star, Heart, Clock, Compass, Filter, Search, X } from "lucide-react";
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
    source: "ai",
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
    ],
    aiMetadata: {
      comfortLevel: 2,
      comfortLevelName: "Comfort",
      comfortLevelEmoji: "⭐",
      originalDates: "2025-04-20 - 2025-04-20"
    }
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
    source: "ai",
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
    ],
    aiMetadata: {
      comfortLevel: 2,
      comfortLevelName: "Comfort",
      comfortLevelEmoji: "⭐",
      originalDates: "2025-05-12 - 2025-05-12"
    }
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

  // Load saved trips on mount
  useEffect(() => {
    setSavedTrips(loadTrips());
  }, []);

  // Check if a trip is favorited (either in placeholder or saved trips)
  const isTripFavorited = (tripId: string): boolean => {
    const savedTrip = savedTrips.find(t => t.id === tripId);
    return savedTrip?.isFavorite || false;
  };

  // Toggle favorite for a trip
  const toggleFavorite = (trip: SavedTrip) => {
    const existingTrip = savedTrips.find(t => t.id === trip.id);

    if (existingTrip) {
      // Trip already saved, just toggle favorite
      const updated = { ...existingTrip, isFavorite: !existingTrip.isFavorite };
      saveTrip(updated);
      setSavedTrips(loadTrips());
      toast.success(updated.isFavorite ? "Added to favorites" : "Removed from favorites");
    } else {
      // New trip, save it with favorite = true
      const newTrip = { ...trip, isFavorite: true };
      saveTrip(newTrip);
      setSavedTrips(loadTrips());
      toast.success("Trip saved and added to favorites!");
    }
  };

  // Extract unique destinations and tags
  const destinations = Array.from(new Set(PLACEHOLDER_TRIPS.map(t => t.destination)));
  const allTags = Array.from(new Set(PLACEHOLDER_TRIPS.flatMap(t => t.tags || [])));

  // Calculate trip cost
  const calculateTripCost = (trip: SavedTrip) => {
    return trip.days.reduce((t, d) =>
      t + d.activities.reduce((s, a) => s + (a.cost || 0), 0), 0
    );
  };

  // Filter and sort trips
  const filteredTrips = PLACEHOLDER_TRIPS.filter(trip => {
    // Search query filter
    if (searchQuery && !trip.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !trip.destination.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Destination filter
    if (selectedDestination && trip.destination !== selectedDestination) {
      return false;
    }

    // Tags filter
    if (selectedTags.length > 0) {
      const tripTags = trip.tags || [];
      if (!selectedTags.some(tag => tripTags.includes(tag))) {
        return false;
      }
    }

    // Budget filter
    const tripCost = calculateTripCost(trip);
    if (minBudget !== null && tripCost < minBudget) {
      return false;
    }
    if (maxBudget !== null && tripCost > maxBudget) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'popular':
        return (b.rating || 0) - (a.rating || 0);
      case 'budget-low':
        return calculateTripCost(a) - calculateTripCost(b);
      case 'budget-high':
        return calculateTripCost(b) - calculateTripCost(a);
      default:
        return 0;
    }
  });

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedDestination(null);
    setSelectedTags([]);
    setMinBudget(null);
    setMaxBudget(null);
    setSortBy('popular');
  };

  const hasActiveFilters = searchQuery || selectedDestination || selectedTags.length > 0 ||
                          minBudget !== null || maxBudget !== null;

  const TripCard = ({ trip }: { trip: SavedTrip }) => {
    const totalCost = calculateTripCost(trip);
    const isAI = trip.source === 'ai';
    const isFavorited = isTripFavorited(trip.id);

    return (
      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5 hover:shadow-md transition-all relative overflow-hidden group">
        {/* Sample Trip Badge */}
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center gap-1 bg-secondary/90 text-secondary-foreground px-3 py-1 rounded-full text-xs font-bold shadow-md">
            📍 Sample Trip
          </span>
        </div>

        {/* Trip Image */}
        {trip.days[0]?.activities[0]?.image && (
          <div
            className="relative h-48 -mx-5 -mt-5 mb-4 overflow-hidden cursor-pointer"
            onClick={() => navigate(`/trip/${trip.id}`)}
          >
            <img
              src={trip.days[0].activities[0].image}
              alt={trip.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(trip);
              }}
              className="absolute top-3 left-3 p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
            >
              <Heart className={cn("w-5 h-5", isFavorited ? "fill-red-500 text-red-500" : "text-white")} />
            </button>
          </div>
        )}

        <div className="space-y-3">
          {/* Title */}
          <div className="flex items-start gap-2">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2 flex-wrap flex-1">
              <MapPin className="w-5 h-5 text-primary shrink-0" />
              {trip.title}
              {isAI && trip.aiMetadata && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {trip.aiMetadata.comfortLevelEmoji} AI
                </span>
              )}
            </h3>
          </div>

          {/* Rating */}
          {trip.rating && (
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "w-4 h-4",
                    i < trip.rating! ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                  )}
                />
              ))}
              <span className="text-sm text-muted-foreground ml-1">
                {trip.rating}/5
              </span>
            </div>
          )}

          {/* Review */}
          {trip.review && (
            <p className="text-sm text-muted-foreground italic line-clamp-2">
              "{trip.review}"
            </p>
          )}

          {/* Details */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {trip.destination}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {trip.days.length} day{trip.days.length !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {trip.travelers} traveler{trip.travelers !== 1 ? 's' : ''}
            </span>
            {trip.days[0]?.date && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {trip.days[0].date}
              </span>
            )}
          </div>

          {/* Tags */}
          {trip.tags && trip.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {trip.tags.map((tag, i) => (
                <span key={i} className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Cost and Action */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            {totalCost > 0 && (
              <span className="text-lg font-bold text-primary">
                €{totalCost.toLocaleString()}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => navigate(`/trip/${trip.id}`)}
            >
              View Details
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16">
        <section className="py-12 md:py-20 bg-gradient-to-br from-accent via-background to-muted">
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
                  <Compass className="w-4 h-4" />
                  <span className="text-sm font-medium">Discover Adventures</span>
                </div>

                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
                  Explore Trips
                </h1>
                <p className="text-lg text-muted-foreground mb-6">
                  Get inspired by sample itineraries from around the world
                </p>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto mb-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search destinations or trip names..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 min-h-[48px] rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-base"
                    />
                  </div>
                </div>

                {/* Filter Toggle & Sort */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <Button
                    variant={showFilters ? "default" : "outline"}
                    onClick={() => setShowFilters(!showFilters)}
                    className="gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                    {hasActiveFilters && (
                      <span className="bg-primary-foreground/20 text-xs px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </Button>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-4 py-2 min-h-[44px] rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                  >
                    <option value="popular">Most Popular</option>
                    <option value="recent">Most Recent</option>
                    <option value="budget-low">Budget: Low to High</option>
                    <option value="budget-high">Budget: High to Low</option>
                  </select>

                  {hasActiveFilters && (
                    <Button variant="ghost" onClick={clearFilters} className="gap-2">
                      <X className="w-4 h-4" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-6 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Destination Filter */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Destination
                      </label>
                      <select
                        value={selectedDestination || ""}
                        onChange={(e) => setSelectedDestination(e.target.value || null)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">All Destinations</option>
                        {destinations.map(dest => (
                          <option key={dest} value={dest}>{dest}</option>
                        ))}
                      </select>
                    </div>

                    {/* Budget Filter */}
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Budget Range (€)
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="number"
                          placeholder="Min"
                          value={minBudget || ""}
                          onChange={(e) => setMinBudget(e.target.value ? Number(e.target.value) : null)}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <span className="text-muted-foreground self-center">to</span>
                        <input
                          type="number"
                          placeholder="Max"
                          value={maxBudget || ""}
                          onChange={(e) => setMaxBudget(e.target.value ? Number(e.target.value) : null)}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    {/* Tags Filter */}
                    <div className="md:col-span-3">
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Interests
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {allTags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                              selectedTags.includes(tag)
                                ? "bg-primary text-primary-foreground shadow-md"
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

              {/* Results Count */}
              <div className="text-center mb-6">
                <p className="text-muted-foreground">
                  Showing {filteredTrips.length} of {PLACEHOLDER_TRIPS.length} trips
                </p>
              </div>

              {/* Trips Grid */}
              {filteredTrips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTrips.map(trip => <TripCard key={trip.id} trip={trip} />)}
                </div>
              ) : (
                <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-12 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                    <Compass className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    No trips found
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Try adjusting your filters or search terms
                  </p>
                  <Button onClick={clearFilters} variant="outline">
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Explore;
