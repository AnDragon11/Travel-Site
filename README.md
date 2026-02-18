# AI Travel Agency

An AI-powered travel planning platform and social media site where users can create, share, and discover trip itineraries. Sometimes described as *"the Instagram of travel."*

## What It Does

- **AI Trip Planning** — Enter your destination, budget, and preferences; the AI generates a full itinerary covering flights, accommodation, activities, food, visas, weather, and more.
- **Trip Diary** — Log past trips with reviews, photos, and notes. Stored locally for guests, synced to the cloud for signed-in users.
- **Bucket List** — Save future trips and planned itineraries. Collaborate with others on group trips.
- **Explore Page** — Browse public trips from other travelers, copy itineraries, and get inspired. Popular itinerary creators earn discounts on future bookings.

## Tech Stack

- **Frontend** — React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Auth & Database** — Supabase
- **Maps** — Leaflet / React Leaflet
- **Backend** — n8n workflow (handles AI orchestration, flight/hotel/activity APIs)

## Getting Started

```sh
# Clone the repo
git clone <YOUR_GIT_URL>
cd Travel-Site

# Install dependencies
npm install

# Start the dev server
npm run dev
```

### Other Commands

```sh
npm run build      # Production build
npm run lint       # Run ESLint
npm run test       # Run tests (Vitest)
```

## How the AI Works

When a user submits trip details, the frontend sends a request to an n8n backend workflow which queries multiple APIs to evaluate:

- **Flights** — Finds options within budget, including potential layover destinations worth exploring
- **Accommodation** — Compares hotels by price, location, and inclusions (breakfast, all-inclusive, etc.)
- **Activities** — Suggests popular and underrated things to do based on user preferences and energy levels
- **Logistics** — Checks visa requirements, weather forecasts, and travel distances between locations
- **Overall Fit** — Evaluates whether the full itinerary makes sense within the budget and timeframe

Results are returned as structured JSON itineraries that users can view, edit, and rearrange.

## Privacy

Trip visibility defaults to **friends only** (mutual followers). Users can change any trip to public or private at any time, including past diary entries and future bucket list plans.
