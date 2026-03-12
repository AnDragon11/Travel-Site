import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Secrets ─────────────────────────────────────────────────────────────────
const XAI_API_KEY = Deno.env.get("XAI_API_KEY")!;
const XAI_MODEL = Deno.env.get("XAI_MODEL") ?? "grok-beta";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DUFFEL_API_KEY = Deno.env.get("DUFFEL_API_KEY");
const AMADEUS_CLIENT_ID = Deno.env.get("AMADEUS_CLIENT_ID");
const AMADEUS_CLIENT_SECRET = Deno.env.get("AMADEUS_CLIENT_SECRET");
const TRAVELPAYOUTS_TOKEN = Deno.env.get("TRAVELPAYOUTS_TOKEN");
const AMADEUS_BASE = Deno.env.get("AMADEUS_BASE_URL") ?? "https://test.api.amadeus.com";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TripFormData {
  departure_city: string;
  destination_city: string;
  start_date: string;
  end_date: string;
  travelers: number;
  kids: number;
  preferences: string[];
  passport_country: string;
  group_type: string;
  comfort_level: number;
}

interface ResolvedCity {
  dbId: string | null;
  iataCode: string;
  cityName: string;
  countryCode: string;
  countryName: string;
  lat: number;
  lng: number;
}

// One leg of a multi-segment journey (Duffel gives per-segment data)
interface FlightSegment {
  depAt: string;          // ISO datetime
  arrAt: string;          // ISO datetime
  depIata: string;        // e.g. "LHR"
  depName: string;        // e.g. "London Heathrow"
  arrIata: string;        // e.g. "CDG"
  arrName: string;        // e.g. "Paris Charles de Gaulle"
  airline: string;        // e.g. "British Airways"
  airlineIata: string;    // e.g. "BA"
  flightNo: string;       // e.g. "BA308"
  duration: string;       // e.g. "2h 30m"
  depTerminal?: string;
  arrTerminal?: string;
}

interface FlightSlice {
  segments: FlightSegment[];
  stops: number;
  totalDuration: string;
}

interface RoundTripOption {
  label: string;
  outSlice: FlightSlice;
  retSlice: FlightSlice;
  pricePerPerson: number;  // total round-trip per person
  totalPrice: number;      // pricePerPerson × totalPax
  currency: string;
  cabinClass: string;
  isApproximate?: boolean;
}

interface HotelOption {
  label: string;
  name: string;
  stars: number;
  pricePerNight: number;       // per room per night (USD)
  totalPrice: number;          // pricePerNight × nights
  currency: string;
  address: string;             // full address string
  hotelId: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  roomType?: string;           // e.g. "Deluxe Double"
  bedType?: string;            // e.g. "1×King"
  boardType?: string;          // e.g. "Breakfast included"
  cancellationPolicy?: string;
  amenities: string[];
  imageUrl?: string;
}

interface POIOption {
  name: string;
  category: string;
  rank: number;
}

interface ActivityOption {
  id: string;
  refId: string;      // short prompt reference like "img001" — AI copies this into activity_ref_id
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  rating: number;
  bookingLink: string;
  pictureUrl: string;
}

interface RealData {
  origin: ResolvedCity | null;
  destination: ResolvedCity | null;
  flights: RoundTripOption[];
  hotels: HotelOption[];
  poi: POIOption[];
  activities: ActivityOption[];
}

