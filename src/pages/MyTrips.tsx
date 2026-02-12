import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Users, Trash2, Pencil, Sparkles, Plus, Briefcase } from "lucide-react";
import { loadTrips, deleteTrip } from "@/services/storageService";
import { SavedTrip } from "@/lib/tripTypes";
import { toast } from "sonner";

const MyTrips = () => {
  const [trips, setTrips] = useState<SavedTrip[]>([]);

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

  const aiTrips = trips.filter(t => t.source === 'ai');
  const customTrips = trips.filter(t => t.source === 'custom');
  const hasAnyTrips = trips.length > 0;

  const calculateTripCost = (trip: SavedTrip) => {
    return trip.days.reduce((t, d) =>
      t + d.activities.reduce((s, a) => s + (a.cost || 0), 0), 0
    );
  };

  const TripCard = ({ trip }: { trip: SavedTrip }) => {
    const totalCost = calculateTripCost(trip);
    const isAI = trip.source === 'ai';

    return (
      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5 hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              {trip.title}
              {isAI && trip.aiMetadata && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {trip.aiMetadata.comfortLevelEmoji} AI Generated
                </span>
              )}
            </h3>

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
              {isAI && trip.aiMetadata?.originalDates && (
                <span className="text-xs">
                  {trip.aiMetadata.originalDates}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {totalCost > 0 && (
              <span className="text-lg font-bold text-primary">
                €{totalCost.toLocaleString()}
              </span>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to={`/builder/${trip.id}`}>
                <Pencil className="w-4 h-4 mr-1" /> Edit
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(trip.id)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
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
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-sm font-medium">Your Adventures</span>
                </div>

                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
                  My Trips
                </h1>
                <p className="text-lg text-muted-foreground mb-6">
                  View and manage your saved trip itineraries
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

              {/* Trips List */}
              {hasAnyTrips ? (
                <div className="space-y-6">
                  {/* AI Trips */}
                  {aiTrips.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> AI Generated Trips
                      </h3>
                      {aiTrips.map(trip => <TripCard key={trip.id} trip={trip} />)}
                    </div>
                  )}

                  {/* Custom Trips */}
                  {customTrips.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <Pencil className="w-4 h-4" /> Custom Trips
                      </h3>
                      {customTrips.map(trip => <TripCard key={trip.id} trip={trip} />)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-12 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                    <Briefcase className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">No saved trips yet</h3>
                  <p className="text-muted-foreground mb-6">Start planning your first adventure</p>
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
