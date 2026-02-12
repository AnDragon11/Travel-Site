import { useState } from "react";
import { cn } from "@/lib/utils";

interface ExperienceLevel {
  id: number;
  name: string;
  emoji: string;
  shortDesc: string;
  priceIndicator: string;
  multiplier: number;
}

const experienceLevels: ExperienceLevel[] = [
  {
    id: 1,
    name: "Nomad",
    emoji: "🎒",
    shortDesc: "Hostels & street food",
    priceIndicator: "$",
    multiplier: 50,
  },
  {
    id: 2,
    name: "Smart",
    emoji: "💼",
    shortDesc: "Budget hotels",
    priceIndicator: "$$",
    multiplier: 100,
  },
  {
    id: 3,
    name: "Balanced",
    emoji: "⚖️",
    shortDesc: "Mid-range comfort",
    priceIndicator: "$$$",
    multiplier: 180,
  },
  {
    id: 4,
    name: "Comfortable",
    emoji: "🏨",
    shortDesc: "Quality stays",
    priceIndicator: "$$$$",
    multiplier: 300,
  },
  {
    id: 5,
    name: "Luxurious",
    emoji: "💎",
    shortDesc: "5-star experience",
    priceIndicator: "$$$$$",
    multiplier: 500,
  },
];

interface BudgetSliderProps {
  value: number;
  onChange: (value: number) => void;
  nights: number;
  travelers: number;
}

const BudgetSlider = ({ value, onChange, nights, travelers }: BudgetSliderProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const currentLevel = experienceLevels.find((l) => l.id === value) || experienceLevels[2];

  const baseCost = nights * currentLevel.multiplier * travelers;
  const minCost = Math.round(baseCost * 0.85);
  const maxCost = Math.round(baseCost * 1.15);

  const handleSliderChange = (newValue: number) => {
    if (newValue !== value) {
      setIsAnimating(true);
      onChange(newValue);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Selection - Hero Display */}
      <div
        className={cn(
          "text-center transition-all duration-300",
          isAnimating && "scale-105"
        )}
      >
        <div className="text-5xl md:text-6xl mb-2">{currentLevel.emoji}</div>
        <h3 className="text-2xl md:text-3xl font-bold text-foreground">
          {currentLevel.name}
        </h3>
        <p className="text-muted-foreground text-sm md:text-base mt-1">
          {currentLevel.shortDesc}
        </p>
      </div>

      {/* Slider Section */}
      <div className="px-2">
        {/* Track with dots */}
        <div className="relative h-6 flex items-center">
          {/* Background Track */}
          <div className="absolute left-[10%] right-[10%] h-2 bg-muted rounded-full">
            {/* Active fill */}
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${((value - 1) / 4) * 100}%` }}
            />
          </div>

          {/* Dots positioned on the track */}
          <div className="relative w-full flex justify-between px-[10%]">
            {experienceLevels.map((level) => {
              const isActive = level.id === value;
              const isPast = level.id < value;

              return (
                <button
                  key={level.id}
                  onClick={() => handleSliderChange(level.id)}
                  className="relative z-10 focus:outline-none group touch-manipulation"
                  aria-label={level.name}
                >
                  <div
                    className={cn(
                      "w-5 h-5 md:w-4 md:h-4 rounded-full border-2 transition-all duration-300",
                      isActive
                        ? "bg-primary border-primary scale-150 shadow-lg shadow-primary/30"
                        : isPast
                        ? "bg-primary border-primary"
                        : "bg-background border-muted-foreground/30 group-hover:border-primary/50"
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Price indicators below track - grid aligned with dots */}
        <div 
          className="grid grid-cols-5 mt-3"
          style={{ paddingLeft: 'calc(10% - 24px)', paddingRight: 'calc(10% - 24px)' }}
        >
          {experienceLevels.map((level) => {
            const isActive = level.id === value;
            return (
              <button
                key={level.id}
                onClick={() => handleSliderChange(level.id)}
                className={cn(
                  "flex justify-center text-xs md:text-sm font-medium transition-all duration-200 touch-manipulation",
                  isActive
                    ? "text-primary scale-110"
                    : "text-muted-foreground/60"
                )}
              >
                {level.priceIndicator}
              </button>
            );
          })}
        </div>
      </div>

      {/* Estimated Cost - Compact */}
      <div className="text-center">
        <p className="text-lg md:text-xl font-semibold text-foreground">
          ${minCost.toLocaleString()} – ${maxCost.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          est. total • {nights} nights • {travelers} {travelers === 1 ? 'traveler' : 'travelers'}
        </p>
      </div>
    </div>
  );
};

export default BudgetSlider;
