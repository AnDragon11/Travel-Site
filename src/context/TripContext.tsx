import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const STORAGE_KEY = "tripPlanner_tripData";
const EXPIRY_DAYS = 7;

export interface TripFormData {
  departure_city: string;
  destination_city: string;
  start_date: string;
  end_date: string;
  travelers: number;
  preferences: string[];
  passport_country: string;
  group_type: string;
  comfort_level: number;
}

export interface Activity {
  time: string;
  name: string;
  type: string;
  duration: string;
  location: string;
  cost?: number;
  notes?: string;
  booking_url?: string;
  image_url?: string;
  amenities?: string[];
  flight_class?: string;
  rating?: number;
  address?: string;
  phone?: string;
  website?: string;
  confirmation_code?: string;
  provider?: string;
  category?: string;
}

export interface DayItinerary {
  day: number;
  date: string;
  theme: string;
  activities: Activity[];
}

export interface TripItinerary {
  destination: string;
  dates: string;
  travelers: number;
  comfort_level: number;
  comfort_level_name: string;
  comfort_level_emoji: string;
  total_cost: number;
  daily_itinerary: DayItinerary[];
  flights: {
    outbound: string;
    return: string;
    total_cost: number;
  };
  accommodation: {
    name: string;
    nights: number;
    total_cost: number;
  };
}

interface StoredTripData {
  formData: TripFormData | null;
  itinerary: TripItinerary | null;
  savedAt: number;
}

interface TripContextType {
  formData: TripFormData | null;
  setFormData: (data: TripFormData | null) => void;
  itinerary: TripItinerary | null;
  setItinerary: (data: TripItinerary | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  clearTrip: () => void;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

// Load from localStorage with expiry check
const loadFromStorage = (): { formData: TripFormData | null; itinerary: TripItinerary | null } => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { formData: null, itinerary: null };
    
    const data: StoredTripData = JSON.parse(stored);
    const now = Date.now();
    const expiryMs = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    
    // Check if data has expired
    if (now - data.savedAt > expiryMs) {
      localStorage.removeItem(STORAGE_KEY);
      return { formData: null, itinerary: null };
    }
    
    return { formData: data.formData, itinerary: data.itinerary };
  } catch {
    return { formData: null, itinerary: null };
  }
};

// Save to localStorage with timestamp
const saveToStorage = (formData: TripFormData | null, itinerary: TripItinerary | null) => {
  try {
    const data: StoredTripData = {
      formData,
      itinerary,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
};

export const TripProvider = ({ children }: { children: ReactNode }) => {
  const [formData, setFormDataState] = useState<TripFormData | null>(null);
  const [itinerary, setItineraryState] = useState<TripItinerary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Load persisted data on mount
  useEffect(() => {
    const { formData: storedForm, itinerary: storedItinerary } = loadFromStorage();
    if (storedForm) setFormDataState(storedForm);
    if (storedItinerary) setItineraryState(storedItinerary);
    setInitialized(true);
  }, []);

  // Persist whenever data changes (after initial load)
  useEffect(() => {
    if (initialized) {
      saveToStorage(formData, itinerary);
    }
  }, [formData, itinerary, initialized]);

  const setFormData = (data: TripFormData | null) => {
    setFormDataState(data);
  };

  const setItinerary = (data: TripItinerary | null) => {
    setItineraryState(data);
  };

  const clearTrip = () => {
    setFormDataState(null);
    setItineraryState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <TripContext.Provider
      value={{
        formData,
        setFormData,
        itinerary,
        setItinerary,
        isLoading,
        setIsLoading,
        error,
        setError,
        clearTrip,
      }}
    >
      {children}
    </TripContext.Provider>
  );
};

export const useTripContext = () => {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error("useTripContext must be used within a TripProvider");
  }
  return context;
};
