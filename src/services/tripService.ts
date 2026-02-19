import { TripFormData, TripItinerary, DayItinerary, Activity } from "@/context/TripContext";
// Using direct fetch with custom timeout instead of supabase.functions.invoke
// to prevent the default short client timeout from triggering premature fallback

/**
 * === Expected n8n Webhook JSON Response Schema ===
 *
 * The webhook should return a JSON object matching the TripItinerary interface:
 *
 * {
 *   "destination": "Paris",                    // string — destination city name
 *   "dates": "2025-03-01 - 2025-03-05",       // string — date range display
 *   "travelers": 2,                            // number — traveler count
 *   "comfort_level": 3,                        // number — 1-5
 *   "comfort_level_name": "Standard",          // string — human label
 *   "comfort_level_emoji": "⭐",               // string — emoji
 *   "total_cost": 2500,                        // number — total estimated cost
 *   "daily_itinerary": [                       // array of day objects
 *     {
 *       "day": 1,                              // number — day number (1-indexed)
 *       "date": "2025-03-01",                  // string — ISO date
 *       "theme": "Arrival & Exploration",      // string — day theme/title
 *       "activities": [                        // array of event/slot objects
 *         {
 *           "time": "08:00",                   // string — 24h format start time
 *           "name": "Flight to Paris",         // string — event title
 *           "type": "flight",                  // string — one of: flight, transport, accommodation, dining, sightseeing, activity, shopping, cafe
 *           "duration": "2h 30m",              // string — human-readable duration
 *           "location": "CDG Airport",         // string — venue/place name
 *           "cost": 250,                       // number (optional) — cost in local currency
 *           "notes": "Terminal 2",             // string (optional) — extra info
 *           "booking_url": "https://...",      // string (optional) — link to booking/reservation
 *           "image_url": "https://...",        // string (optional) — photo of venue/hotel/location
 *           "amenities": ["WiFi", "Pool"],     // string[] (optional) — for hotels/venues
 *           "flight_class": "economy",         // string (optional) — economy, premium_economy, business, first
 *           "rating": 4.5,                     // number (optional) — venue rating (0-5)
 *           "address": "123 Rue ...",          // string (optional) — full street address
 *           "phone": "+33 1 23 45 67",         // string (optional) — contact phone
 *           "website": "https://...",          // string (optional) — venue website
 *           "confirmation_code": "ABC123",     // string (optional) — booking confirmation code
 *           "provider": "Booking.com",         // string (optional) — booking provider name
 *           "category": "boutique hotel"       // string (optional) — sub-category descriptor
 *         }
 *       ]
 *     }
 *   ],
 *   "flights": {                               // object — flight summary
 *     "outbound": "NYC → Paris",               // string — outbound route
 *     "return": "Paris → NYC",                 // string — return route
 *     "total_cost": 800                        // number — combined flight cost
 *   },
 *   "accommodation": {                         // object — hotel summary
 *     "name": "Hotel Le Marais",               // string — hotel name
 *     "nights": 4,                             // number — nights
 *     "total_cost": 600                        // number — total accommodation cost
 *   }
 * }
 *
 * IMPORTANT: The first activity of day 1 MUST be type "flight" or "transport" (departure).
 *            The last activity of the final day MUST be type "flight" or "transport" (return).
 *            If omitted, they will be auto-injected as placeholders.
 */

const TRANSPORT_TYPES = ["flight", "transport"];

// Ensure the itinerary starts with departure transport and ends with return transport
const ensureTransportBookends = (itinerary: TripItinerary, formData: TripFormData): TripItinerary => {
  const days = [...itinerary.daily_itinerary.map(d => ({ ...d, activities: [...d.activities] }))];

  if (days.length === 0) return itinerary;

  // Check first activity of first day
  const firstDay = days[0];
  const firstActivity = firstDay.activities[0];
  if (!firstActivity || !TRANSPORT_TYPES.includes(firstActivity.type)) {
    firstDay.activities.unshift({
      time: "06:00",
      name: `Flight: ${formData.departure_city} → ${formData.destination_city}`,
      type: "flight",
      duration: "2-3h",
      location: `${formData.departure_city} Airport`,
      cost: 0,
      notes: "Departure flight",
    });
  }

  // Check last activity of last day
  const lastDay = days[days.length - 1];
  const lastActivity = lastDay.activities[lastDay.activities.length - 1];
  if (!lastActivity || !TRANSPORT_TYPES.includes(lastActivity.type)) {
    lastDay.activities.push({
      time: "18:00",
      name: `Flight: ${formData.destination_city} → ${formData.departure_city}`,
      type: "flight",
      duration: "2-3h",
      location: `${formData.destination_city} Airport`,
      cost: 0,
      notes: "Return flight",
    });
  }

  return { ...itinerary, daily_itinerary: days };
};

