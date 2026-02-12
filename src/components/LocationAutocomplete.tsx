import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { popularLocations, type Location } from "@/data/locations";

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  autoDetect?: boolean;
  className?: string;
}

const LocationAutocomplete = ({
  value,
  onChange,
  placeholder = "Enter a city or country",
  id,
  autoDetect = false,
  className,
}: LocationAutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Removed auto-detect on mount - now only triggers on button click

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const detectLocation = async () => {
    setIsDetecting(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: false,
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Use reverse geocoding API (free service)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      
      if (response.ok) {
        const data = await response.json();
        const cityName = data.city || data.locality || data.principalSubdivision;
        const countryName = data.countryName;
        
        if (cityName && countryName) {
          onChange(`${cityName}, ${countryName}`);
        }
      }
    } catch (error) {
      console.log("Location detection failed:", error);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    
    if (inputValue.length > 0) {
      const filtered = popularLocations.filter(
        (loc) =>
          loc.city.toLowerCase().includes(inputValue.toLowerCase()) ||
          loc.country.toLowerCase().includes(inputValue.toLowerCase()) ||
          loc.display.toLowerCase().includes(inputValue.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 10));
      setIsOpen(true);
    } else {
      setSuggestions(popularLocations.slice(0, 8));
      setIsOpen(false);
    }
  };

  const handleFocus = () => {
    if (value.length === 0) {
      setSuggestions(popularLocations.slice(0, 8));
    } else {
      handleInputChange(value);
    }
    setIsOpen(true);
  };

  const handleSelect = (location: Location) => {
    onChange(location.display);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          className="h-12 text-base pr-10"
          autoComplete="off"
        />
        {isDetecting ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
        ) : autoDetect && !value ? (
          <button
            type="button"
            onClick={detectLocation}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
            title="Detect my location"
          >
            <MapPin className="w-5 h-5" />
          </button>
        ) : null}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-fade-in bottom-full mb-2 md:bottom-auto md:top-full md:mb-0 md:mt-1">
          <ul className="py-1 max-h-48 md:max-h-64 overflow-y-auto">
            {suggestions.map((location, index) => (
              <li key={`${location.city}-${location.countryCode}-${index}`}>
                <button
                  type="button"
                  onClick={() => handleSelect(location)}
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 flex items-center gap-2 md:gap-3 hover:bg-accent transition-colors text-left"
                >
                  <span className="text-lg md:text-xl">{location.flag}</span>
                  <div className="truncate">
                    <span className="font-medium text-foreground text-sm md:text-base">{location.city}</span>
                    <span className="text-muted-foreground text-sm md:text-base">, {location.country}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;