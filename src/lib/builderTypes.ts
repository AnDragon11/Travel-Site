// ─── Builder Types ──────────────────────────────────────────────────

export interface BuilderActivity {
  id: string;
  name: string;
  type: string;             // "transport" | "accommodation" | "food" | "experience" | (legacy: "flight" | "dining" | etc.)
  subtype?: string;         // e.g. "flight" | "train" | "restaurant" | "sightseeing"
  time: string;
  duration: string;
  location: string;         // city/area for most types; departure city/station for transport
  cost: number;
  notes: string;
  image_url: string;
  booking_url?: string;
  rating?: number;          // 1–5, user-assigned (post-visit or AI-sourced)
  photos?: string[];
  tags?: string[];
  attachments?: { name: string; url: string; type: string }[];

  // ── Flight ────────────────────────────────────────────────────
  airline?: string;
  flight_number?: string;
  flight_class?: string;    // "economy" | "premium_economy" | "business" | "first"
  origin?: string;          // departure airport name / IATA
  destination_airport?: string; // arrival airport name / IATA
  departure_terminal?: string;
  arrival_terminal?: string;
  luggage_cabin?: number;   // number of cabin bags
  luggage_checkin?: number; // number of checked bags
  flight_bond_id?: string;  // shared ID linking departure + arrival cards
  is_arrival?: boolean;

  // ── Accommodation ─────────────────────────────────────────────
  address?: string;         // full street address
  stars?: number;           // 1–5
  nights?: number;
  cost_per_night?: number;
  room_type?: string;       // e.g. "Deluxe Double", "Suite"
  bed_types?: string;       // e.g. "King", "Twin"
  checkin_time?: string;
  checkout_time?: string;
  breakfast_included?: boolean;
  cancellation_policy?: string;
  amenities?: string[];
  hotel_bond_id?: string;   // shared ID linking check-in + checkout cards
  is_checkout?: boolean;

  // ── Transport (non-flight) ────────────────────────────────────
  operator?: string;        // e.g. "Eurostar", "FlixBus", "Uber"
  arrival_station?: string; // destination station / stop name

  // ── Dining & Cafe ─────────────────────────────────────────────
  cuisine?: string;         // e.g. "Italian", "Japanese", "Street food"
  price_range?: number;     // 1–4  ($ → $$$$)
  reservation_required?: boolean;
  opening_hours?: string;   // e.g. "12:00–22:00" (shared with sightseeing)

  // ── Experience & Sightseeing ──────────────────────────────────
  category?: string;        // POI category e.g. "museum", "park", "beach", "tour"
  tickets_required?: boolean;
  ticket_url?: string;      // direct ticket purchase link (separate from booking_url)
}

export interface BuilderDay {
  id: string;
  date: string;
  activities: BuilderActivity[];
}

export interface BuilderTrip {
  id: string;
  title: string;
  destination: string;
  travelers: number;
  days: BuilderDay[];
  createdAt: string;
  updatedAt: string;
}