// Parse a single activity from the webhook response
const parseActivity = (act: any, fallbackLocation: string): Activity => ({
  time: act.time || "09:00",
  name: act.name || "Activity",
  type: act.type || "activity",
  duration: act.duration || "1h",
  location: act.location || fallbackLocation,
  cost: act.cost !== undefined ? act.cost : undefined,
  notes: act.notes || undefined,
  booking_url: act.booking_url || undefined,
  image_url: act.image_url || undefined,
  amenities: Array.isArray(act.amenities) ? act.amenities : undefined,
  flight_class: act.flight_class || undefined,
  rating: act.rating !== undefined ? act.rating : undefined,
  address: act.address || undefined,
  phone: act.phone || undefined,
  website: act.website || undefined,
  confirmation_code: act.confirmation_code || undefined,
  provider: act.provider || undefined,
  category: act.category || undefined,
});

// Distribute a flat list of activities across trip days based on time resets
const groupActivitiesIntoDays = (activities: Activity[], startDate: Date, numDays: number): DayItinerary[] => {
  const days: Activity[][] = [];
  let currentDayActivities: Activity[] = [];
  let lastTimeMinutes = -1;

  for (const act of activities) {
    const [h, m] = (act.time || "00:00").split(":").map(Number);
    const timeMinutes = (h || 0) * 60 + (m || 0);

    // A time that's earlier than the previous activity signals a new day
    if (currentDayActivities.length > 0 && timeMinutes <= lastTimeMinutes) {
      days.push(currentDayActivities);
      currentDayActivities = [];
    }
    currentDayActivities.push(act);
    lastTimeMinutes = timeMinutes;
  }
  if (currentDayActivities.length > 0) {
    days.push(currentDayActivities);
  }

  // Build DayItinerary objects, padding with empty days if needed
  const themes = ["Arrival & Exploration", "Cultural Immersion", "Adventure Day", "Local Experience", "Scenic Journey", "Relaxation & Wellness", "Discovery Day", "Grand Finale", "Free Day", "Departure"];
  const totalDays = Math.max(days.length, numDays);

  return Array.from({ length: totalDays }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return {
      day: i + 1,
      date: date.toISOString().split("T")[0],
      theme: themes[i % themes.length],
      activities: days[i] || [],
    };
  });
};

