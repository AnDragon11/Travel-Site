import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const preferences = [
  { value: "beaches", label: "🏖️ Beaches" },
  { value: "culture", label: "🏛️ Culture & History" },
  { value: "adventure", label: "🧗 Adventure" },
  { value: "food", label: "🍽️ Food & Dining" },
  { value: "nightlife", label: "🎉 Nightlife" },
  { value: "nature", label: "🌲 Nature" },
  { value: "shopping", label: "🛍️ Shopping" },
  { value: "relaxation", label: "💆 Relaxation" },
];

interface PreferencesStepProps {
  selectedPreferences: string[];
  onTogglePreference: (pref: string) => void;
  onNext: () => void;
  isSubmitting: boolean;
}

const PreferencesStep = ({
  selectedPreferences,
  onTogglePreference,
  onNext,
  isSubmitting,
}: PreferencesStepProps) => {
  return (
    <div className="space-y-8 text-center">
      <div>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          What interests you?
        </h2>
        <p className="text-muted-foreground">
          Select all that apply to personalize your trip
        </p>
      </div>

      <div className="max-w-lg mx-auto">
        <div className="flex flex-wrap justify-center gap-3">
          {preferences.map((pref) => (
            <button
              key={pref.value}
              type="button"
              onClick={() => onTogglePreference(pref.value)}
              className={cn(
                "px-5 py-3 rounded-full text-base font-medium transition-all duration-300",
                selectedPreferences.includes(pref.value)
                  ? "bg-primary text-primary-foreground scale-105 shadow-lg"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:scale-105"
              )}
            >
              {pref.label}
            </button>
          ))}
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

export default PreferencesStep;
