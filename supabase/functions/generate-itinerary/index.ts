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
// Use test.api.amadeus.com for test keys, api.amadeus.com for production
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
  iataCode: string;
  cityName: string;
  countryCode: string;
  countryName: string;
  lat: number;
  lng: number;
}

interface RoundTripOption {
  label: string;           // A, B, C …
  outAirline: string;
  outFlightNo: string;
  outDepartAt: string;     // ISO datetime
  outArriveAt: string;
  outDuration: string;
  outStops: number;
  retAirline: string;
  retFlightNo: string;
  retDepartAt: string;
  retArriveAt: string;
  retDuration: string;
  retStops: number;
  pricePerPerson: number;
  currency: string;
}

interface HotelOption {
  label: string;
  name: string;
  stars: number;
  pricePerNight: number;
  currency: string;
  address: string;
  hotelId: string;
}

interface RealData {
  origin: ResolvedCity | null;
  destination: ResolvedCity | null;
  flights: RoundTripOption[];
  hotels: HotelOption[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COMFORT_NAMES = ["Budget", "Economy", "Standard", "Premium", "Luxury"];
const COMFORT_EMOJIS = ["🎒", "💼", "⭐", "✨", "👑"];

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
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
  } catch { return iso.slice(11, 16); }
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  } catch { return iso.slice(0, 10); }
}

// ─── Amadeus ──────────────────────────────────────────────────────────────────

async function amadeusToken(): Promise<string> {
  const r = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${AMADEUS_CLIENT_ID}&client_secret=${AMADEUS_CLIENT_SECRET}`,
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
    .select("iata_code, name, country_code, country_name, latitude, longitude")
    .ilike("name", cityName)
    .maybeSingle();

  if (cached?.iata_code) {
    return {
      iataCode: cached.iata_code.trim(),
      cityName: cached.name,
      countryCode: (cached.country_code ?? "").trim(),
      countryName: cached.country_name ?? "",
      lat: Number(cached.latitude),
      lng: Number(cached.longitude),
    };
  }

  // Amadeus City search
  const r = await fetch(
    `${AMADEUS_BASE}/v1/reference-data/locations?subType=CITY&keyword=${encodeURIComponent(cityName)}&page[limit]=3`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) return null;
  const { data } = await r.json();
  if (!data?.length) return null;

  const loc = data[0];
  const resolved: ResolvedCity = {
    iataCode: loc.iataCode,
    cityName: loc.address?.cityName ?? cityName,
    countryCode: loc.address?.countryCode ?? "",
    countryName: loc.address?.countryName ?? "",
    lat: loc.geoCode?.latitude ?? 0,
    lng: loc.geoCode?.longitude ?? 0,
  };

  // Cache (fire & forget — don't block on failures)
  supabase.from("destinations").insert({
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
  }).then(() => {}).catch(() => {});

  return resolved;
}

async function fetchHotels(
  cityCode: string,
  destCountryCode: string,
  checkin: string,
  checkout: string,
  adults: number,
  comfortLevel: number,
  token: string,
  supabase: ReturnType<typeof createClient>,
): Promise<HotelOption[]> {
  // Step 1 — hotel list by city code
  const listR = await fetch(
    `${AMADEUS_BASE}/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}&ratings=${starRatings(comfortLevel)}&hotelSource=ALL`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!listR.ok) return [];
  const { data: hotelList } = await listR.json();
  if (!hotelList?.length) return [];

  const hotelIds = hotelList.slice(0, 25).map((h: any) => h.hotelId).join(",");

  // Step 2 — get live offers for those hotels
  const offR = await fetch(
    `${AMADEUS_BASE}/v3/shopping/hotel-offers?hotelIds=${hotelIds}&adults=${adults}&checkInDate=${checkin}&checkOutDate=${checkout}&roomQuantity=1&currency=USD&bestRateOnly=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!offR.ok) return [];
  const { data: offerData } = await offR.json();
  if (!offerData?.length) return [];

  const labels = ["A", "B", "C", "D", "E"];
  const options: HotelOption[] = offerData
    .filter((h: any) => h.offers?.[0]?.price?.total)
    .sort((a: any, b: any) => Number(a.offers[0].price.total) - Number(b.offers[0].price.total))
    .slice(0, 5)
    .map((h: any, i: number) => {
      const offer = h.offers[0];
      const hotel: HotelOption = {
        label: labels[i],
        name: h.hotel.name,
        stars: Math.min(5, Math.max(1, Number(h.hotel.rating) || comfortLevel + 1)),
        pricePerNight: Number(offer.price.total),
        currency: offer.price.currency ?? "USD",
        address: h.hotel.address?.lines?.[0] ?? cityCode,
        hotelId: h.hotel.hotelId,
      };

      // Cache hotel (fire & forget)
      supabase.from("hotels").insert({
        provider_id: hotel.hotelId,
        provider: "amadeus",
        name: hotel.name,
        city: cityCode,
        country_code: destCountryCode.slice(0, 2),
        star_rating: hotel.stars,
        address: hotel.address,
        active: true,
        last_verified: new Date().toISOString(),
      }).then(() => {}).catch(() => {});

      return hotel;
    });

  return options;
}

