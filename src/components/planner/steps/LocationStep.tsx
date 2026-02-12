import { Plane, MapPin, ArrowRight, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import LocationAutocomplete from "@/components/LocationAutocomplete";

interface LocationStepProps {
  departureCity: string;
  destinationCity: string;
  onDepartureChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onNext: () => void;
  isSubmitting: boolean;
}

const LocationStep = ({
  departureCity,
  destinationCity,
  onDepartureChange,
  onDestinationChange,
  onNext,
  isSubmitting,
}: LocationStepProps) => {
  const isValid = departureCity.trim().length > 0 && destinationCity.trim().length > 0;

  return (
    <div className="space-y-8 text-center">
      <div>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          Where would you like to go?
        </h2>
        <p className="text-muted-foreground">
          Tell us your starting point and dream destination
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-3">
        <div className="space-y-2 text-left">
          <Label htmlFor="departure" className="text-sm font-semibold flex items-center gap-2">
            <Plane className="w-4 h-4 text-primary" />
            Departing from
          </Label>
          <LocationAutocomplete
            id="departure"
            placeholder="e.g., New York, USA"
            value={departureCity}
            onChange={onDepartureChange}
            autoDetect={true}
            className="h-14 text-lg"
          />
        </div>

        <div className="flex justify-center py-1">
          <ArrowRight className="w-5 h-5 text-muted-foreground/50 rotate-90" />
        </div>

        <div className="space-y-2 text-left">
          <Label htmlFor="destination" className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Destination
          </Label>
          <LocationAutocomplete
            id="destination"
            placeholder="e.g., Barcelona, Spain"
            value={destinationCity}
            onChange={onDestinationChange}
            className="h-14 text-lg"
          />
        </div>
      </div>

      <Button
        onClick={onNext}
        disabled={!isValid || isSubmitting}
        size="lg"
        className="h-14 px-8 text-lg font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 hover:shadow-glow disabled:opacity-50"
      >
        {isSubmitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            Continue
            <ArrowRight className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
};

export default LocationStep;
