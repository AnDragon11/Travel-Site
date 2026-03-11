import { TripItinerary, Activity } from "@/context/TripContext";
import { BuilderDay, BuilderActivity } from "@/pages/TripBuilder";
import { SavedTrip } from "./tripTypes";

const generateId = () => Math.random().toString(36).substring(2, 11);

const convertActivity = (activity: Activity): BuilderActivity => {
  // Cast to any so all extra fields from the AI/edge-fn JSON (airline, flight_number,
  // destination_airport, is_arrival, flight_bond_id, hotel_bond_id, is_checkout,
  // stars, nights, cost_per_night, room_type, etc.) pass through without being stripped.
  const a = activity as any;
  return {
    ...a,
    // Preserve the edge-function ID so bond links (flight_bond_id / hotel_bond_id) stay valid.
    id: a.id || generateId(),
    cost: a.cost ?? 0,
    notes: a.notes ?? '',
    image_url: a.image_url ?? '',
  };
};

/**
 * Main conversion: TripItinerary → SavedTrip
 * Converts AI-generated itinerary to editable SavedTrip format
 */
export const convertItineraryToTrip = (
  itinerary: TripItinerary
): SavedTrip => {
  const days: BuilderDay[] = itinerary.daily_itinerary.map((day) => ({
    id: generateId(),
    date: day.date,
    activities: day.activities.map((activity) =>
      convertActivity(activity)
    ),
  }));

  return {
    id: crypto.randomUUID(),
    source: 'ai',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    title: `Trip to ${itinerary.destination}`,
    destination: itinerary.destination,
    travelers: itinerary.travelers,
    days,
    thumbnail: itinerary.thumbnail_url ?? undefined,
    isBucketList: false,
    aiMetadata: {
      comfortLevel: itinerary.comfort_level,
      comfortLevelName: itinerary.comfort_level_name,
      comfortLevelEmoji: itinerary.comfort_level_emoji,
      originalDates: itinerary.dates,
      flights: {
        outbound: itinerary.flights.outbound,
        return: itinerary.flights.return,
        totalCost: itinerary.flights.total_cost,
      },
      accommodation: {
        name: itinerary.accommodation.name,
        nights: itinerary.accommodation.nights,
        totalCost: itinerary.accommodation.total_cost,
      },
    },
  };
};