// Validate and coerce webhook response into TripItinerary shape
const parseWebhookResponse = (data: any, formData: TripFormData): TripItinerary => {
  // If response is a flat array of activity-like objects, wrap in { data: [...] }
  if (Array.isArray(data) && data.length > 0 && data[0].time && data[0].name) {
    console.log("Response is a flat activity array, wrapping for processing");
    return parseWebhookResponse({ data }, formData);
  }

  // Handle case where n8n wraps response in a single-element array containing the itinerary
  let payload = Array.isArray(data) ? data[0] : data;

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid response format from webhook");
  }

  // Unwrap "data" envelope if present (n8n commonly wraps in { data: [...] })
  if (payload.data && !payload.daily_itinerary) {
    const inner = payload.data;
    // If data is a flat array of activities, group them into days
    if (Array.isArray(inner)) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      const numDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const activities = inner.map((act: any) => parseActivity(act, formData.destination_city));
      const dailyItinerary = groupActivitiesIntoDays(activities, startDate, numDays);

      // Compute totals from activities
      const totalCost = activities.reduce((sum, a) => sum + (a.cost || 0), 0);
      const flights = activities.filter(a => a.type === "flight");
      const hotel = activities.find(a => a.type === "accommodation");

      const comfortNames = ["Budget", "Economy", "Standard", "Premium", "Luxury"];
      const comfortEmojis = ["🎒", "💼", "⭐", "✨", "👑"];

      const itinerary: TripItinerary = {
        destination: formData.destination_city,
        dates: `${formData.start_date} - ${formData.end_date}`,
        travelers: formData.travelers,
        comfort_level: formData.comfort_level,
        comfort_level_name: comfortNames[formData.comfort_level - 1] || "Standard",
        comfort_level_emoji: comfortEmojis[formData.comfort_level - 1] || "⭐",
        total_cost: totalCost,
        daily_itinerary: dailyItinerary,
        flights: {
          outbound: flights[0]?.location || `${formData.departure_city} → ${formData.destination_city}`,
          return: flights[flights.length - 1]?.location || `${formData.destination_city} → ${formData.departure_city}`,
          total_cost: flights.reduce((sum, f) => sum + (f.cost || 0), 0),
        },
        accommodation: {
          name: hotel?.name || `Hotel in ${formData.destination_city}`,
          nights: hotel ? parseInt(hotel.duration) || Math.max(1, numDays - 1) : Math.max(1, numDays - 1),
          total_cost: hotel?.cost || 0,
        },
      };

      return ensureTransportBookends(itinerary, formData);
    }
    // If data is an object, treat it as the payload itself
    payload = inner;
  }

  // Standard format: payload has daily_itinerary already grouped
  const dailyItinerary: DayItinerary[] = payload.daily_itinerary || payload.itinerary || [];
  
  if (!Array.isArray(dailyItinerary) || dailyItinerary.length === 0) {
    throw new Error("No itinerary data in response");
  }

  const startDate = new Date(formData.start_date);
  const endDate = new Date(formData.end_date);
  const numDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const comfortNames = ["Budget", "Economy", "Standard", "Premium", "Luxury"];
  const comfortEmojis = ["🎒", "💼", "⭐", "✨", "👑"];

  const itinerary: TripItinerary = {
    destination: payload.destination || formData.destination_city,
    dates: payload.dates || `${formData.start_date} - ${formData.end_date}`,
    travelers: payload.travelers || formData.travelers,
    comfort_level: payload.comfort_level || formData.comfort_level,
    comfort_level_name: payload.comfort_level_name || comfortNames[formData.comfort_level - 1] || "Standard",
    comfort_level_emoji: payload.comfort_level_emoji || comfortEmojis[formData.comfort_level - 1] || "⭐",
    total_cost: payload.total_cost || 0,
    daily_itinerary: dailyItinerary.map((day: any, i: number) => ({
      day: day.day || i + 1,
      date: day.date || new Date(startDate.getTime() + i * 86400000).toISOString().split("T")[0],
      theme: day.theme || "Day " + (i + 1),
      activities: (day.activities || []).map((act: any) => parseActivity(act, formData.destination_city)),
    })),
    flights: {
      outbound: payload.flights?.outbound || `${formData.departure_city} → ${formData.destination_city}`,
      return: payload.flights?.return || `${formData.destination_city} → ${formData.departure_city}`,
      total_cost: payload.flights?.total_cost || 0,
    },
    accommodation: {
      name: payload.accommodation?.name || `Hotel in ${formData.destination_city}`,
      nights: payload.accommodation?.nights || Math.max(1, numDays - 1),
      total_cost: payload.accommodation?.total_cost || 0,
    },
  };

  return ensureTransportBookends(itinerary, formData);
};

