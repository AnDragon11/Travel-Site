import { SavedTrip } from "@/lib/tripTypes";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// ─── localStorage constants (guest storage) ────────────────────────
const LOCAL_KEY = 'diarytrips_trips';
const LEGACY_BUILDER_KEY = 'diarytrips_builder_trips';
const LEGACY_SAVED_KEY = 'diarytrips_saved_trips';

// ─── helpers ────────────────────────────────────────────────────────

const rowToSavedTrip = (row: {
  id: string;
  source: string;
  title: string;
  destination: string;
  travelers: number;
  days: unknown;
  is_favorite: boolean;
  rating: number | null;
  review: string | null;
  photos: string[] | null;
  tags: string[] | null;
  ai_metadata: unknown;
  created_at: string;
  updated_at: string;
}): SavedTrip => ({
  id: row.id,
  source: row.source as 'ai' | 'custom',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  title: row.title,
  destination: row.destination,
  travelers: row.travelers,
  days: (row.days as SavedTrip['days']) ?? [],
  isFavorite: row.is_favorite,
  rating: row.rating ?? undefined,
  review: row.review ?? undefined,
  photos: row.photos ?? undefined,
  tags: row.tags ?? undefined,
  aiMetadata: (row.ai_metadata as SavedTrip['aiMetadata']) ?? undefined,
});

// ─── localStorage functions (guest) ─────────────────────────────────

const loadLocalTrips = (): SavedTrip[] => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw);

    // Legacy migration
    const migrated: SavedTrip[] = [];
    const legacyBuilder = localStorage.getItem(LEGACY_BUILDER_KEY);
    if (legacyBuilder) migrated.push(...JSON.parse(legacyBuilder));
    const legacySaved = localStorage.getItem(LEGACY_SAVED_KEY);
    if (legacySaved) migrated.push(...JSON.parse(legacySaved));
    if (migrated.length > 0) {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_BUILDER_KEY);
      localStorage.removeItem(LEGACY_SAVED_KEY);
    }
    return migrated;
  } catch {
    return [];
  }
};

const saveLocalTrips = (trips: SavedTrip[]) => {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(trips));
};

const saveLocalTrip = (trip: SavedTrip) => {
  const trips = loadLocalTrips();
  const i = trips.findIndex(t => t.id === trip.id);
  if (i >= 0) trips[i] = { ...trip, updatedAt: new Date().toISOString() };
  else trips.push(trip);
  saveLocalTrips(trips);
};

const deleteLocalTrip = (id: string) => {
  saveLocalTrips(loadLocalTrips().filter(t => t.id !== id));
};

// ─── Supabase functions (authenticated) ──────────────────────────────

const loadSupabaseTrips = async (): Promise<SavedTrip[]> => {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) { console.error("loadTrips:", error.message); return []; }
  return data.map(rowToSavedTrip);
};

const saveSupabaseTrip = async (trip: SavedTrip, userId: string): Promise<void> => {
  const { error } = await supabase.from("trips").upsert({
    id: trip.id,
    user_id: userId,
    source: trip.source,
    title: trip.title,
    destination: trip.destination,
    travelers: trip.travelers,
    days: trip.days as unknown as Json,
    is_favorite: trip.isFavorite ?? false,
    rating: trip.rating ?? null,
    review: trip.review ?? null,
    photos: trip.photos ?? null,
    tags: trip.tags ?? null,
    ai_metadata: (trip.aiMetadata ?? null) as unknown as Json,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });

  if (error) throw new Error(error.message);
};

const deleteSupabaseTrip = async (id: string): Promise<void> => {
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) throw new Error(error.message);
};

// ─── Public API (hybrid: local for guests, Supabase for users) ──────

export const loadTrips = async (): Promise<SavedTrip[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return loadSupabaseTrips();
  return loadLocalTrips();
};

export const saveTrip = async (trip: SavedTrip): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await saveSupabaseTrip(trip, user.id);
  } else {
    saveLocalTrip(trip);
  }
};

export const deleteTrip = async (id: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await deleteSupabaseTrip(id);
  } else {
    deleteLocalTrip(id);
  }
};

// ─── Migration: localStorage → Supabase (called after sign-in) ──────

export const migrateLocalToSupabase = async (): Promise<void> => {
  const localTrips = loadLocalTrips();
  if (localTrips.length === 0) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  for (const trip of localTrips) {
    try {
      await saveSupabaseTrip(trip, user.id);
    } catch (e) {
      console.error("Migration failed for trip", trip.id, e);
    }
  }

  // Clear local storage after successful migration
  localStorage.removeItem(LOCAL_KEY);
};
