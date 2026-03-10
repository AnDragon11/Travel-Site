// ─── Builder Types ──────────────────────────────────────────────────

export interface BuilderActivity {
  id: string;
  type: string;             // "transport" | "accommodation" | "food" | "experience" | (legacy: "flight" | "dining" | etc.)
  subtype?: string;         // e.g. "flight" | "train" | "restaurant" | "sightseeing"
  name: string;
  time: string;
  duration: string;
  location: string;
  cost: number;
  notes: string;
  image_url: string;
  booking_url?: string;
  photos?: string[];
  // Transport / Flight fields
  origin?: string;
  destination_airport?: string;
  airline?: string;
  flight_number?: string;
  luggage_checkin?: number;
  luggage_cabin?: number;
  flight_class?: string;    // "economy" | "premium_economy" | "business" | "first"
  // Accommodation fields
  nights?: number;
  cost_per_night?: number;
  stars?: number;           // 1–5
  amenities?: string[];
  bed_types?: string;
  checkin_time?: string;
  checkout_time?: string;
  hotel_bond_id?: string;   // shared ID between check-in and checkout activities
  is_checkout?: boolean;
  flight_bond_id?: string;  // shared ID between departure and arrival activities
  is_arrival?: boolean;
  tags?: string[];
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
