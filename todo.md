# DiaryTrips — Feature Roadmap

---

## Bugs
### Android App
- [ ] Header is misplaced -- On my phone, the header is on top of the notification bar, causing it to move back and forth between the notifications and its supposed place!
---

## Partially Done

---

## New Ideas

### TripBuilder
- [ ] Tags on activities — tags exist on trips; per-activity tags would enable filtering the snake view

### Explore & Social
- [ ] Copy single activity from someone else's trip into your own
- [ ] Feed filter — show only trips from people you follow
- [ ] Algorithmic suggestions based on travel history
- [ ] Trending destinations widget (aggregate most-planned destinations)
- [ ] Comments on public trips
- [ ] "Inspired by" attribution — when copying a trip, original creator gets credit
- [ ] Seasonal filters — "trips good for December"
- [ ] Destination pages — aggregated public trips per city, average costs, best time to visit

### Profile
- [ ] "I've been here" map — TripMap component exists; wire to profile using past trip destinations
- [ ] Photo gallery UI — `photos: string[]` stored on trips/activities but no upload or display UI

### Group Travel
- [ ] Group sub-itineraries — each collaborator manages their own flights from different origins and personal activity preferences

### AI & Generation
- [ ] Phase 2 real API integration — Duffel (flights), Amadeus (hotels + POIs)
- [ ] Re-generate a single day — keep rest of trip, ask AI to redo just Day N
- [ ] AI activity suggestions inline — "suggest 3 alternatives to this activity"
- [ ] Natural language trip editing — "move the Louvre to Day 2 morning"
- [ ] Packing list generation — based on destination, weather, activities, duration
- [ ] Visa & entry requirements surfaced as a structured field (already in AI prompt, not shown in UI)

### Trip Diary (Post-Trip)
- [ ] Photo upload per activity (field exists, no upload UI)
- [ ] Star rating per activity visited
- [ ] "Did you do this?" checklist mode for during the trip
- [ ] Memory book / PDF export of completed diary with photos

### Rewards System
- [ ] Track how many times each trip has been copied
- [ ] Convert copies into discount credits for future AI generations
- [ ] Leaderboard of most-copied trips / users

### Mobile
- [ ] Offline mode — cache current trip in IndexedDB for no-connection access
- [ ] Push notifications for trip reminders ("Your flight is tomorrow")
- [ ] Share to Instagram / WhatsApp as a trip summary card

### Discovery
- [ ] "Trips like this" recommendations on TripBuilder after AI generation
- [ ] Destination pages — aggregated public trips per city, average costs, best time to visit
- [ ] Seasonal filters — "trips good for December", derived from dates on public trips
