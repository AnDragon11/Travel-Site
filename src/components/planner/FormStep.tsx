import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface FormStepProps {
  children: ReactNode;
  isActive: boolean;
  isCompleted: boolean;
  isPending: boolean;
  stepIndex: number;
  currentStep: number;
}

const FormStep = ({ children, isActive, isCompleted, isPending, stepIndex, currentStep }: FormStepProps) => {
  // Calculate vertical position based on step state
  const getTransformY = () => {
    if (isActive) {
      return 0; // Centered
    }
    if (isCompleted) {
      // Move up significantly and stack - pushed much higher to avoid overlap
      const stepsAway = currentStep - stepIndex;
      return -280 - (stepsAway * 50);
    }
    if (isPending) {
      // Move down and stack
      const stepsAway = stepIndex - currentStep;
      return 260 + (stepsAway * 40);
    }
    return 0;
  };

  const getScale = () => {
    if (isActive) return 1;
    if (isCompleted) return 0.4; // Smaller for completed
    if (isPending) {
      const stepsAway = stepIndex - currentStep;
      return Math.max(0.35, 0.55 - stepsAway * 0.1);
    }
    return 1;
  };

  const getOpacity = () => {
    if (isActive) return 1;
    if (isCompleted) return 0.15; // More faded
    if (isPending) {
      const stepsAway = stepIndex - currentStep;
      return Math.max(0.08, 0.2 - stepsAway * 0.05);
    }
    return 1;
  };

  // Only apply the mobile offset on smaller screens
  const mobileOffset = isActive ? -40 : 0;

  return (
    <div
      className={cn(
        "absolute inset-x-0 transition-all duration-700 ease-out",
        isActive && "z-20",
        isCompleted && "z-10 pointer-events-none",
        isPending && "z-10 pointer-events-none"
      )}
      style={{
        top: "50%",
        transform: `translateY(calc(-50% + ${getTransformY()}px)) scale(${getScale()})`,
        opacity: getOpacity(),
      }}
    >
      <div className={cn(isActive && "md:translate-y-0 -translate-y-10")}>
        {children}
      </div>
    </div>
  );
};

export default FormStep;