import { Users, ArrowRight, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const groupTypes = [
  { value: "solo", label: "Solo Traveler", emoji: "🧍" },
  { value: "couple", label: "Couple", emoji: "💑" },
  { value: "family", label: "Family", emoji: "👨‍👩‍👧‍👦" },
  { value: "friends", label: "Friends", emoji: "👯" },
  { value: "business", label: "Business", emoji: "💼" },
];

interface TravelersStepProps {
  travelers: number;
  groupType: string;
  onTravelersChange: (count: number) => void;
  onGroupTypeChange: (type: string) => void;
  onNext: () => void;
  isSubmitting: boolean;
}

const TravelersStep = ({
  travelers,
  groupType,
  onTravelersChange,
  onGroupTypeChange,
  onNext,
  isSubmitting,
}: TravelersStepProps) => {
  return (
    <div className="space-y-8 text-center">
      <div>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          Who's traveling?
        </h2>
        <p className="text-muted-foreground">
          Tell us about your travel group
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-8">
        <div className="space-y-4">
          <Label className="text-base font-semibold flex items-center gap-2 justify-center">
            <Users className="w-5 h-5 text-primary" />
            Number of Travelers
          </Label>
          <div className="flex items-center justify-center gap-6">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onTravelersChange(Math.max(1, travelers - 1))}
              className="h-14 w-14 text-2xl rounded-full"
            >
              −
            </Button>
            <span className="text-4xl font-bold w-16 text-center">{travelers}</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onTravelersChange(Math.min(10, travelers + 1))}
              className="h-14 w-14 text-2xl rounded-full"
            >
              +
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-base font-semibold">Group Type</Label>
          <Select value={groupType} onValueChange={onGroupTypeChange}>
            <SelectTrigger className="h-14 text-lg">
              <SelectValue placeholder="Select group type" />
            </SelectTrigger>
            <SelectContent>
              {groupTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <span className="flex items-center gap-2">
                    <span className="text-xl">{type.emoji}</span>
                    <span>{type.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={onNext}
        disabled={isSubmitting}
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

export default TravelersStep;
