import { SavedTrip } from "@/lib/tripTypes";
import { BuilderTrip } from "@/pages/TripBuilder";

const STORAGE_KEY = 'wanderly_trips';
const LEGACY_BUILDER_KEY = 'wanderly_builder_trips';
const LEGACY_SAVED_KEY = 'wanderly_saved_trips';

/**
 * Convert legacy BuilderTrip to SavedTrip
 */
const convertBuilderToSaved = (builderTrip: BuilderTrip): SavedTrip => ({
  id: builderTrip.id,
  source: 'custom',
  createdAt: builderTrip.createdAt,
  updatedAt: builderTrip.updatedAt,
  title: builderTrip.title,
  destination: builderTrip.destination,
  travelers: builderTrip.travelers,
  days: builderTrip.days,
});

/**
 * Load all trips (handles migration from legacy keys)
 * First checks unified key, falls back to legacy keys and migrates
 */
export const loadTrips = (): SavedTrip[] => {
  try {
    // Try new unified key first
    const trips = localStorage.getItem(STORAGE_KEY);
    if (trips) {
      return JSON.parse(trips);
    }

    // Migration: Load from legacy keys
    const migratedTrips: SavedTrip[] = [];

    // Migrate builder trips
    const builderTrips = localStorage.getItem(LEGACY_BUILDER_KEY);
    if (builderTrips) {
      const parsed: BuilderTrip[] = JSON.parse(builderTrips);
      migratedTrips.push(...parsed.map(convertBuilderToSaved));
    }

    // Note: Legacy saved trips (AI) don't exist yet in codebase
    // But we handle the key in case it's added elsewhere
    const savedTrips = localStorage.getItem(LEGACY_SAVED_KEY);
    if (savedTrips) {
      const parsed: SavedTrip[] = JSON.parse(savedTrips);
      migratedTrips.push(...parsed);
    }

    if (migratedTrips.length > 0) {
      saveTrips(migratedTrips);
      // Clean up legacy keys after successful migration
      localStorage.removeItem(LEGACY_BUILDER_KEY);
      localStorage.removeItem(LEGACY_SAVED_KEY);
    }

    return migratedTrips;
  } catch {
    return [];
  }
};

/**
 * Save all trips to unified storage
 */
export const saveTrips = (trips: SavedTrip[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
};

/**
 * Save single trip (insert or update)
 * Updates timestamp if existing trip
 */
export const saveTrip = (trip: SavedTrip) => {
  const trips = loadTrips();
  const index = trips.findIndex(t => t.id === trip.id);

  if (index >= 0) {
    trips[index] = { ...trip, updatedAt: new Date().toISOString() };
  } else {
    trips.push(trip);
  }

  saveTrips(trips);
};

/**
 * Delete trip by ID
 */
export const deleteTrip = (id: string) => {
  const trips = loadTrips().filter(t => t.id !== id);
  saveTrips(trips);
};
