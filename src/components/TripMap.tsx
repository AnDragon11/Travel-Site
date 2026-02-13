import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon, LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { SavedTrip } from "@/lib/tripTypes";
import { getCoordinates } from "@/lib/coordinates";

interface TripMapProps {
  trips: SavedTrip[];
  className?: string;
}

// Helper to check if trip is in the past
const isTripPast = (trip: SavedTrip): boolean => {
  if (!trip.days.length) return false;
  const lastDate = trip.days[trip.days.length - 1]?.date;
  if (!lastDate) return false;

  try {
    const tripDate = new Date(lastDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tripDate < today;
  } catch {
    return false;
  }
};

// Helper to check if trip has dates (is upcoming) vs bucket list (no dates/future planning)
const isTripUpcoming = (trip: SavedTrip): boolean => {
  if (!trip.days.length) return false;
  const firstDate = trip.days[0]?.date;
  if (!firstDate) return false; // No date = bucket list

  try {
    const tripDate = new Date(firstDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tripDate >= today;
  } catch {
    return false;
  }
};

// Create custom marker icons
const createMarkerIcon = (color: string) => {
  const svgIcon = `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z" fill="${color}"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>
  `;

  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svgIcon)}`,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });
};

const pastIcon = createMarkerIcon("#3b82f6"); // Blue
const upcomingIcon = createMarkerIcon("#eab308"); // Yellow/Gold
const bucketIcon = createMarkerIcon("#22c55e"); // Green

// Component to fit map bounds to markers
const FitBounds = ({ positions }: { positions: LatLngExpression[] }) => {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      const bounds = positions.map(pos => pos as [number, number]);
      if (bounds.length === 1) {
        map.setView(bounds[0], 6);
      } else {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [positions, map]);

  return null;
};

const TripMap = ({ trips, className = "" }: TripMapProps) => {
  // Map trips to coordinates
  const tripMarkers = trips
    .map(trip => {
      const coords = getCoordinates(trip.destination);
      if (!coords) return null;

      const isPast = isTripPast(trip);
      const isUpcoming = !isPast && isTripUpcoming(trip);
      const isBucket = !isPast && !isUpcoming; // Has no date or far future

      return {
        trip,
        coords,
        icon: isPast ? pastIcon : isUpcoming ? upcomingIcon : bucketIcon,
        type: isPast ? "past" : isUpcoming ? "upcoming" : "bucket",
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (tripMarkers.length === 0) {
    return (
      <div className={`bg-muted/30 rounded-xl border-2 border-dashed border-border flex items-center justify-center min-h-[200px] ${className}`}>
        <div className="text-center p-6 sm:p-8">
          <p className="text-sm sm:text-base text-muted-foreground">
            No trips to display on map yet
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2">
            Add destinations to see them here!
          </p>
        </div>
      </div>
    );
  }

  const positions = tripMarkers.map(m => [m.coords.lat, m.coords.lng] as LatLngExpression);
  const center = positions[0] as [number, number];

  return (
    <div className={className}>
      <div className="mb-4 flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm justify-center sm:justify-start">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-blue-500"></div>
          <span className="text-muted-foreground">Past Trips</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-yellow-500"></div>
          <span className="text-muted-foreground">Upcoming Trips</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-green-500"></div>
          <span className="text-muted-foreground">Bucket List</span>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-border shadow-md h-[300px] sm:h-[350px] md:h-[400px]">
        <MapContainer
          center={center}
          zoom={6}
          className="h-full w-full"
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {tripMarkers.map((marker, index) => (
            <Marker
              key={`${marker.trip.id}-${index}`}
              position={[marker.coords.lat, marker.coords.lng]}
              icon={marker.icon}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-sm mb-1">{marker.trip.title}</h3>
                  <p className="text-xs text-gray-600 mb-1">{marker.trip.destination}</p>
                  <p className="text-xs">
                    {marker.trip.days.length} day{marker.trip.days.length !== 1 ? 's' : ''} •
                    {marker.trip.travelers} traveler{marker.trip.travelers !== 1 ? 's' : ''}
                  </p>
                  {marker.trip.days[0]?.date && (
                    <p className="text-xs text-gray-500 mt-1">
                      {marker.type === "past" ? "Visited: " : "Starts: "}{marker.trip.days[0].date}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          <FitBounds positions={positions} />
        </MapContainer>
      </div>
    </div>
  );
};

export default TripMap;
