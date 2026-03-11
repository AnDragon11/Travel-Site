# DiaryTrips — Feature Roadmap
## NOTES
- **When a feature is implemented**, it should be deleted automatically here, no confirmation needed
- **When a feature is crossed out**, it means it means it needs to be added in the next code execution
- **When a feature is NOT crossed out**, it means it is a good idea that would be executed in the future, it should not be considered for now
- **When only bugs are fixed AND/OR 1-2 partially done features**, version is added by 0.0.1
- **When 3+ partially done features AND/OR new features are added**, version is added by 0.1.0
- **Always** leave the headings along with one "- [ ] " each under it, even if it is empty 

---

## Bugs

### Trip Builder
- [ ] 
### Android App
- [ ] Header is misplaced -- On my phone, the header is on top of the notification bar, causing it to move back and forth between the notifications and its supposed place!
---

## Partially Done

### TripBuilder
- [ ] **Per-day cost total** — show a running cost total beneath each day column (sum of all activity costs for that day)
- [ ] **Time gap warnings** — highlight activities that overlap in time or leave no buffer between events
- [ ] **Day duration bar** — visual indicator showing how many hours of the day are scheduled vs free
- [ ] **Trip summary overhaul again** -- make things simpler that take less space
- [ ]

---

## New Ideas

### Trip Builder
- [ ] **Jump-to-day** — click a day number and the canvas scrolls to it instantly
- [ ] **Mini-map / scroll indicator** — small fixed progress indicator showing current position on long trips (e.g. "Day 3 of 10")
- [ ] **Zoom / compact view** — collapse cards to a thin timeline strip for a bird's-eye view of long trips
- [ ] **Duplicate a whole day** — copy all activities from one day into a new day
- [ ] **Bulk time shift** — drag one activity's time and offer to shift all subsequent activities on that day by the same delta
- [ ] **Activity templates** — save a reusable card (e.g. "airport transfer") to drop into any day
- [ ] **Swap two activities** — right-click / long-press option to swap positions with another card
- [ ] **Budget cap input** — set a total budget; running total turns red when exceeded
- [ ] **Cost breakdown chart** — pie/bar showing flights / accommodation / dining / activities split. In trip summary
- [ ] **Per-person vs total cost toggle** — quick toggle to see group total without manual math
- [ ] **"Free time" gap cards** — auto-insert a visual card showing unscheduled hours between activities
- [ ] **Travel time between activities** — show estimated transit time between locations inline on cards
- [ ] **Trip notes field** — freeform trip-level notes for visa reminders, emergency contacts, currency tips
- [ ] **Print / share clean view** — read-only compact layout of the itinerary, shareable as link or screenshot
### Explore & Social
- [ ] Copy single activity from someone else's trip into your own
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
- [ ] **Group sub-itineraries — each collaborator manages their own flights from different origins and personal activity preferences**

### AI & Generation
- [ ]
- [ ] AI activity suggestions inline — "suggest 3 alternatives to this activity"
- [ ] Natural language trip editing — "move the Louvre to Day 2 morning"
- [ ] Packing list generation — based on destination, weather, activities, duration
- [ ] Visa & entry requirements surfaced as a structured field (already in AI prompt, not shown in UI)

### Trip Diary (Post-Trip)
- [ ] **Photo upload per activity (field exists, no upload UI)**
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
