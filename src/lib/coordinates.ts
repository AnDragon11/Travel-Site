// Common city coordinates for mapping destinations
// In a production app, this would use a geocoding API

export interface Coordinates {
  lat: number;
  lng: number;
}

const cityCoordinates: Record<string, Coordinates> = {
  // Europe
  "Paris, France": { lat: 48.8566, lng: 2.3522 },
  "London, UK": { lat: 51.5074, lng: -0.1278 },
  "Rome, Italy": { lat: 41.9028, lng: 12.4964 },
  "Barcelona, Spain": { lat: 41.3851, lng: 2.1734 },
  "Amsterdam, Netherlands": { lat: 52.3676, lng: 4.9041 },
  "Berlin, Germany": { lat: 52.5200, lng: 13.4050 },
  "Prague, Czech Republic": { lat: 50.0755, lng: 14.4378 },
  "Vienna, Austria": { lat: 48.2082, lng: 16.3738 },
  "Athens, Greece": { lat: 37.9838, lng: 23.7275 },
  "Lisbon, Portugal": { lat: 38.7223, lng: -9.1393 },

  // Asia
  "Tokyo, Japan": { lat: 35.6762, lng: 139.6503 },
  "Kyoto, Japan": { lat: 35.0116, lng: 135.7681 },
  "Seoul, South Korea": { lat: 37.5665, lng: 126.9780 },
  "Bangkok, Thailand": { lat: 13.7563, lng: 100.5018 },
  "Singapore": { lat: 1.3521, lng: 103.8198 },
  "Hong Kong": { lat: 22.3193, lng: 114.1694 },
  "Bali, Indonesia": { lat: -8.3405, lng: 115.0920 },
  "Dubai, UAE": { lat: 25.2048, lng: 55.2708 },
  "Mumbai, India": { lat: 19.0760, lng: 72.8777 },
  "Delhi, India": { lat: 28.6139, lng: 77.2090 },

  // Americas
  "New York, USA": { lat: 40.7128, lng: -74.0060 },
  "Los Angeles, USA": { lat: 34.0522, lng: -118.2437 },
  "San Francisco, USA": { lat: 37.7749, lng: -122.4194 },
  "Miami, USA": { lat: 25.7617, lng: -80.1918 },
  "Chicago, USA": { lat: 41.8781, lng: -87.6298 },
  "Las Vegas, USA": { lat: 36.1699, lng: -115.1398 },
  "Toronto, Canada": { lat: 43.6532, lng: -79.3832 },
  "Vancouver, Canada": { lat: 49.2827, lng: -123.1207 },
  "Mexico City, Mexico": { lat: 19.4326, lng: -99.1332 },
  "Rio de Janeiro, Brazil": { lat: -22.9068, lng: -43.1729 },
  "Buenos Aires, Argentina": { lat: -34.6037, lng: -58.3816 },

  // Oceania
  "Sydney, Australia": { lat: -33.8688, lng: 151.2093 },
  "Melbourne, Australia": { lat: -37.8136, lng: 144.9631 },
  "Auckland, New Zealand": { lat: -36.8485, lng: 174.7633 },

  // Africa & Middle East
  "Cairo, Egypt": { lat: 30.0444, lng: 31.2357 },
  "Cape Town, South Africa": { lat: -33.9249, lng: 18.4241 },
  "Marrakech, Morocco": { lat: 31.6295, lng: -7.9811 },
  "Istanbul, Turkey": { lat: 41.0082, lng: 28.9784 },

  // Nordic Countries
  "Reykjavik, Iceland": { lat: 64.1466, lng: -21.9426 },
  "Copenhagen, Denmark": { lat: 55.6761, lng: 12.5683 },
  "Stockholm, Sweden": { lat: 59.3293, lng: 18.0686 },
  "Oslo, Norway": { lat: 59.9139, lng: 10.7522 },
};

/**
 * Get coordinates for a destination string.
 * Returns null if not found in the database.
 */
export const getCoordinates = (destination: string): Coordinates | null => {
  // Try exact match first
  if (cityCoordinates[destination]) {
    return cityCoordinates[destination];
  }

  // Try partial match (e.g., "Paris" matches "Paris, France")
  const partialMatch = Object.keys(cityCoordinates).find(key =>
    key.toLowerCase().includes(destination.toLowerCase()) ||
    destination.toLowerCase().includes(key.toLowerCase())
  );

  if (partialMatch) {
    return cityCoordinates[partialMatch];
  }

  return null;
};

/**
 * Get all coordinates for a list of destinations
 */
export const getMultipleCoordinates = (destinations: string[]): Array<{ destination: string; coords: Coordinates }> => {
  return destinations
    .map(dest => ({ destination: dest, coords: getCoordinates(dest) }))
    .filter((item): item is { destination: string; coords: Coordinates } => item.coords !== null);
};