// ─── Duffel ───────────────────────────────────────────────────────────────────

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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

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
          cabin_class: cabinClass(comfortLevel),
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

  const labels = ["A", "B", "C", "D", "E"];
  return offers
    .filter((o: any) => o.total_amount && o.slices?.length === 2)
    .sort((a: any, b: any) => Number(a.total_amount) - Number(b.total_amount))
    .slice(0, 5)
    .map((o: any, i: number): RoundTripOption => {
      const [outSlice, retSlice] = o.slices;
      const outSeg0 = outSlice.segments[0];
      const outSegN = outSlice.segments[outSlice.segments.length - 1];
      const retSeg0 = retSlice.segments[0];
      const retSegN = retSlice.segments[retSlice.segments.length - 1];
      const totalPax = adults + kids;
      return {
        label: labels[i],
        outAirline: outSeg0.operating_carrier?.name ?? outSeg0.marketing_carrier?.name ?? "Unknown",
        outFlightNo: `${outSeg0.operating_carrier?.iata_code ?? ""}${outSeg0.operating_carrier_flight_number ?? ""}`,
        outDepartAt: outSeg0.departing_at,
        outArriveAt: outSegN.arriving_at,
        outDuration: isoToDuration(outSlice.duration ?? ""),
        outStops: outSlice.segments.length - 1,
        retAirline: retSeg0.operating_carrier?.name ?? retSeg0.marketing_carrier?.name ?? "Unknown",
        retFlightNo: `${retSeg0.operating_carrier?.iata_code ?? ""}${retSeg0.operating_carrier_flight_number ?? ""}`,
        retDepartAt: retSeg0.departing_at,
        retArriveAt: retSegN.arriving_at,
        retDuration: isoToDuration(retSlice.duration ?? ""),
        retStops: retSlice.segments.length - 1,
        pricePerPerson: Number(o.total_amount) / totalPax,
        currency: o.total_currency,
      };
    });
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function flightLine(f: RoundTripOption, totalPax: number): string {
  const stop = (n: number) => n === 0 ? "non-stop" : `${n} stop${n > 1 ? "s" : ""}`;
  const total = (f.pricePerPerson * totalPax).toFixed(0);
  return [
    `  ${f.label}) OUT  ${f.outAirline} ${f.outFlightNo}: ${fmtDate(f.outDepartAt)} ${fmtTime(f.outDepartAt)}→${fmtTime(f.outArriveAt)}, ${f.outDuration} ${stop(f.outStops)}`,
    `     RET  ${f.retAirline} ${f.retFlightNo}: ${fmtDate(f.retDepartAt)} ${fmtTime(f.retDepartAt)}→${fmtTime(f.retArriveAt)}, ${f.retDuration} ${stop(f.retStops)}`,
    `     PRICE  $${f.pricePerPerson.toFixed(0)}/person ($${total} total)`,
  ].join("\n");
}

function hotelLine(h: HotelOption): string {
  return `  ${h.label}) ${h.name} (${"★".repeat(h.stars)}): $${h.pricePerNight.toFixed(0)}/night — ${h.address}`;
}

