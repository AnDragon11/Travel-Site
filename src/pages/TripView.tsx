import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Calendar,
  Users,
  Clock,
  Pencil,
  Heart,
  Star,
  DollarSign,
  Save,
  Sparkles
} from "lucide-react";
import { SavedTrip } from "@/lib/tripTypes";
import { loadTrips, saveTrip } from "@/services/storageService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Import placeholder trips from Explore page
// In a real app, these would be in a shared location
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

const TripView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<SavedTrip | null>(null);
  const [isPlaceholder, setIsPlaceholder] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Try to load from saved trips first
    const savedTrips = loadTrips();
    const savedTrip = savedTrips.find(t => t.id === id);

    if (savedTrip) {
      setTrip(savedTrip);
      setIsPlaceholder(false);
    } else {
      // Try to load from placeholder trips
      const placeholderTrip = PLACEHOLDER_TRIPS.find(t => t.id === id);
      if (placeholderTrip) {
        setTrip(placeholderTrip);
        setIsPlaceholder(true);
      }
    }
  }, [id]);

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-16 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">Trip not found</h2>
            <Button onClick={() => navigate("/explore")}>Back to Explore</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const totalCost = trip.days.reduce((t, d) =>
    t + d.activities.reduce((s, a) => s + (a.cost || 0), 0), 0
  );

  const handleSaveTrip = () => {
    saveTrip(trip);
    setIsPlaceholder(false);
    toast.success("Trip saved to My Trips!");
  };

  const handleEditTrip = () => {
    if (isPlaceholder) {
      saveTrip(trip);
      toast.success("Trip saved! Opening editor...");
    }
    navigate(`/builder/${trip.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16">
        <section className="py-8 bg-gradient-to-br from-accent via-background to-muted">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                {isPlaceholder && (
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-1 bg-secondary/90 text-secondary-foreground px-3 py-1.5 rounded-full text-sm font-bold shadow-md">
                      📍 Sample Trip
                    </span>
                  </div>
                )}

                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                  <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 flex flex-wrap items-center gap-2 md:gap-3">
                      <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-primary shrink-0" />
                      <span className="break-words">{trip.title}</span>
                      {trip.source === 'ai' && trip.aiMetadata && (
                        <span className="text-sm md:text-base bg-primary/10 text-primary px-2 md:px-3 py-1 rounded-full font-medium whitespace-nowrap">
                          {trip.aiMetadata.comfortLevelEmoji} AI Generated
                        </span>
                      )}
                    </h1>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-4">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        {trip.destination}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {trip.days.length} day{trip.days.length !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        {trip.travelers} traveler{trip.travelers !== 1 ? 's' : ''}
                      </span>
                      {trip.days[0]?.date && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          Starting {trip.days[0].date}
                        </span>
                      )}
                    </div>

                    {/* Rating */}
                    {trip.rating && (
                      <div className="flex items-center gap-1 mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "w-5 h-5",
                              i < trip.rating! ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            )}
                          />
                        ))}
                        <span className="text-sm text-muted-foreground ml-2">
                          {trip.rating}/5
                        </span>
                      </div>
                    )}

                    {/* Review */}
                    {trip.review && (
                      <p className="text-muted-foreground italic mb-4">
                        "{trip.review}"
                      </p>
                    )}

                    {/* Tags */}
                    {trip.tags && trip.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {trip.tags.map((tag, i) => (
                          <span key={i} className="text-sm bg-accent text-accent-foreground px-3 py-1 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {totalCost > 0 && (
                      <div className="text-right mb-2">
                        <div className="text-sm text-muted-foreground">Total Cost</div>
                        <div className="text-2xl font-bold text-primary">
                          €{totalCost.toLocaleString()}
                        </div>
                      </div>
                    )}
                    <Button onClick={handleEditTrip} className="gap-2">
                      <Pencil className="w-4 h-4" />
                      Edit Trip
                    </Button>
                    {isPlaceholder && (
                      <Button onClick={handleSaveTrip} variant="outline" className="gap-2">
                        <Save className="w-4 h-4" />
                        Save to My Trips
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Days Timeline */}
              <div className="space-y-8">
                {trip.days.map((day, dayIndex) => (
                  <div key={dayIndex} className="bg-card rounded-2xl shadow-sm border border-border/50 p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">
                          Day {dayIndex + 1}
                        </h3>
                        {day.date && (
                          <p className="text-sm text-muted-foreground">{day.date}</p>
                        )}
                      </div>
                    </div>

                    {/* Activities */}
                    <div className="space-y-4">
                      {day.activities.map((activity, actIndex) => (
                        <div key={activity.id} className="flex gap-4">
                          {/* Time */}
                          <div className="flex flex-col items-center">
                            <div className="w-16 text-sm font-medium text-muted-foreground">
                              {activity.time}
                            </div>
                            {actIndex < day.activities.length - 1 && (
                              <div className="w-0.5 h-full bg-border/50 my-2" />
                            )}
                          </div>

                          {/* Activity Card */}
                          <div className="flex-1 bg-accent/30 rounded-xl p-4 border border-border/50">
                            <div className="flex gap-4">
                              {/* Image */}
                              {activity.image && (
                                <img
                                  src={activity.image}
                                  alt={activity.title}
                                  className="w-24 h-24 rounded-lg object-cover shrink-0"
                                />
                              )}

                              {/* Content */}
                              <div className="flex-1">
                                <h4 className="font-bold text-foreground mb-1">
                                  {activity.title}
                                </h4>
                                {activity.description && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {activity.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {activity.location}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {activity.duration}
                                  </span>
                                  {activity.cost !== undefined && activity.cost > 0 && (
                                    <span className="flex items-center gap-1 text-primary font-medium">
                                      <DollarSign className="w-3 h-3" />
                                      €{activity.cost}
                                    </span>
                                  )}
                                  {activity.category && (
                                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                                      {activity.category}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Actions */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate("/explore")} variant="outline">
                  Back to Explore
                </Button>
                <Button onClick={() => navigate("/my-trips")} variant="outline">
                  View My Trips
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default TripView;
