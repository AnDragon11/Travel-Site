import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BudgetSlider from "@/components/BudgetSlider";

interface ComfortStepProps {
  comfortLevel: number;
  nights: number;
  travelers: number;
  onComfortChange: (level: number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const ComfortStep = ({
  comfortLevel,
  nights,
  travelers,
  onComfortChange,
  onSubmit,
  isSubmitting,
}: ComfortStepProps) => {
  return (
    <div className="space-y-8 text-center">
      <div>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          Choose your experience
        </h2>
        <p className="text-muted-foreground">
          We'll find the best options for your comfort level
        </p>
      </div>

      <div className="max-w-lg mx-auto">
        <BudgetSlider
          value={comfortLevel}
          onChange={onComfortChange}
          nights={nights}
          travelers={travelers}
        />
      </div>

      <Button
        onClick={onSubmit}
        disabled={isSubmitting}
        size="lg"
        className="h-16 px-10 text-xl font-bold rounded-xl bg-gradient-hero text-primary-foreground transition-all duration-300 hover:shadow-glow hover:brightness-110 disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-6 h-6 mr-2 animate-spin" />
            Planning your trip...
          </>
        ) : (
          <>
            <Sparkles className="w-6 h-6 mr-2" />
            Generate My Itinerary
          </>
        )}
      </Button>
      <p className="text-sm text-muted-foreground">
        Powered by AI • Takes about 30 seconds
      </p>
    </div>
  );
};

export default ComfortStep;