interface RegenDayRequest {
  dayIndex: number;
  dayDate: string;
  destination: string;
  travelers: number;
  comfort_level?: number;
  existingActivities?: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COMFORT_NAMES = ["Nomad", "Smart", "Balanced", "Comfortable", "Luxurious"];
const COMFORT_EMOJIS = ["🎒", "💼", "⚖️", "🏨", "💎"];

function cabinClass(level: number): string {
  if (level <= 2) return "economy";
  if (level === 3) return "premium_economy";
  if (level === 4) return "business";
  return "first";
}

function starRatings(level: number): string {
  return ({ 1: "1,2", 2: "2,3", 3: "3,4", 4: "4,5", 5: "5" } as Record<number, string>)[level] ?? "3,4";
}

function tripDays(form: TripFormData): string[] {
  const nights = Math.round(
    (new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / 86_400_000,
  );
  return Array.from({ length: nights + 1 }, (_, i) => {
    const d = new Date(form.start_date);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function isoToDuration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return iso;
  return [m[1] && `${m[1]}h`, m[2] && `${m[2]}m`].filter(Boolean).join(" ");
}

function fmtTime(iso: string): string {
  if (!iso) return "00:00";
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
  } catch { return iso.slice(11, 16) || "00:00"; }
}

function fmtDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  } catch { return iso.slice(0, 10); }
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = (time ?? "00:00").split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function durationToMinutes(duration: string): number {
  const m = (duration ?? "").match(/(?:(\d+)h)?\s*(?:(\d+)m)?/);
  return Number(m?.[1] ?? 0) * 60 + Number(m?.[2] ?? 0);
}

function nightsBetween(checkin: string, checkout: string): number {
  return Math.max(1, Math.round(
    (new Date(checkout).getTime() - new Date(checkin).getTime()) / 86_400_000,
  ));
}

// ─── Amadeus ──────────────────────────────────────────────────────────────────

async function amadeusToken(): Promise<string> {
  const r = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${AMADEUS_CLIENT_ID}&client_secret=${AMADEUS_CLIENT_SECRET}`,
    signal: AbortSignal.timeout(5_000),
  });
  if (!r.ok) throw new Error(`Amadeus auth ${r.status}: ${await r.text()}`);
  return (await r.json()).access_token;
}

async function resolveCity(
  cityName: string,
  token: string,
  supabase: ReturnType<typeof createClient>,
): Promise<ResolvedCity | null> {
  // DB cache first
  const { data: cached } = await supabase
    .from("destinations")
    .select("id, iata_code, name, country_code, country_name, latitude, longitude")
    .ilike("name", cityName)
    .maybeSingle();

  if (cached?.iata_code) {
    return {
      dbId: cached.id ?? null,
      iataCode: cached.iata_code.trim(),
      cityName: cached.name,
      countryCode: (cached.country_code ?? "").trim(),
      countryName: cached.country_name ?? "",
      lat: Number(cached.latitude),
      lng: Number(cached.longitude),
    };
  }

  const r = await fetch(
    `${AMADEUS_BASE}/v1/reference-data/locations?subType=CITY&keyword=${encodeURIComponent(cityName)}&page[limit]=3`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(4_000) },
  );
  if (!r.ok) return null;
  const { data } = await r.json();
  if (!data?.length) return null;

  const loc = data[0];
  const resolved: ResolvedCity = {
    dbId: null,
    iataCode: loc.iataCode,
    cityName: loc.address?.cityName ?? cityName,
    countryCode: loc.address?.countryCode ?? "",
    countryName: loc.address?.countryName ?? "",
    lat: loc.geoCode?.latitude ?? 0,
    lng: loc.geoCode?.longitude ?? 0,
  };

  let dbId: string | null = null;
  try {
    const { data: inserted } = await supabase.from("destinations").insert({
      name: resolved.cityName,
      country_code: resolved.countryCode,
      country_name: resolved.countryName,
      latitude: resolved.lat,
      longitude: resolved.lng,
      iata_code: resolved.iataCode.slice(0, 3),
      language: null,
      region: null,
      timezone: null,
      currency_code: null,
    }).select("id").single();
    dbId = inserted?.id ?? null;
  } catch { /* non-critical */ }

  return { ...resolved, dbId };
}

// ─── Amadeus Hotels ───────────────────────────────────────────────────────────

async function fetchHotels(
  cityCode: string,
  destCountryCode: string,
  checkin: string,
  checkout: string,
  adults: number,
  comfortLevel: number,
  token: string,
  supabase: ReturnType<typeof createClient>,
  destinationDbId: string | null = null,
): Promise<HotelOption[]> {
  const nights = nightsBetween(checkin, checkout);

  // Step 1: hotel list by city
  const listR = await fetch(
    `${AMADEUS_BASE}/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}&ratings=${starRatings(comfortLevel)}&hotelSource=ALL`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5_000) },
  );
  if (!listR.ok) return [];
  const { data: hotelList } = await listR.json();
  if (!hotelList?.length) return [];

  const hotelIds = hotelList.slice(0, 10).map((h: any) => h.hotelId).join(",");

  // Step 2: live offers
  const offR = await fetch(
    `${AMADEUS_BASE}/v3/shopping/hotel-offers?hotelIds=${hotelIds}&adults=${adults}&checkInDate=${checkin}&checkOutDate=${checkout}&roomQuantity=1&currency=USD&bestRateOnly=true`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5_000) },
  );
  if (!offR.ok) return [];
  const { data: offerData } = await offR.json();
  if (!offerData?.length) return [];

  const boardMap: Record<string, string> = {
    ROOM_ONLY: "Room only", BREAKFAST: "Breakfast included",
    HALF_BOARD: "Half board", FULL_BOARD: "Full board", ALL_INCLUSIVE: "All inclusive",
  };

  const labels = ["A", "B", "C"];
  const options: HotelOption[] = offerData
    .filter((h: any) => h.offers?.[0]?.price?.total)
    .sort((a: any, b: any) => Number(a.offers[0].price.total) - Number(b.offers[0].price.total))
    .slice(0, 3)
    .map((h: any, i: number) => {
      const offer = h.offers[0];
      const hotelData = h.hotel;
      const totalPrice = Number(offer.price.total);
      const pricePerNight = totalPrice / nights;

      // Room details
      const roomEst = offer.room?.typeEstimated;
      const roomType = roomEst?.category
        ? roomEst.category.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())
        : (offer.room?.type ?? undefined);
      const bedType = roomEst?.bedType
        ? `${roomEst.beds ? roomEst.beds + "×" : ""}${roomEst.bedType}`
        : undefined;

      // Full address
      const addrLines: string[] = hotelData.address?.lines ?? [];
      const city = hotelData.address?.cityName ?? cityCode;
      const postal = hotelData.address?.postalCode ?? "";
      const fullAddress = [...addrLines, `${city}${postal ? " " + postal : ""}`].filter(Boolean).join(", ");

      // Amenities — clean up underscore-separated tags
      const rawAmenities: string[] = hotelData.amenities ?? [];
      const cleanAmenities = rawAmenities
        .slice(0, 15)
        .map((a: string) => a.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()));

      const hotel: HotelOption = {
        label: labels[i],
        name: hotelData.name,
        stars: Math.min(5, Math.max(1, Number(hotelData.rating) || comfortLevel + 1)),
        pricePerNight,
        totalPrice,
        currency: offer.price.currency ?? "USD",
        address: fullAddress || cityCode,
        hotelId: hotelData.hotelId,
        checkInDate: checkin,
        checkOutDate: checkout,
        nights,
        roomType,
        bedType,
        boardType: boardMap[offer.boardType ?? ""] ?? "Room only",
        cancellationPolicy: offer.policies?.cancellation?.description?.text ?? undefined,
        amenities: cleanAmenities,
        imageUrl: (hotelData.media as any[] | undefined)?.find((m: any) => m.uri?.startsWith("http"))?.uri,
      };

      // Cache hotel + amenities (fire & forget)
      supabase.from("hotels").insert({
        provider_id: hotel.hotelId, provider: "amadeus", name: hotel.name,
        destination_id: destinationDbId, city: cityCode, country_code: destCountryCode.slice(0, 2),
        star_rating: hotel.stars, address: hotel.address, active: true,
        last_verified: new Date().toISOString(),
      }).select("id").single().then(({ data: row }: { data: { id: string } | null }) => {
        if (!row?.id || rawAmenities.length === 0) return;
        supabase.from("hotel_amenities")
          .insert(rawAmenities.map((tag: string) => ({ hotel_id: row.id, amenity_tag: tag })))
          .then(() => {}).catch(() => {});
      }).catch(() => {});

      return hotel;
    });

  return options;
}

// ─── Duffel Flights ───────────────────────────────────────────────────────────

async function fetchFlights(
  originIata: string,
  destIata: string,
  departDate: string,
  returnDate: string,
  adults: number,
  kids: number,
  comfortLevel: number,
): Promise<RoundTripOption[]> {
  const passengers = [
    ...Array(adults).fill({ type: "adult" }),
    ...Array(kids).fill({ type: "child" }),
  ];
  const cabin = cabinClass(comfortLevel);
  const totalPax = adults + kids;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);

  let resp: Response;
  try {
    resp = await fetch("https://api.duffel.com/air/offer_requests?return_offers=true", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DUFFEL_API_KEY}`,
        "Content-Type": "application/json",
        "Duffel-Version": "v1",
        Accept: "application/json",
      },
      body: JSON.stringify({
        data: {
          slices: [
            { origin: originIata, destination: destIata, departure_date: departDate },
            { origin: destIata, destination: originIata, departure_date: returnDate },
          ],
          passengers,
          cabin_class: cabin,
        },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) throw new Error(`Duffel ${resp.status}: ${await resp.text()}`);
  const { data } = await resp.json();
  const offers: any[] = data?.offers ?? [];

  const mapSegment = (seg: any): FlightSegment => ({
    depAt: seg.departing_at,
    arrAt: seg.arriving_at,
    depIata: seg.origin?.iata_code ?? "",
    depName: seg.origin?.name ?? seg.origin?.city_name ?? seg.origin?.iata_code ?? "",
    arrIata: seg.destination?.iata_code ?? "",
    arrName: seg.destination?.name ?? seg.destination?.city_name ?? seg.destination?.iata_code ?? "",
    airline: seg.operating_carrier?.name ?? seg.marketing_carrier?.name ?? "Unknown",
    airlineIata: (seg.operating_carrier?.iata_code ?? seg.marketing_carrier?.iata_code ?? "").toUpperCase(),
    flightNo: `${seg.operating_carrier?.iata_code ?? ""}${seg.operating_carrier_flight_number ?? ""}`,
    duration: isoToDuration(seg.duration ?? ""),
    depTerminal: seg.origin_terminal ?? undefined,
    arrTerminal: seg.destination_terminal ?? undefined,
  });

  const mapSlice = (slice: any): FlightSlice => ({
    segments: (slice.segments as any[]).map(mapSegment),
    stops: slice.segments.length - 1,
    totalDuration: isoToDuration(slice.duration ?? ""),
  });

  const labels = ["A", "B", "C"];
  return offers
    .filter((o: any) => o.total_amount && o.slices?.length === 2)
    .sort((a: any, b: any) => Number(a.total_amount) - Number(b.total_amount))
    .slice(0, 3)
    .map((o: any, i: number): RoundTripOption => ({
      label: labels[i],
      outSlice: mapSlice(o.slices[0]),
      retSlice: mapSlice(o.slices[1]),
      pricePerPerson: Number(o.total_amount) / totalPax,
      totalPrice: Number(o.total_amount),
      currency: o.total_currency,
      cabinClass: cabin,
    }));
}

// ─── Amadeus POI ──────────────────────────────────────────────────────────────

async function fetchPOIs(lat: number, lng: number, token: string): Promise<POIOption[]> {
  const r = await fetch(
    `${AMADEUS_BASE}/v1/reference-data/locations/pois?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&radius=20&page[limit]=15`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(4_000) },
  );
  if (!r.ok) return [];
  const { data } = await r.json();
  if (!data?.length) return [];
  return (data as any[])
    .map((p: any): POIOption => ({ name: p.name, category: p.category ?? "attraction", rank: Number(p.rank) || 0 }))
    .sort((a, b) => b.rank - a.rank);
}

