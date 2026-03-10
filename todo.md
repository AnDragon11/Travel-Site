# DiaryTrips — Feature Roadmap

---

## Bugs

### Trip Builder
### Android App
- [ ] Header is misplaced -- On my phone, the header is on top of the notification bar, causing it to move back and forth between the notifications and its supposed place!
---

## Partially Done

### TripBuilder
- [ ] **Auto-sync flight arrival** — when editing a departure card, sync airline/flight number/class/luggage to its bonded arrival card live
- [ ] **Move bonded cards together** — when moving a hotel check-in or flight departure to a different day, prompt to also move the bonded checkout/arrival (or warn that the bond will break)
- [ ] **Auto-sort by time** — after editing or dropping an activity, re-sort activities within that day by their time field
- [ ] **Per-day cost total** — show a running cost total beneath each day column (sum of all activity costs for that day)
- [ ] **Time gap warnings** — highlight activities that overlap in time or leave no buffer between events
- [ ] **Day duration bar** — visual indicator showing how many hours of the day are scheduled vs free
- [ ] **Activity tags on canvas** — small keyword chips on the activity card (e.g. "must-book", "optional") visible without opening the dialog

---

## New Ideas

### TripBuilder
- [ ] Overview, voting and expenses overhaul -- All should be on the same interaction bundle. Ideally below the banner. A bit more visible than the current overview dropdown menu button. The overview itself should look much nicer. Something very similar to what the PDF would do. Keep icons such as airplanes and hotels! Since they would also have the expenses listed, that is where the split expenses comes in! The users are listed on top as a table. This is where we would know each person's expenses.

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
