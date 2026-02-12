import { Calendar, ArrowRight, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import DateRangePicker from "@/components/DateRangePicker";

interface DateStepProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  onNext: () => void;
  isSubmitting: boolean;
}

const DateStep = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onNext,
  isSubmitting,
}: DateStepProps) => {
  const isValid = startDate && endDate;

  return (
    <div className="space-y-8 text-center">
      <div>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          When are you traveling?
        </h2>
        <p className="text-muted-foreground">
          Select your trip dates
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <div className="space-y-3">
          <Label className="text-base font-semibold flex items-center gap-2 justify-center">
            <Calendar className="w-5 h-5 text-primary" />
            Travel Dates
          </Label>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={onStartDateChange}
            onEndDateChange={onEndDateChange}
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

export default DateStep;