// Generate local placeholder itinerary (fallback if webhook fails/times out)
const generatePlaceholder = (formData: TripFormData): TripItinerary => {
  const startDate = new Date(formData.start_date);
  const endDate = new Date(formData.end_date);
  const numDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const themes = ["Exploration & Discovery", "Cultural Immersion", "Relaxation & Wellness", "Adventure Day", "Local Experience", "Scenic Journey"];
  const templates = [
    { name: "Explore Old Town", type: "sightseeing", duration: "3 hours", cost: 0 },
    { name: "Local Food Tour", type: "dining", duration: "2 hours", cost: 45 },
    { name: "Museum Visit", type: "sightseeing", duration: "2.5 hours", cost: 25 },
    { name: "Sunset Viewpoint", type: "sightseeing", duration: "1.5 hours", cost: 0 },
    { name: "Traditional Restaurant", type: "dining", duration: "1.5 hours", cost: 35 },
    { name: "Walking Tour", type: "activity", duration: "3 hours", cost: 20 },
    { name: "Beach Day", type: "activity", duration: "4 hours", cost: 15 },
    { name: "Cooking Class", type: "activity", duration: "3 hours", cost: 60 },
    { name: "Market Shopping", type: "shopping", duration: "2 hours", cost: 50 },
    { name: "Boat Tour", type: "activity", duration: "4 hours", cost: 80 },
  ];

  const dailyItinerary = Array.from({ length: numDays }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const times = ["09:00", "12:00", "15:00", "19:00"];
    const numActivities = Math.floor(Math.random() * 2) + 3;

    return {
      day: i + 1,
      date: date.toISOString().split("T")[0],
      theme: themes[i % themes.length],
      activities: Array.from({ length: numActivities }, (_, j) => {
        const t = templates[Math.floor(Math.random() * templates.length)];
        return {
          time: times[j] || "20:00",
          name: t.name,
          type: t.type,
          location: `${formData.destination_city} - District ${Math.floor(Math.random() * 10) + 1}`,
          duration: t.duration,
          cost: t.cost,
          notes: `Perfect for ${formData.group_type} travelers`,
        };
      }),
    };
  });

  const comfortNames = ["Budget", "Economy", "Standard", "Premium", "Luxury"];
  const comfortEmojis = ["🎒", "💼", "⭐", "✨", "👑"];
  const baseCost = formData.comfort_level * 80;
  const totalCost = baseCost * numDays * formData.travelers;
  const flightCost = formData.comfort_level * 150 * formData.travelers;
  const hotelCost = formData.comfort_level * 60 * (numDays - 1);

  const placeholder: TripItinerary = {
    destination: formData.destination_city,
    dates: `${formData.start_date} - ${formData.end_date}`,
    travelers: formData.travelers,
    comfort_level: formData.comfort_level,
    comfort_level_name: comfortNames[formData.comfort_level - 1] || "Standard",
    comfort_level_emoji: comfortEmojis[formData.comfort_level - 1] || "⭐",
    total_cost: totalCost + flightCost + hotelCost,
    daily_itinerary: dailyItinerary,
    flights: {
      outbound: `${formData.departure_city} → ${formData.destination_city}`,
      return: `${formData.destination_city} → ${formData.departure_city}`,
      total_cost: flightCost,
    },
    accommodation: {
      name: `${comfortNames[formData.comfort_level - 1] || "Standard"} Hotel in ${formData.destination_city}`,
      nights: numDays - 1,
      total_cost: hotelCost,
    },
  };

  return ensureTransportBookends(placeholder, formData);
};

/**
 * Submit trip request directly to n8n webhook.
 * Waits up to 120s for a real response; falls back to placeholder on timeout/error.
 */
export const submitTripRequest = async (formData: TripFormData): Promise<TripItinerary> => {
  console.log("=== Trip Planning Request ===");
  console.log("Form Data:", JSON.stringify(formData, null, 2));

  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("VITE_N8N_WEBHOOK_URL not set, using placeholder");
    return generatePlaceholder(formData);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorMsg = errorBody?.error || `Server error: ${response.status}`;
      const isTimeout = response.status === 504 || errorMsg.includes("timed out");
      if (isTimeout) {
        console.warn("Webhook timed out, using placeholder");
        return generatePlaceholder(formData);
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();

    if (data?.error) {
      const isTimeout = data.error.includes("timed out") || data.error.includes("timeout");
      if (isTimeout) {
        console.warn("Webhook timed out (from response), using placeholder");
        return generatePlaceholder(formData);
      }
      console.error("Webhook returned error:", data.error);
      throw new Error(data.error);
    }

    console.log("Webhook response received, parsing...");
    return parseWebhookResponse(data, formData);
  } catch (err) {
    // Re-throw so the UI can display the error to the user
    if (err instanceof Error) throw err;
    throw new Error("Failed to generate itinerary");
  }
};
