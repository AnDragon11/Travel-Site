import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const StepIndicator = ({ currentStep, totalSteps }: StepIndicatorProps) => {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-2 rounded-full transition-all duration-500",
            index === currentStep
              ? "w-8 bg-primary"
              : index < currentStep
              ? "w-2 bg-primary/60"
              : "w-2 bg-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
};

export default StepIndicator;