function buildPrompt(form: TripFormData, real: RealData | null): string {
  const dates = tripDays(form);
  const numDays = dates.length;
  const nights = numDays - 1;
  const comfortName = COMFORT_NAMES[form.comfort_level - 1] ?? "Standard";
  const comfortEmoji = COMFORT_EMOJIS[form.comfort_level - 1] ?? "⭐";
  const prefs = form.preferences.length > 0 ? form.preferences.join(", ") : "general sightseeing";
  const kidsNote = form.kids > 0 ? `\n- Kids: ${form.kids} (include kid-friendly activities)` : "";
  const totalPax = form.travelers + form.kids;

  let realSection = "";
  if (real && (real.flights.length > 0 || real.hotels.length > 0)) {
    const parts: string[] = ["\n═══ REAL API DATA — use these exact values ═══"];

    if (real.flights.length > 0) {
      parts.push(`\nFLIGHT OPTIONS (choose ONE letter — that selects BOTH the outbound AND return leg):`);
      parts.push(...real.flights.map(f => flightLine(f, totalPax)));
      parts.push(`\nIn the itinerary JSON, use the EXACT airline name, flight number, and departure/arrival times from your chosen option.`);
    }

    if (real.hotels.length > 0) {
      parts.push(`\nHOTEL OPTIONS (choose ONE for the ${nights} nights):`);
      parts.push(...real.hotels.map(h => hotelLine(h)));
      parts.push(`\nUse the EXACT hotel name and nightly price from your chosen option.`);
    }

    realSection = parts.join("\n");
  }

  return `Generate a complete, realistic travel itinerary as JSON.

TRIP:
- Route: ${form.departure_city} → ${form.destination_city} (round trip)
- Dates: ${dates[0]} to ${dates[numDays - 1]} (${numDays} days, ${nights} nights)
- Adults: ${form.travelers}, Group: ${form.group_type}, Comfort: ${form.comfort_level}/5 (${comfortName})
- Interests: ${prefs}, Passport: ${form.passport_country}${kidsNote}
${realSection}

OUTPUT — return ONLY this JSON (no markdown, no explanation):
{
  "destination": "${form.destination_city}",
  "dates": "${dates[0]} - ${dates[numDays - 1]}",
  "travelers": ${form.travelers},
  "comfort_level": ${form.comfort_level},
  "comfort_level_name": "${comfortName}",
  "comfort_level_emoji": "${comfortEmoji}",
  "total_cost": <number — total USD for ALL travelers>,
  "flights": {
    "outbound": "${form.departure_city} → ${form.destination_city}",
    "return": "${form.destination_city} → ${form.departure_city}",
    "total_cost": <number — combined round-trip cost for ALL travelers>
  },
  "accommodation": {
    "name": "<hotel name>",
    "nights": ${nights},
    "total_cost": <number — total for all nights>
  },
  "daily_itinerary": [
    {
      "day": 1,
      "date": "${dates[0]}",
      "theme": "<short theme>",
      "activities": [
        {
          "time": "HH:MM",
          "name": "<name>",
          "type": "<flight|transport|accommodation|dining|sightseeing|activity|shopping|cafe>",
          "duration": "<e.g. 2h 30m>",
          "location": "<venue or place>",
          "cost": <per-person USD, 0 if free>,
          "notes": "<optional>",
          "image_url": "<Unsplash URL or omit>",
          "rating": <0-5 or omit>,
          "booking_url": "<URL or omit>"
        }
      ]
    }
    // ... ${numDays} days total, dates: ${dates.join(" | ")}
  ]
}

RULES:
1. Day 1 MUST start with outbound flight (type "flight") from ${form.departure_city}
2. Day ${numDays} (${dates[numDays - 1]}) MUST end with return flight (type "flight") to ${form.departure_city}
3. Include accommodation check-in day 1 (after flight) and check-out day ${numDays} (before return)
4. 4–6 activities per day, times in 24h HH:MM, strictly increasing each day
5. Costs per-person USD, realistic for ${form.destination_city} at comfort ${form.comfort_level}/5
6. No markdown fences, no text outside the JSON`;
}

// ─── xAI ──────────────────────────────────────────────────────────────────────

async function callXAI(prompt: string): Promise<string> {
  const r = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      messages: [
        { role: "system", content: "You are a travel planning AI. Respond with valid JSON only — no markdown, no prose." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 8000,
      search_parameters: { mode: "auto" },
    }),
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

// ─── Main ──────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let requestId: string | null = null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    requestId = body.requestId ?? null;
    const form: TripFormData = body.formData;
    if (!form) throw new Error("Missing formData");

    console.log(`Trip: ${form.departure_city} → ${form.destination_city} | requestId: ${requestId ?? "none"}`);

    // ── Phase 2: Gather real data ────────────────────────────────────────────
    let real: RealData | null = null;
    const hasAmadeus = !!(AMADEUS_CLIENT_ID && AMADEUS_CLIENT_SECRET);
    const hasDuffel = !!DUFFEL_API_KEY;

    if (hasAmadeus || hasDuffel) {
      try {
        const dates = tripDays(form);

        // Amadeus token (only if needed)
        const token = hasAmadeus ? await amadeusToken() : null;

        // Resolve both cities in parallel
        const [origin, destination] = await Promise.all([
          token ? resolveCity(form.departure_city, token, supabase) : Promise.resolve(null),
          token ? resolveCity(form.destination_city, token, supabase) : Promise.resolve(null),
        ]);
        console.log(`Resolved: ${origin?.iataCode ?? "?"} → ${destination?.iataCode ?? "?"}`);

        // Flights + Hotels in parallel
        const [flights, hotels] = await Promise.all([
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
                token, supabase,
              ).catch((e: Error) => { console.error("Amadeus hotels:", e.message); return [] as HotelOption[]; })
            : Promise.resolve([] as HotelOption[]),
        ]);

        real = { origin, destination, flights, hotels };
        console.log(`Real data: ${flights.length} flight options, ${hotels.length} hotel options`);
      } catch (e) {
        console.error("Real data phase failed, falling back to AI-only:", e);
      }
    }

    // ── Generate itinerary ───────────────────────────────────────────────────
    const raw = await callXAI(buildPrompt(form, real));
    const itinerary = parseAIJSON(raw);

    // Canonical overrides (AI formats these inconsistently)
    itinerary.comfort_level = form.comfort_level;
    itinerary.comfort_level_name = COMFORT_NAMES[form.comfort_level - 1] ?? "Standard";
    itinerary.comfort_level_emoji = COMFORT_EMOJIS[form.comfort_level - 1] ?? "⭐";

    if (!itinerary.thumbnail_url) {
      itinerary.thumbnail_url = `https://source.unsplash.com/featured/1600x900/?${encodeURIComponent(form.destination_city + " travel")}`;
    }

    // ── Write result ─────────────────────────────────────────────────────────
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