// ─── Amadeus Activities (bookable experiences with real images + prices) ──────

async function fetchActivities(lat: number, lng: number, token: string): Promise<ActivityOption[]> {
  const r = await fetch(
    `${AMADEUS_BASE}/v1/shopping/activities?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&radius=20&page[limit]=20`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(4_000) },
  );
  if (!r.ok) return [];
  const { data } = await r.json();
  if (!data?.length) return [];
  return (data as any[])
    .filter((a: any) => a.name && a.pictures?.[0]?.url)
    .map((a: any, i: number): ActivityOption => ({
      id: a.id ?? generateId(),
      refId: `img${String(i + 1).padStart(3, "0")}`,  // e.g. "img001" — referenced by AI in activity_ref_id
      name: a.name,
      description: a.shortDescription ?? "",
      category: (a.category ?? "SIGHTSEEING").toLowerCase(),
      price: Number(a.price?.amount ?? 0),
      currency: a.price?.currencyCode ?? "USD",
      rating: Number(a.rating ?? 0),
      bookingLink: a.bookingLink ?? "",
      pictureUrl: a.pictures[0].url,
    }));
}

// ─── Travelpayouts (cached price fallback for when Duffel returns nothing) ────

async function fetchFlightsTravelpayouts(
  originIata: string,
  destIata: string,
  departDate: string,
  adults: number,
  kids: number,
): Promise<RoundTripOption[]> {
  if (!TRAVELPAYOUTS_TOKEN) return [];
  const beginningOfPeriod = departDate.slice(0, 8) + "01";
  const params = new URLSearchParams({
    origin: originIata, destination: destIata, currency: "usd",
    beginning_of_period: beginningOfPeriod, period_type: "month",
    limit: "5", token: TRAVELPAYOUTS_TOKEN,
  });

  const r = await fetch(`https://api.travelpayouts.com/v2/prices/latest?${params}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) return [];
  const json = await r.json();
  if (!json.success || !json.data?.length) return [];

  const labels = ["A", "B", "C", "D", "E"];
  const totalPax = adults + kids;

  const makeSlice = (depIso: string, dur: string, fromIata: string, toIata: string, stops: number, flightNo: string, airline: string): FlightSlice => ({
    segments: [{
      depAt: depIso || departDate + "T08:00:00",
      arrAt: depIso || departDate + "T10:00:00",
      depIata: fromIata, depName: fromIata,
      arrIata: toIata, arrName: toIata,
      airline, airlineIata: airline,
      flightNo, duration: dur,
    }],
    stops,
    totalDuration: dur,
  });

  return (json.data as any[]).slice(0, 5).map((entry, i): RoundTripOption => {
    const durTo = entry.duration_to ? `${Math.floor(entry.duration_to / 60)}h ${entry.duration_to % 60}m` : "varies";
    const durBack = entry.duration_back ? `${Math.floor(entry.duration_back / 60)}h ${entry.duration_back % 60}m` : "varies";
    const airline = entry.airline ?? "";
    const flightNo = `${airline}${entry.flight_number ?? ""}`;
    return {
      label: labels[i],
      outSlice: makeSlice(entry.departure_at, durTo, originIata, destIata, entry.transfers ?? 0, flightNo, airline),
      retSlice: makeSlice(entry.return_at, durBack, destIata, originIata, entry.return_transfers ?? 0, flightNo, airline),
      pricePerPerson: Number(entry.price),
      totalPrice: Number(entry.price) * totalPax,
      currency: "USD",
      cabinClass: "economy",
      isApproximate: true,
    };
  });
}

// ─── Images ───────────────────────────────────────────────────────────────────

const FALLBACK_IMAGES: Record<string, string> = {
  flight:        "https://images.unsplash.com/photo-1529074963764-98f45c47344b?w=800&h=600&fit=crop&auto=format",
  transport:     "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop&auto=format",
  accommodation: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop&auto=format",
  dining:        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&auto=format",
  cafe:          "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=600&fit=crop&auto=format",
  sightseeing:   "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=600&fit=crop&auto=format",
  activity:      "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=800&h=600&fit=crop&auto=format",
  shopping:      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=600&fit=crop&auto=format",
};

function activityImageUrl(type: string): string {
  return FALLBACK_IMAGES[type] ?? FALLBACK_IMAGES.sightseeing;
}

// Resolve image from real API data — no AI hallucination:
// 1. Flights → airline logo by IATA (kiwi.com CDN, reliable)
// 2. Accommodation check-in → hotel photo from Amadeus media[]
// 3. Sightseeing/activity/dining → match against Amadeus Activities pictures
// 4. Fallback → type-based Unsplash CDN
function resolveActivityImage(act: any, hotelOptions: HotelOption[], activityOptions: ActivityOption[] = []): string {
  const isFlightType = act.type === "flight" ||
    (act.type === "transport" && (act.subtype === "flight" || act.flight_number));

  if (isFlightType) {
    const iata = (act.airlineIata ?? String(act.flight_number ?? "").slice(0, 2))
      .toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 2);
    if (iata.length === 2) return `https://images.kiwi.com/airlines/64/${iata}.png`;
  }

  if (act.type === "accommodation" && hotelOptions.length > 0) {
    const actName = (act.name ?? "").toLowerCase().replace(/^check-(?:in|out):\s*/i, "");
    const matched = hotelOptions.find(h => {
      const hn = h.name.toLowerCase();
      return actName.includes(hn.slice(0, 8)) || hn.includes(actName.slice(0, 8));
    });
    if (matched?.imageUrl) return matched.imageUrl;
  }

  // Match against Amadeus activity pictures (sightseeing, dining, experiences)
  const isVisitType = ["sightseeing", "activity", "shopping", "dining", "cafe"].includes(act.type ?? "");
  if (isVisitType && activityOptions.length > 0) {
    // 1. Exact reference ID match (AI copied activity_ref_id from our prompt list — most reliable)
    if (act.activity_ref_id) {
      const byRef = activityOptions.find(ao => ao.refId === act.activity_ref_id);
      if (byRef?.pictureUrl) return byRef.pictureUrl;
    }
    // 2. Fuzzy name match as fallback (catches cases where AI used the name but not the ref)
    if (act.name) {
      const name = act.name.toLowerCase();
      const byName = activityOptions.find(ao =>
        ao.pictureUrl && (
          name.includes(ao.name.toLowerCase().slice(0, 12)) ||
          ao.name.toLowerCase().includes(name.slice(0, 12))
        )
      );
      if (byName?.pictureUrl) return byName.pictureUrl;
    }
  }

  return activityImageUrl(act.type ?? "");
}

