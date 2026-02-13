# Map Feature Installation Instructions

The interactive map feature on the My Trips page requires the following packages:

## Install Required Packages

Run the following command in your terminal:

```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

Or if you're using yarn:

```bash
yarn add leaflet react-leaflet
yarn add -D @types/leaflet
```

Or if you're using pnpm:

```bash
pnpm add leaflet react-leaflet
pnpm add -D @types/leaflet
```

## What This Adds

The map feature adds an interactive world map to the My Trips page with:

### Color-Coded Markers

- **Blue markers** - Past trips (trips with end dates before today)
- **Yellow/Gold markers** - Upcoming trips (trips with start dates in the future)
- **Green markers** - Bucket list trips (future trips without specific dates)

### Features

- Click markers to see trip details in a popup
- Map automatically zooms to fit all your trip markers
- Toggle the map on/off with the "Show/Hide Map" button
- Legend showing what each color means
- Responsive design that works on mobile and desktop

### Supported Destinations

The map includes coordinates for 50+ popular destinations worldwide including:
- Major European cities (Paris, London, Rome, Barcelona, etc.)
- Asian destinations (Tokyo, Bangkok, Bali, Dubai, etc.)
- American cities (New York, Los Angeles, Miami, etc.)
- Australian/New Zealand locations
- African and Middle Eastern cities

If a destination isn't recognized, it simply won't appear on the map (the trip will still show in the list).

## Adding More Destinations

To add more cities to the map, edit `/src/lib/coordinates.ts` and add entries to the `cityCoordinates` object:

```typescript
"Your City, Country": { lat: LATITUDE, lng: LONGITUDE },
```

## Note

The map uses OpenStreetMap tiles which are free and don't require an API key. In the future, you can integrate a geocoding API (like Google Maps Geocoding) to automatically convert any destination to coordinates.
