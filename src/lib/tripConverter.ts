import { TripItinerary, Activity } from "@/context/TripContext";
import { BuilderDay, BuilderActivity } from "@/pages/TripBuilder";
import { SavedTrip } from "./tripTypes";

/**
 * Generate a unique ID for trips and activities
 */
const generateId = () => Math.random().toString(36).substring(2, 11);

/**
 * Infer transport type from activity type or context
 * Heuristic: flight/accommodation = walk, others = walk (safe default)
 */
const inferTransportType = (activity: Activity): string => {
  if (activity.type === 'flight' || activity.type === 'accommodation') {
    return 'walk';
  }
  // Safe default - users can edit if needed
  return 'walk';
};

/**
 * Infer transport duration (conservative default)
 */
const inferTransportDuration = (activity: Activity): string => {
  return '10 min';  // Conservative default
};

/**
 * Convert AI Activity to BuilderActivity
 * Handles missing transport data and optional fields
 */
const convertActivity = (
  activity: Activity,
  isFirstInDay: boolean
): BuilderActivity => ({
  id: generateId(),
  type: activity.type,
  name: activity.name,
  time: activity.time,
  duration: activity.duration,
  location: activity.location,
  cost: activity.cost ?? 0,
  notes: activity.notes ?? '',
  image_url: activity.image_url ?? '',

  // Transport defaults (AI doesn't provide these)
  // First activity in day has no incoming transport
  transportType: isFirstInDay ? 'walk' : inferTransportType(activity),
  transportDuration: isFirstInDay ? '0 min' : inferTransportDuration(activity),
});

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
    theme: day.theme,
    activities: day.activities.map((activity, index) =>
      convertActivity(activity, index === 0)
    ),
  }));

  return {
    id: generateId(),
    source: 'ai',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    title: `Trip to ${itinerary.destination}`,
    destination: itinerary.destination,
    travelers: itinerary.travelers,
    days,
    aiMetadata: {
      comfortLevel: itinerary.comfort_level,
      comfortLevelName: itinerary.comfort_level_name,
      comfortLevelEmoji: itinerary.comfort_level_emoji,
      originalDates: itinerary.dates,
      flights: itinerary.flights,
      accommodation: itinerary.accommodation,
    },
  };
};