// ─── Flight card injection ────────────────────────────────────────────────────

function bagsForCabin(cabinCls: string): { cabin: number; checkin: number } {
  if (cabinCls === "first" || cabinCls === "business") return { cabin: 2, checkin: 2 };
  if (cabinCls === "premium_economy") return { cabin: 1, checkin: 1 };
  return { cabin: 1, checkin: 1 }; // economy default
}

function buildFlightCards(slice: FlightSlice, cabinCls: string, isReturnLeg: boolean): any[] {
  const cards: any[] = [];
  const bags = bagsForCabin(cabinCls);
  for (let i = 0; i < slice.segments.length; i++) {
    const seg = slice.segments[i];
    const depId = generateId();
    const airlineLogo = seg.airlineIata.length === 2
      ? `https://images.kiwi.com/airlines/64/${seg.airlineIata}.png`
      : FALLBACK_IMAGES.flight;
    const termNote = [
      seg.depTerminal && `Departs Terminal ${seg.depTerminal}`,
      seg.arrTerminal && `Arrives Terminal ${seg.arrTerminal}`,
    ].filter(Boolean).join(". ");

    cards.push({
      id: depId,
      type: "flight",
      subtype: "flight",
      name: `Departing from ${seg.depName}`,
      time: fmtTime(seg.depAt),
      duration: seg.duration,
      location: `${seg.depName} (${seg.depIata})`,
      address: `${seg.depName} Airport${seg.depTerminal ? `, Terminal ${seg.depTerminal}` : ""}`,
      origin: `${seg.depName} (${seg.depIata})`,
      destination_airport: `${seg.arrName} (${seg.arrIata})`,
      airline: seg.airline,
      airlineIata: seg.airlineIata,
      flight_number: seg.flightNo,
      flight_class: cabinCls,
      departure_terminal: seg.depTerminal,
      arrival_terminal: seg.arrTerminal,
      luggage_cabin: bags.cabin,
      luggage_checkin: bags.checkin,
      cost: 0,  // set by caller for first segment
      notes: `${seg.airline} ${seg.flightNo}.${termNote ? " " + termNote + "." : ""} ${bags.cabin} cabin bag${bags.cabin > 1 ? "s" : ""}, ${bags.checkin} checked bag${bags.checkin > 1 ? "s" : ""} included.`.trim(),
      is_arrival: false,
      image_url: airlineLogo,
      booking_url: "",
    });

    cards.push({
      id: generateId(),
      type: "flight",
      subtype: "flight",
      name: `Arriving at ${seg.arrName}`,
      time: fmtTime(seg.arrAt),
      duration: seg.duration,
      location: `${seg.arrName} (${seg.arrIata})`,
      address: `${seg.arrName} Airport${seg.arrTerminal ? `, Terminal ${seg.arrTerminal}` : ""}`,
      origin: `${seg.depName} (${seg.depIata})`,
      destination_airport: `${seg.arrName} (${seg.arrIata})`,
      airline: seg.airline,
      airlineIata: seg.airlineIata,
      flight_number: seg.flightNo,
      flight_class: cabinCls,
      departure_terminal: seg.depTerminal,
      arrival_terminal: seg.arrTerminal,
      cost: 0,
      notes: `Arriving at ${seg.arrName}.${seg.arrTerminal ? ` Terminal ${seg.arrTerminal}.` : ""}`,
      is_arrival: true,
      flight_bond_id: depId,
      image_url: airlineLogo,
      booking_url: "",
    });
  }
  return cards;
}

// ─── Hotel card injection ─────────────────────────────────────────────────────

function buildHotelCards(hotel: HotelOption): { checkin: any; checkout: any } {
  const checkinId = generateId();
  const amenityNote = hotel.amenities.slice(0, 6).join(", ");
  const breakfastIncluded = /breakfast|half.board|full.board|all.incl/i.test(hotel.boardType ?? "");

  const checkin: any = {
    id: checkinId,
    type: "accommodation",
    name: `Check-in: ${hotel.name}`,
    time: "15:00",
    duration: "",
    location: hotel.address,
    address: hotel.address,
    cost: hotel.pricePerNight,
    cost_per_night: hotel.pricePerNight,
    nights: hotel.nights,
    stars: hotel.stars,
    room_type: hotel.roomType,
    bed_types: hotel.bedType,
    breakfast_included: breakfastIncluded,
    cancellation_policy: hotel.cancellationPolicy,
    amenities: hotel.amenities,
    checkin_time: "15:00",
    checkout_time: "12:00",
    is_checkout: false,
    notes: `${hotel.stars}★ ${hotel.name}. ${hotel.boardType ?? "Room only"}.${amenityNote ? ` Amenities: ${amenityNote}.` : ""}${hotel.cancellationPolicy ? " " + hotel.cancellationPolicy : ""}`,
    booking_url: "",
    image_url: hotel.imageUrl ?? FALLBACK_IMAGES.accommodation,
  };

  const checkout: any = {
    id: generateId(),
    type: "accommodation",
    name: `Check-out: ${hotel.name}`,
    time: "11:00",
    duration: "",
    location: hotel.address,
    address: hotel.address,
    cost: 0,
    stars: hotel.stars,
    is_checkout: true,
    hotel_bond_id: checkinId,
    notes: `Check out by 11:00.${hotel.cancellationPolicy ? " " + hotel.cancellationPolicy : " Allow time for luggage storage."}`,
    booking_url: "",
    image_url: hotel.imageUrl ?? FALLBACK_IMAGES.accommodation,
  };

  return { checkin, checkout };
}

// ─── Post-process itinerary ───────────────────────────────────────────────────
// Injects flight dep+arr pairs, hotel check-in+checkout pairs, resolves images.
// When real API data is available, flights/hotels are injected from that data
// (stripping any hallucinated AI versions). Otherwise, AI-generated cards are
// post-processed: flight departure cards get an arrival card twin, and
// accommodation check-in/checkout cards get matched and bonded.

