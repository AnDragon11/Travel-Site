import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Users, Trash2, Pencil, Sparkles, Plus, Briefcase, Star, Heart, Clock, Archive, Map } from "lucide-react";
import { loadTrips, deleteTrip, saveTrip } from "@/services/storageService";
import { SavedTrip } from "@/lib/tripTypes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
// import TripMap from "@/components/TripMap"; // Temporarily disabled until leaflet packages are installed

type TabType = 'all' | 'future' | 'past' | 'favorites';

const MyTrips = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showMap, setShowMap] = useState(true);

  const loadAllTrips = () => {
    const allTrips = loadTrips();
    setTrips(allTrips);
  };

  useEffect(() => {
    loadAllTrips();
  }, []);

  const handleDelete = (id: string) => {
    deleteTrip(id);
    loadAllTrips();
    toast.success("Trip deleted");
  };

  const toggleFavorite = (trip: SavedTrip) => {
    const updated = { ...trip, isFavorite: !trip.isFavorite };
    saveTrip(updated);
    loadAllTrips();
    toast.success(updated.isFavorite ? "Added to favorites" : "Removed from favorites");
  };

  // Helper: Check if trip is in the past
  const isTripPast = (trip: SavedTrip): boolean => {
    if (!trip.days.length) return false;
    const lastDate = trip.days[trip.days.length - 1]?.date;
    if (!lastDate) return false;

    try {
      const tripDate = new Date(lastDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return tripDate < today;
    } catch {
      return false;
    }
  };

  // Filter trips by tab
  const pastTrips = trips.filter(t => isTripPast(t));
  const futureTrips = trips.filter(t => !isTripPast(t));
  const favoriteTrips = trips.filter(t => t.isFavorite);

  const displayedTrips =
    activeTab === 'past' ? pastTrips :
    activeTab === 'future' ? futureTrips :
    activeTab === 'favorites' ? favoriteTrips :
    trips;

  const calculateTripCost = (trip: SavedTrip) => {
    return trip.days.reduce((t, d) =>
      t + d.activities.reduce((s, a) => s + (a.cost || 0), 0), 0
    );
  };

  const TripCard = ({ trip }: { trip: SavedTrip }) => {
    const totalCost = calculateTripCost(trip);
    const isAI = trip.source === 'ai';
    const isPast = isTripPast(trip);

    return (
      <div
        className="bg-card rounded-xl shadow-sm border border-border/50 p-5 hover:shadow-md transition-all relative overflow-hidden cursor-pointer"
        onClick={() => navigate(`/trip/${trip.id}`)}
      >
        {/* Past trip overlay */}
        {isPast && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 bg-muted/80 text-muted-foreground px-2 py-1 rounded-full text-xs font-medium">
              <Archive className="w-3 h-3" />
              Past Trip
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-3 flex-1">
            {/* Title */}
            <div className="flex items-start gap-2">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2 flex-wrap">
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
              {trip.destination && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {trip.destination}
                </span>
              )}
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
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {totalCost > 0 && (
              <span className="text-lg font-bold text-primary">
                €{totalCost.toLocaleString()}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(trip);
              }}
              className={cn(
                "hover:bg-accent",
                trip.isFavorite && "text-red-500 hover:text-red-600"
              )}
            >
              <Heart className={cn("w-4 h-4", trip.isFavorite && "fill-current")} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/builder/${trip.id}`);
              }}
            >
              <Pencil className="w-4 h-4 mr-1" /> Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(trip.id);
              }}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const tabs: { id: TabType; label: string; count: number; icon: typeof Briefcase }[] = [
    { id: 'all', label: 'All Trips', count: trips.length, icon: Briefcase },
    { id: 'future', label: 'Bucket List', count: futureTrips.length, icon: Clock },
    { id: 'past', label: 'Past Trips', count: pastTrips.length, icon: Archive },
    { id: 'favorites', label: 'Favorites', count: favoriteTrips.length, icon: Heart },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16">
        <section className="py-6 md:py-10 bg-gradient-to-br from-accent via-background to-muted">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              {/* Header */}
              <div className="text-center mb-6">
                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3">
                  My Trips
                </h1>
                <p className="text-lg text-muted-foreground mb-4">
                  {pastTrips.length} past adventures • {futureTrips.length} upcoming trips
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild size="lg" className="gap-2">
                    <Link to="/">
                      <Sparkles className="w-5 h-5" />
                      Generate AI Trip
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="gap-2">
                    <Link to="/builder">
                      <Plus className="w-5 h-5" />
                      Create Custom Trip
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Tabs and Map Toggle */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center">
                <div className="flex flex-wrap gap-2 justify-center">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                          activeTab === tab.id
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-card hover:bg-accent text-foreground"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          activeTab === tab.id
                            ? "bg-primary-foreground/20"
                            : "bg-muted"
                        )}>
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {trips.length > 0 && (
                  <Button
                    variant={showMap ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowMap(!showMap)}
                    className="gap-2"
                  >
                    <Map className="w-4 h-4" />
                    {showMap ? "Hide" : "Show"} Map
                  </Button>
                )}
              </div>

              {/* Trip Map - Temporarily disabled until leaflet packages are installed */}
              {/* {showMap && trips.length > 0 && (
                <div className="mb-8">
                  <TripMap trips={displayedTrips} />
                </div>
              )} */}

              {/* Trips List */}
              {displayedTrips.length > 0 ? (
                <div className="space-y-4">
                  {displayedTrips.map(trip => <TripCard key={trip.id} trip={trip} />)}
                </div>
              ) : (
                <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-12 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                    <Briefcase className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    No {activeTab === 'all' ? '' : activeTab} trips yet
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {activeTab === 'favorites'
                      ? 'Mark trips as favorite by clicking the heart icon'
                      : 'Start planning your first adventure'}
                  </p>
                  {activeTab !== 'favorites' && (
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button asChild size="lg">
                        <Link to="/">
                          <Sparkles className="w-5 h-5 mr-2" /> AI-Generated Trip
                        </Link>
                      </Button>
                      <Button asChild size="lg" variant="outline">
                        <Link to="/builder">
                          <Plus className="w-5 h-5 mr-2" /> Create Custom Trip
                        </Link>
                      </Button>
                    </div>
                  )}
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

export default MyTrips;