function postProcessItinerary(
  dailyItinerary: any[],
  real: RealData | null,
  form: TripFormData,
): void {
  const hasRealFlights = (real?.flights?.length ?? 0) > 0;
  const hasRealHotels = (real?.hotels?.length ?? 0) > 0;
  const bestFlight = hasRealFlights ? real!.flights[0] : null;
  const bestHotel = hasRealHotels ? real!.hotels[0] : null;
  const hotelOptions = real?.hotels ?? [];
  const activityOptions = real?.activities ?? [];

  // ── Step 1: Assign IDs + images; strip AI-generated flights/hotels if replacing ──
  for (const day of dailyItinerary) {
    let acts: any[] = day.activities ?? [];
    if (hasRealFlights) acts = acts.filter(a => a.type !== "flight" && !(a.type === "transport" && a.subtype === "flight"));
    if (hasRealHotels) acts = acts.filter(a => a.type !== "accommodation");
    for (const act of acts) {
      if (!act.id) act.id = generateId();
      act.image_url = resolveActivityImage(act, hotelOptions, activityOptions);
    }
    day.activities = acts;
  }

  // ── Step 2: Inject real flight cards OR create arrival twins from AI cards ──
  if (bestFlight && dailyItinerary.length > 0) {
    // Outbound: inject at start of Day 1 (before any other activities)
    const outCards = buildFlightCards(bestFlight.outSlice, bestFlight.cabinClass, false);
    // Charge the per-person outbound cost on the first departure card
    if (outCards.length > 0) outCards[0].cost = bestFlight.pricePerPerson / 2;
    dailyItinerary[0].activities = [...outCards, ...dailyItinerary[0].activities];

    // Return: inject at end of last day (after any other activities)
    const retCards = buildFlightCards(bestFlight.retSlice, bestFlight.cabinClass, true);
    if (retCards.length > 0) retCards[0].cost = bestFlight.pricePerPerson / 2;
    const lastDay = dailyItinerary[dailyItinerary.length - 1];
    lastDay.activities = [...lastDay.activities, ...retCards];

  } else {
    // No real flight data: create arrival card twins for each AI departure card
    for (const day of dailyItinerary) {
      const result: any[] = [];
      for (const act of (day.activities ?? [])) {
        const isFlightDep = (act.type === "flight" || (act.type === "transport" && act.subtype === "flight"))
          && !act.is_arrival;
        if (isFlightDep && act.destination_airport && !act.flight_bond_id) {
          act.is_arrival = false;
          if (act.origin && !act.name?.startsWith("Arriving")) {
            act.name = `Departing from ${act.origin}`;
          }
          result.push(act);

          const airlineIata = (act.airlineIata ?? (act.airline ?? "").slice(0, 2)).toUpperCase();
          const arrTime = addMinutesToTime(act.time, durationToMinutes(act.duration));
          result.push({
            id: generateId(),
            type: act.type, subtype: act.subtype,
            name: `Arriving at ${act.destination_airport}`,
            time: arrTime, duration: act.duration,
            location: act.destination_airport,
            address: `${act.destination_airport} Airport`,
            origin: act.origin,
            destination_airport: act.destination_airport,
            airline: act.airline, airlineIata: act.airlineIata,
            flight_number: act.flight_number, flight_class: act.flight_class,
            departure_terminal: act.departure_terminal,
            arrival_terminal: act.arrival_terminal,
            cost: 0,
            notes: `Arrival.${act.arrival_terminal ? ` Terminal ${act.arrival_terminal}.` : ""}`,
            is_arrival: true,
            flight_bond_id: act.id,
            image_url: airlineIata.length === 2
              ? `https://images.kiwi.com/airlines/64/${airlineIata}.png`
              : FALLBACK_IMAGES.flight,
          });
        } else {
          result.push(act);
        }
      }
      day.activities = result;
    }
  }

  // ── Step 3: Inject real hotel cards OR bond AI accommodation cards ──
  if (bestHotel) {
    const { checkin, checkout } = buildHotelCards(bestHotel);

    // Insert check-in on Day 1, right after the last outbound flight arrival card
    const day1Acts: any[] = dailyItinerary[0].activities;
    const lastFlightIdx = day1Acts.reduce((last: number, a: any, i: number) =>
      (a.type === "flight" || (a.type === "transport" && a.subtype === "flight")) ? i : last, -1);
    day1Acts.splice(lastFlightIdx + 1, 0, checkin);

    // Insert checkout on last day, before the first return flight departure card
    const lastDayActs: any[] = dailyItinerary[dailyItinerary.length - 1].activities;
    const firstRetIdx = lastDayActs.findIndex((a: any) =>
      (a.type === "flight" || (a.type === "transport" && a.subtype === "flight")) && !a.is_arrival);
    if (firstRetIdx >= 0) {
      lastDayActs.splice(firstRetIdx, 0, checkout);
    } else {
      lastDayActs.push(checkout);
    }

  } else {
    // No real hotel data: pair AI accommodation check-in and checkout cards
    const allActs = dailyItinerary.flatMap(d => d.activities ?? []);
    const checkins = allActs.filter((a: any) => a.type === "accommodation" && !a.is_checkout);
    for (const ci of checkins) {
      if (!ci.id) ci.id = generateId();
      const rawName = (ci.name ?? "").replace(/^Check-in:\s*/i, "").trim();
      ci.name = `Check-in: ${rawName}`;
      ci.image_url = resolveActivityImage(ci, hotelOptions, activityOptions);

      const co = allActs.find((a: any) =>
        a.type === "accommodation" && a !== ci && !a.hotel_bond_id && (
          a.is_checkout ||
          /check.?out/i.test(a.name ?? "") ||
          (rawName.length >= 4 &&
            (a.name ?? "").toLowerCase().replace(/^check.?out:\s*/i, "").slice(0, 8) ===
            rawName.toLowerCase().slice(0, 8))
        )
      );
      if (co) {
        co.name = `Check-out: ${rawName}`;
        co.is_checkout = true;
        co.hotel_bond_id = ci.id;
        if (!co.location) co.location = ci.location;
        if (!co.address) co.address = ci.address;
        co.stars = ci.stars;
        if (ci.image_url) co.image_url = ci.image_url;
      }
    }
  }
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function flightLine(f: RoundTripOption): string {
  const [od, oa] = [f.outSlice.segments[0], f.outSlice.segments[f.outSlice.segments.length - 1]];
  const [rd, ra] = [f.retSlice.segments[0], f.retSlice.segments[f.retSlice.segments.length - 1]];
  const stop = (n: number) => n === 0 ? "non-stop" : `${n} stop${n > 1 ? "s" : ""}`;
  const approx = f.isApproximate ? " ⚠️ estimated" : "";
  const layoverNote = f.outSlice.stops > 0
    ? `\n         Layover via: ${f.outSlice.segments.slice(0, -1).map(s => `${s.arrName} (${s.arrIata})`).join(", ")}`
    : "";
  return [
    `  ${f.label}) OUT  ${od.airline} ${od.flightNo}: ${fmtDate(od.depAt)} ${fmtTime(od.depAt)}→${fmtTime(oa.arrAt)}, ${f.outSlice.totalDuration}, ${stop(f.outSlice.stops)}`,
    `         ${od.depName} (${od.depIata}) → ${oa.arrName} (${oa.arrIata})${layoverNote}`,
    `     RET  ${rd.airline} ${rd.flightNo}: ${fmtDate(rd.depAt)} ${fmtTime(rd.depAt)}→${fmtTime(ra.arrAt)}, ${f.retSlice.totalDuration}, ${stop(f.retSlice.stops)}`,
    `         ${rd.depName} (${rd.depIata}) → ${ra.arrName} (${ra.arrIata})`,
    `     PRICE  $${f.pricePerPerson.toFixed(0)}/person ($${f.totalPrice.toFixed(0)} total for ${f.totalPrice / f.pricePerPerson | 0} pax)${approx}`,
  ].join("\n");
}

function hotelLine(h: HotelOption): string {
  const roomNote = [h.roomType, h.bedType].filter(Boolean).join(", ");
  return [
    `  ${h.label}) ${h.name} (${"★".repeat(h.stars)}): $${h.pricePerNight.toFixed(0)}/night × ${h.nights} nights = $${h.totalPrice.toFixed(0)} — ${h.address}`,
    roomNote ? `         Room: ${roomNote}. ${h.boardType ?? ""}` : `         ${h.boardType ?? ""}`,
    h.cancellationPolicy ? `         Policy: ${h.cancellationPolicy}` : "",
    h.amenities.length ? `         Amenities: ${h.amenities.slice(0, 8).join(", ")}` : "",
  ].filter(Boolean).join("\n");
}

function buildPrompt(form: TripFormData, real: RealData | null): string {
  const dates = tripDays(form);
  const numDays = dates.length;
  const nights = numDays - 1;
  const comfortName = COMFORT_NAMES[form.comfort_level - 1] ?? "Balanced";
  const comfortEmoji = COMFORT_EMOJIS[form.comfort_level - 1] ?? "⚖️";
  const prefs = form.preferences.length > 0 ? form.preferences.join(", ") : "general sightseeing";
  const kidsNote = form.kids > 0 ? `\n- Kids: ${form.kids} (include kid-friendly activities throughout)` : "";
  const today = new Date().toISOString().split("T")[0];

  const hasRealFlights = (real?.flights?.length ?? 0) > 0;
  const hasRealHotels = (real?.hotels?.length ?? 0) > 0;
  const hasActivities = (real?.activities?.length ?? 0) > 0;
  const hasPOI = (real?.poi?.length ?? 0) > 0;
  const bestFlight = hasRealFlights ? real!.flights[0] : null;
  const bestHotel = hasRealHotels ? real!.hotels[0] : null;

  const comfortDescriptions: Record<number, string> = {
    1: "Nomad — cheapest possible. Hostels, street food, public transit only, budget airlines.",
    2: "Smart — comfortable but cost-conscious. 2-3★ hotels, economy flights, smart spending.",
    3: "Balanced — standard. 3-4★ hotels, good local mix, economy/premium economy.",
    4: "Comfortable — elevated. 4-5★ hotels, private transfers, business/premium economy.",
    5: "Luxurious — money no object. 5★ hotels, private drivers, business/first class.",
  };

  const groupNotes: Record<string, string> = {
    solo: "Solo traveler — safety, social venues, solo-friendly spots, opportunities to meet locals.",
    couple: "Couple — romantic atmosphere, intimate dining, couple activities, balanced adventure.",
    family: "Family with kids — strictly kid-friendly, manageable distances, early dinners, educational fun.",
    friends: "Group of friends — social and fun, group bookings, mix of activities and nightlife.",
    business: "Business — efficiency, central location, business hotels, professional transport.",
  };
  const groupNote = groupNotes[form.group_type] ?? `Group: ${form.group_type}`;

  // ── Real data section ──
  const parts: string[] = ["\n═══ REAL API DATA ═══"];

  if (hasRealFlights) {
    parts.push(`\nFLIGHTS — pre-selected option A (cheapest). DO NOT include flight activities in your JSON — they are auto-injected from real booking data.`);
    parts.push(`Pre-selected:\n${flightLine(bestFlight!)}`);
    if (real!.flights.length > 1) {
      parts.push(`Other options (reference only):\n${real!.flights.slice(1).map(f => flightLine(f)).join("\n")}`);
    }
  } else {
    parts.push(`\nNo live flight data — include outbound + return flight activities in your JSON.`);
  }

  if (hasRealHotels) {
    parts.push(`\nHOTELS — pre-selected option A (cheapest). DO NOT include accommodation activities — auto-injected.`);
    parts.push(`Pre-selected:\n${hotelLine(bestHotel!)}`);
    if (real!.hotels.length > 1) {
      parts.push(`Other options (reference only):\n${real!.hotels.slice(1).map(h => hotelLine(h)).join("\n")}`);
    }
  } else {
    parts.push(`\nNo live hotel data — include check-in and check-out activities in your JSON.`);
  }

  if (hasActivities) {
    parts.push(`\nVERIFIED BOOKABLE ACTIVITIES — prefer these for sightseeing/activity/dining slots.`);
    parts.push(`  ⚠️  When you use one of these, copy its [imgXXX] code into "activity_ref_id" — this loads the real photo.`);
    parts.push(real!.activities.slice(0, 15).map(a => {
      const price = a.price > 0 ? ` — $${a.price.toFixed(0)} pp ${a.currency}` : " — free";
      const rating = a.rating > 0 ? ` ★${a.rating}` : "";
      const link = a.bookingLink ? ` — book: ${a.bookingLink}` : "";
      const desc = a.description ? ` (${a.description.slice(0, 60)}${a.description.length > 60 ? "…" : ""})` : "";
      return `  [${a.refId}] ${a.name} [${a.category}]${price}${rating}${link}${desc}`;
    }).join("\n"));
    parts.push(`  Use exact names, prices, and booking_url from this list. Set activity_ref_id to the [imgXXX] code.`);
  } else if (hasPOI) {
    parts.push(`\nVERIFIED ATTRACTIONS:`);
    parts.push(real!.poi.map(p => `  • ${p.name} (${p.category})`).join("\n"));
  }

  const realSection = parts.length > 1 ? parts.join("\n") : "\n═══ NO LIVE API DATA ═══\nResearch realistic flights, hotels, and attractions.";

  // ── Knowledge note ──
  const researchSection = `\n# KNOWLEDGE — use your training knowledge for any gaps not covered by the API data above.`;

  // ── Schema: only include flight/hotel schema sections when AI must generate them ──
  const flightSchema = hasRealFlights ? "" : `
        // OUTBOUND FLIGHT (Day 1 first activity):
        {
          "time": "HH:MM",
          "name": "Departing from <Airport Name>",
          "type": "flight",
          "subtype": "flight",
          "duration": "<e.g. 3h 20m>",
          "location": "<Airport Name (IATA)>",
          "address": "<Full Airport Name, Terminal X>",
          "origin": "<Departure Airport Name (IATA)>",
          "destination_airport": "<Arrival Airport Name (IATA)>",
          "airline": "<exact airline name>",
          "flight_number": "<e.g. BA308>",
          "flight_class": "<economy|premium_economy|business|first>",
          "departure_terminal": "<if known>",
          "arrival_terminal": "<if known>",
          "cost": <round-trip per-person USD>,
          "notes": "<check-in advice, baggage, terminal info>",
          "booking_url": "<airline direct link if available>"
        },
        // RETURN FLIGHT (last day last activity — same schema, reversed airports, cost: 0)`;

  const hotelSchema = hasRealHotels ? "" : `
        // HOTEL CHECK-IN (Day 1, after flight):
        {
          "time": "15:00",
          "name": "Check-in: <Hotel Name>",
          "type": "accommodation",
          "duration": "",
          "location": "<neighborhood>",
          "address": "<full street address>",
          "stars": <1-5>,
          "nights": ${nights},
          "cost": <per-room per-night USD>,
          "cost_per_night": <per-room per-night USD>,
          "checkin_time": "15:00",
          "checkout_time": "12:00",
          "breakfast_included": <true|false>,
          "room_type": "<e.g. Deluxe Double>",
          "bed_types": "<e.g. King>",
          "cancellation_policy": "<policy text>",
          "amenities": ["WiFi", "Pool", ...],
          "notes": "<hotel highlights, location advantages>",
          "booking_url": "<hotel direct booking URL>",
          "rating": <real star rating>
        },
        // HOTEL CHECK-OUT (last day before return flight — is_checkout: true, cost: 0)`;

  const skipNote = [
    hasRealFlights && "Flight cards are auto-injected — OMIT them from your JSON.",
    hasRealHotels && "Hotel check-in/out are auto-injected — OMIT them from your JSON.",
  ].filter(Boolean).join(" ");

  return `You are a travel planning AI. Create a personalized, realistic itinerary with real venue names.
Today's date: ${today}

# USER INPUT
- Route: ${form.departure_city} → ${form.destination_city} (round trip)
- Dates: ${dates[0]} to ${dates[numDays - 1]} (${numDays} days, ${nights} nights)
- Adults: ${form.travelers}${form.kids > 0 ? `, Kids: ${form.kids}` : ""}, Group: ${form.group_type}
- Comfort: ${form.comfort_level}/5 — ${comfortDescriptions[form.comfort_level]}
- Interests: ${prefs}
- Passport: ${form.passport_country}${kidsNote}

# GROUP PROFILE
${groupNote}
${researchSection}
${realSection}

# OUTPUT — return ONLY this JSON (no markdown, no explanation):
{
  "destination": "${form.destination_city}",
  "dates": "${dates[0]} - ${dates[numDays - 1]}",
  "travelers": ${form.travelers},
  "comfort_level": ${form.comfort_level},
  "comfort_level_name": "${comfortName}",
  "comfort_level_emoji": "${comfortEmoji}",
  "total_cost": <grand total USD for ALL travelers — flights + hotel + activities>,
  "flights": {
    "outbound": "${form.departure_city} → ${form.destination_city}",
    "return": "${form.destination_city} → ${form.departure_city}",
    "total_cost": ${bestFlight ? bestFlight.totalPrice.toFixed(0) : "<number — round-trip total for ALL travelers>"}
  },
  "accommodation": {
    "name": "${bestHotel ? bestHotel.name : "<hotel name>"}",
    "nights": ${nights},
    "total_cost": ${bestHotel ? bestHotel.totalPrice.toFixed(0) : "<number — total all nights>"}
  },
  "daily_itinerary": [
    {
      "day": 1,
      "date": "${dates[0]}",
      "theme": "<engaging day theme>",
      "activities": [${flightSchema}${hotelSchema}
        {
          "time": "HH:MM",
          "name": "<specific real venue name>",
          "type": "<${hasRealFlights ? "" : "flight|"}transport|${hasRealHotels ? "" : "accommodation|"}dining|sightseeing|activity|shopping|cafe>",
          "subtype": "<transport: train|bus|taxi|ferry|metro  /  dining: restaurant|cafe|bar|street_food>",
          "duration": "<e.g. 2h>",
          "location": "<neighborhood or district>",
          "address": "<full street address>",
          "cost": <per-person USD, 0 if free>,
          "notes": "<practical tip, opening hours, booking advice>",
          "rating": <real rating 1.0-5.0 if known, else omit>,
          "booking_url": "<direct booking/ticket URL — include if from the Activities list above>",
          "opening_hours": "<HH:MM-HH:MM if applicable>",
          "cuisine": "<for dining/cafe — e.g. Italian, Japanese>",
          "reservation_required": <for dining — true|false>,
          "tickets_required": <for sightseeing/activity — true|false>,
          "operator": "<for non-flight transport — e.g. Eurostar, Uber>",
          "arrival_station": "<for non-flight transport — destination stop/station>",
          "activity_ref_id": "<copy [imgXXX] from the verified activities list — loads real photo; omit if not from list>"
        }
      ]
    }
    // ... ${numDays} days total — dates in order: ${dates.join(", ")}
  ]
}

# RULES
${skipNote ? `0. ${skipNote}\n` : ""}1. ${hasRealFlights ? "Day 1 first non-flight activity should be airport transfer or arrival meal" : "Day 1 MUST start with outbound flight from " + form.departure_city}
2. ${hasRealFlights ? "Last day last non-flight activity should be airport departure prep" : "Last day MUST end with return flight to " + form.departure_city}
3. ${hasRealHotels ? "Do NOT include accommodation activities" : `Include check-in Day 1 (after flight) and check-out Day ${numDays} (before return flight)`}
4. 4–6 activities per day (excluding auto-injected cards), times 24h HH:MM strictly increasing
5. All activity costs per person in USD, realistic for ${form.destination_city} at comfort ${form.comfort_level}/5
6. Cluster activities geographically to minimize travel time within each day
7. Fill ALL type-specific fields: cuisine+reservation_required for dining, operator+arrival_station for non-flight transport, tickets_required+opening_hours for sightseeing
8. Every activity MUST have full street address and practical notes
9. Adapt to group type: ${form.group_type}
10. No markdown fences, no text outside the JSON`;
}

// ─── Regen Day Prompt ─────────────────────────────────────────────────────────

function buildRegenDayPrompt(req: RegenDayRequest): string {
  const comfort = req.comfort_level ?? 3;
  const comfortName = COMFORT_NAMES[comfort - 1] ?? "Balanced";
  const existingNote = req.existingActivities?.length
    ? `\nAlready planned on other days (avoid duplicates): ${req.existingActivities.join(", ")}`
    : "";
  return `You are a travel planning AI. Generate a fresh set of activities for a single day of an existing trip.

# DAY TO REGENERATE
- Day ${req.dayIndex} — Date: ${req.dayDate}
- Destination: ${req.destination}
- Travelers: ${req.travelers}
- Comfort level: ${comfort}/5 (${comfortName})${existingNote}

# OUTPUT — return ONLY this JSON (no markdown, no explanation):
{
  "activities": [
    {
      "time": "HH:MM",
      "name": "<specific real venue or event name>",
      "type": "<dining|sightseeing|activity|shopping|cafe|transport>",
      "subtype": "<optional>",
      "duration": "<e.g. 2h>",
      "location": "<neighborhood>",
      "address": "<full street address>",
      "cost": <per-person USD, 0 if free>,
      "notes": "<practical tip or booking advice>",
      "booking_url": "<optional direct link>",
      "cuisine": "<for dining/cafe only>",
      "reservation_required": <for dining — true or false>,
      "tickets_required": <for sightseeing/activity — true or false>,
      "opening_hours": "<HH:MM-HH:MM if applicable>"
    }
  ]
}

# RULES
1. 4-6 activities, times in 24h HH:MM strictly increasing starting around 08:00-09:00
2. Do NOT include flights or hotel check-in/check-out (managed separately)
3. Mix activity types: sightseeing, local dining, transport, experiences
4. Use real specific venue names in ${req.destination} — no generic placeholders
5. Every activity needs full street address and notes
6. No markdown fences, no text outside the JSON`;
}

// ─── xAI ──────────────────────────────────────────────────────────────────────

// Always use chat/completions — fast (10-25s), fits within Supabase's 60s wall-clock limit.
// Web search via the responses API added 40-60s+ and caused consistent timeouts.
// Real API data (Duffel flights, Amadeus hotels/activities) replaces the need for web search.
async function callXAI(prompt: string): Promise<string> {
  const r = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${XAI_API_KEY}` },
    body: JSON.stringify({
      model: XAI_MODEL,
      messages: [
        { role: "system", content: "You are a travel planning AI. Respond with valid JSON only — no markdown, no prose." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 8000,
    }),
    signal: AbortSignal.timeout(40_000),
  });
  if (!r.ok) throw new Error(`xAI ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from AI");
  return content;
}

function parseAIJSON(raw: string): Record<string, unknown> {
  return JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, ""));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let requestId: string | null = null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    requestId = body.requestId ?? null;

    // ── Regen Day mode ────────────────────────────────────────────────────────
    if (body.regenDay) {
      const regenReq = body.regenDay as RegenDayRequest;
      const raw = await callXAI(buildRegenDayPrompt(regenReq));
      const parsed = parseAIJSON(raw);
      const activities: any[] = Array.isArray(parsed.activities) ? parsed.activities : [];
      for (const act of activities) {
        if (!act.id) act.id = generateId();
        act.image_url = resolveActivityImage(act, [], []);
      }
      return new Response(JSON.stringify({ activities }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form: TripFormData = body.formData;
    if (!form) throw new Error("Missing formData");
    console.log(`Trip: ${form.departure_city} → ${form.destination_city} | requestId: ${requestId ?? "none"}`);

    // ── Phase 2: Gather real API data ─────────────────────────────────────────
    let real: RealData | null = null;
    const hasAmadeus = !!(AMADEUS_CLIENT_ID && AMADEUS_CLIENT_SECRET);
    const hasDuffel = !!DUFFEL_API_KEY;

    if (hasAmadeus || hasDuffel) {
      try {
        const dates = tripDays(form);
        const token = hasAmadeus ? await amadeusToken() : null;

        const [origin, destination] = await Promise.all([
          token ? resolveCity(form.departure_city, token, supabase) : Promise.resolve(null),
          token ? resolveCity(form.destination_city, token, supabase) : Promise.resolve(null),
        ]);
        console.log(`Resolved: ${origin?.iataCode ?? "?"} → ${destination?.iataCode ?? "?"}`);

        const [duffelFlights, hotels, poi, activities] = await Promise.all([
          hasDuffel && origin && destination
            ? fetchFlights(
                origin.iataCode, destination.iataCode,
                dates[0], dates[dates.length - 1],
                form.travelers, form.kids, form.comfort_level,
              ).catch((e: Error) => { console.error("Duffel:", e.message); return [] as RoundTripOption[]; })
            : Promise.resolve([] as RoundTripOption[]),

          token && destination
            ? fetchHotels(
                destination.iataCode, destination.countryCode,
                dates[0], dates[dates.length - 1],
                form.travelers, form.comfort_level,
                token, supabase, destination.dbId,
              ).catch((e: Error) => { console.error("Amadeus hotels:", e.message); return [] as HotelOption[]; })
            : Promise.resolve([] as HotelOption[]),

          token && destination?.lat && destination?.lng
            ? fetchPOIs(destination.lat, destination.lng, token)
                .catch((e: Error) => { console.error("Amadeus POI:", e.message); return [] as POIOption[]; })
            : Promise.resolve([] as POIOption[]),

          // Amadeus Activities: real bookable experiences with images, prices, booking links
          token && destination?.lat && destination?.lng
            ? fetchActivities(destination.lat, destination.lng, token)
                .catch((e: Error) => { console.error("Amadeus Activities:", e.message); return [] as ActivityOption[]; })
            : Promise.resolve([] as ActivityOption[]),
        ]);

        // Travelpayouts fallback if Duffel returned nothing
        let flights = duffelFlights;
        if (flights.length === 0 && origin && destination && TRAVELPAYOUTS_TOKEN) {
          flights = await fetchFlightsTravelpayouts(
            origin.iataCode, destination.iataCode, dates[0], form.travelers, form.kids,
          ).catch((e: Error) => { console.error("Travelpayouts:", e.message); return [] as RoundTripOption[]; });
          if (flights.length > 0) console.log(`Travelpayouts fallback: ${flights.length} options`);
        }

        // Cache flight routes (fire & forget)
        for (const f of flights) {
          const seg0 = f.outSlice.segments[0];
          const dm = f.outSlice.totalDuration.match(/(?:(\d+)h)?\s*(?:(\d+)m)?/);
          const durationMin = dm ? (Number(dm[1] ?? 0) * 60 + Number(dm[2] ?? 0)) || null : null;
          supabase.from("flight_routes").insert({
            airline_iata: seg0.airlineIata.slice(0, 2) || null,
            airline_name: seg0.airline,
            origin_iata: origin!.iataCode.slice(0, 3),
            destination_iata: destination!.iataCode.slice(0, 3),
            typical_duration_min: durationMin,
            typical_stops: f.outSlice.stops,
            active: true,
            last_verified: new Date().toISOString(),
          }).then(() => {}).catch(() => {});
        }

        real = { origin, destination, flights, hotels, poi, activities };
        console.log(`Real data: ${flights.length} flights, ${hotels.length} hotels, ${poi.length} POIs, ${activities.length} activities`);
      } catch (e) {
        console.error("Real data phase failed, AI-only mode:", e);
      }
    }

    // ── Generate itinerary via AI ──────────────────────────────────────────────
    const raw = await callXAI(buildPrompt(form, real));
    const itinerary = parseAIJSON(raw);

    // Canonical overrides (AI formats these inconsistently)
    itinerary.comfort_level = form.comfort_level;
    itinerary.comfort_level_name = COMFORT_NAMES[form.comfort_level - 1] ?? "Balanced";
    itinerary.comfort_level_emoji = COMFORT_EMOJIS[form.comfort_level - 1] ?? "⚖️";

    // Override flight/hotel totals with real API values (never let AI hallucinate these)
    if (real?.flights?.length) {
      const bf = real.flights[0];
      (itinerary as any).flights = {
        outbound: `${form.departure_city} → ${form.destination_city}`,
        return: `${form.destination_city} → ${form.departure_city}`,
        total_cost: bf.totalPrice,
      };
    }
    if (real?.hotels?.length) {
      const bh = real.hotels[0];
      (itinerary as any).accommodation = {
        name: bh.name,
        nights: bh.nights,
        total_cost: bh.totalPrice,
      };
    }

    // Post-process: inject flight/hotel cards, create bond pairs, resolve images
    const dailyItinerary = itinerary.daily_itinerary as any[];
    if (Array.isArray(dailyItinerary)) {
      postProcessItinerary(dailyItinerary, real, form);
    }

    // Pick best activity image as trip thumbnail
    if (!itinerary.thumbnail_url && Array.isArray(dailyItinerary)) {
      const preferredTypes = ["sightseeing", "activity", "shopping", "cafe", "dining", "accommodation"];
      outer: for (const type of preferredTypes) {
        for (const day of dailyItinerary) {
          for (const act of (day.activities ?? [])) {
            if (act.type === type && act.image_url?.startsWith("http")) {
              itinerary.thumbnail_url = act.image_url;
              break outer;
            }
          }
        }
      }
    }
    if (!itinerary.thumbnail_url) {
      itinerary.thumbnail_url = FALLBACK_IMAGES.sightseeing;
    }

    // ── Write result ───────────────────────────────────────────────────────────
    if (requestId) {
      const { error } = await supabase
        .from("itinerary_requests")
        .update({ status: "completed", result: itinerary, updated_at: new Date().toISOString() })
        .eq("id", requestId);
      if (error) console.error("DB update failed:", error.message);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(itinerary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Generation failed:", err);
    if (requestId) {
      await supabase
        .from("itinerary_requests")
        .update({ status: "error", error_message: err instanceof Error ? err.message : "Unknown error" })
        .eq("id", requestId)
        .catch(() => {});
    }
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Failed to generate itinerary" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
