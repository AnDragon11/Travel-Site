import { useState, useEffect } from "react";
import { format, addDays, isBefore, startOfDay, getYear, setMonth, setYear, getMonth, lastDayOfMonth, isEqual } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface DateRangePickerProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DateRangePicker = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangePickerProps) => {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [startMonthView, setStartMonthView] = useState(false);
  const [endMonthView, setEndMonthView] = useState(false);
  const [startViewMonth, setStartViewMonth] = useState<Date>(new Date());
  const [endViewMonth, setEndViewMonth] = useState<Date>(new Date());
  const [startSelectedYear, setStartSelectedYear] = useState(getYear(new Date()));
  const [endSelectedYear, setEndSelectedYear] = useState(getYear(new Date()));

  const today = startOfDay(new Date());
  const currentYear = getYear(today);
  const currentMonth = getMonth(today);
  
  // When start date changes and end date is before or equal to start, clear end date
  useEffect(() => {
    if (startDate && endDate && !isBefore(startDate, endDate)) {
      onEndDateChange(undefined);
    }
  }, [startDate]);

  // When end date picker opens, set view to start date's month (or next month if last day)
  useEffect(() => {
    if (endOpen && startDate) {
      const lastDay = lastDayOfMonth(startDate);
      const isLastDayOfMonth = isEqual(startOfDay(startDate), startOfDay(lastDay));
      
      if (isLastDayOfMonth) {
        // If start date is last day of month, show next month
        const nextMonth = setMonth(startDate, getMonth(startDate) + 1);
        setEndViewMonth(nextMonth);
        setEndSelectedYear(getYear(nextMonth));
      } else {
        // Show the same month as start date
        setEndViewMonth(startDate);
        setEndSelectedYear(getYear(startDate));
      }
    }
  }, [endOpen, startDate]);

  const handleStartSelect = (date: Date | undefined) => {
    onStartDateChange(date);
    setStartOpen(false);
    setStartMonthView(false);
    // Auto-open end date picker after selecting start
    if (date) {
      setTimeout(() => setEndOpen(true), 150);
    }
  };

  const handleEndSelect = (date: Date | undefined) => {
    onEndDateChange(date);
    setEndOpen(false);
    setEndMonthView(false);
  };

  const handleStartMonthSelect = (monthIndex: number) => {
    const newDate = setYear(setMonth(new Date(), monthIndex), startSelectedYear);
    setStartViewMonth(newDate);
    setStartMonthView(false);
  };

  const handleEndMonthSelect = (monthIndex: number) => {
    const newDate = setYear(setMonth(new Date(), monthIndex), endSelectedYear);
    setEndViewMonth(newDate);
    setEndMonthView(false);
  };

  const isMonthDisabled = (monthIndex: number, year: number, isEnd: boolean = false) => {
    if (year < currentYear) return true;
    if (year === currentYear && monthIndex < currentMonth) return true;
    
    if (isEnd && startDate) {
      const startYear = getYear(startDate);
      const startMonth = getMonth(startDate);
      if (year < startYear) return true;
      if (year === startYear && monthIndex < startMonth) return true;
    }
    
    return false;
  };

  // Calculate nights between dates
  const nights = startDate && endDate 
    ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const years = [currentYear, currentYear + 1, currentYear + 2];

  const MonthYearSelector = ({ 
    isEnd = false, 
    selectedYear, 
    onYearChange, 
    onMonthSelect 
  }: { 
    isEnd?: boolean;
    selectedYear: number;
    onYearChange: (year: number) => void;
    onMonthSelect: (month: number) => void;
  }) => (
    <div className="p-4 w-full min-w-[280px] h-[320px] flex flex-col">
      {/* Year Tabs */}
      <div className="flex gap-2 mb-4 justify-center">
        {years.map((year) => (
          <button
            key={year}
            onClick={() => onYearChange(year)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              selectedYear === year
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            )}
          >
            {year}
          </button>
        ))}
      </div>
      
      {/* Month Grid */}
      <div className="grid grid-cols-3 gap-2 flex-1">
        {months.map((month, index) => {
          const disabled = isMonthDisabled(index, selectedYear, isEnd);
          return (
            <button
              key={month}
              onClick={() => !disabled && onMonthSelect(index)}
              disabled={disabled}
              className={cn(
                "p-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center",
                disabled
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : "hover:bg-primary/10 text-foreground hover:text-primary"
              )}
            >
              {month.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </div>
  );

  const CalendarHeader = ({ 
    date, 
    onMonthClick,
    onPrevMonth,
    onNextMonth
  }: { 
    date: Date;
    onMonthClick: () => void;
    onPrevMonth: () => void;
    onNextMonth: () => void;
  }) => (
    <div className="flex items-center justify-between px-2 py-2">
      <button
        onClick={onPrevMonth}
        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-all"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={onMonthClick}
        className="text-sm font-semibold hover:text-primary transition-colors px-3 py-1 rounded-lg hover:bg-accent"
      >
        {format(date, "MMMM yyyy")}
      </button>
      <button
        onClick={onNextMonth}
        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-all"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Start Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Start date
          </label>
          <Popover open={startOpen} onOpenChange={(open) => {
            setStartOpen(open);
            if (!open) setStartMonthView(false);
          }}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-12 justify-start text-left font-normal px-4 bg-background hover:bg-accent/50 border-2 transition-all duration-200",
                  startOpen && "border-primary ring-2 ring-primary/20",
                  !startDate && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-3 h-5 w-5 text-primary" />
                {startDate ? (
                  <span className="font-medium">{format(startDate, "EEE, MMM d, yyyy")}</span>
                ) : (
                  <span>Select start date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[calc(100vw-2rem)] sm:w-auto min-w-[280px] max-w-[320px] p-0 bg-card border-2 shadow-xl rounded-xl overflow-hidden z-[100]"
              align="center"
              sideOffset={8}
              collisionPadding={16}
            >
              <div className="p-3 border-b border-border bg-muted/30">
                <h3 className="font-semibold text-foreground">When do you leave?</h3>
                <p className="text-xs text-muted-foreground">Select your departure date</p>
              </div>
              
              {startMonthView ? (
                <MonthYearSelector
                  selectedYear={startSelectedYear}
                  onYearChange={setStartSelectedYear}
                  onMonthSelect={handleStartMonthSelect}
                />
              ) : (
                <div className="w-full min-w-[280px] h-[320px] flex flex-col">
                  <CalendarHeader
                    date={startViewMonth}
                    onMonthClick={() => setStartMonthView(true)}
                    onPrevMonth={() => setStartViewMonth(prev => setMonth(prev, getMonth(prev) - 1))}
                    onNextMonth={() => setStartViewMonth(prev => setMonth(prev, getMonth(prev) + 1))}
                  />
                  <div className="flex-1 flex flex-col">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={handleStartSelect}
                      month={startViewMonth}
                      onMonthChange={setStartViewMonth}
                      disabled={(date) => isBefore(date, today)}
                      fixedWeeks
                      className={cn("p-3 pt-0 pointer-events-auto")}
                      classNames={{
                        months: "flex flex-col w-full",
                        month: "space-y-2 w-full",
                        caption: "hidden",
                        nav: "hidden",
                        table: "w-full border-collapse",
                        head_row: "flex w-full justify-between",
                        head_cell: "text-muted-foreground rounded-md flex-1 text-center font-medium text-[0.8rem]",
                        row: "flex w-full justify-between mt-1",
                        cell: cn(
                          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1 flex items-center justify-center",
                          "[&:has([aria-selected])]:bg-accent [&:has([aria-selected])]:rounded-lg"
                        ),
                        day: cn(
                          "h-9 w-9 sm:h-10 sm:w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-primary/10 rounded-lg transition-all duration-150"
                        ),
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-md",
                        day_today: "bg-accent text-accent-foreground font-bold",
                        day_outside: "text-muted-foreground opacity-50",
                        day_disabled: "text-muted-foreground opacity-30 cursor-not-allowed hover:bg-transparent",
                        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                        day_hidden: "invisible",
                      }}
                    />
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            End date
          </label>
          <Popover open={endOpen} onOpenChange={(open) => {
            setEndOpen(open);
            if (!open) setEndMonthView(false);
          }}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-12 justify-start text-left font-normal px-4 bg-background hover:bg-accent/50 border-2 transition-all duration-200",
                  endOpen && "border-primary ring-2 ring-primary/20",
                  !endDate && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-3 h-5 w-5 text-primary" />
                {endDate ? (
                  <span className="font-medium">{format(endDate, "EEE, MMM d, yyyy")}</span>
                ) : (
                  <span>Select end date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[calc(100vw-2rem)] sm:w-auto min-w-[280px] max-w-[320px] p-0 bg-card border-2 shadow-xl rounded-xl overflow-hidden z-[100]"
              align="center"
              sideOffset={8}
              collisionPadding={16}
            >
              <div className="p-3 border-b border-border bg-muted/30">
                <h3 className="font-semibold text-foreground">When do you return?</h3>
                <p className="text-xs text-muted-foreground">
                  {startDate
                    ? `Must be after ${format(startDate, "MMM d, yyyy")}`
                    : "Select start date first"}
                </p>
              </div>
              
              {endMonthView ? (
                <MonthYearSelector
                  isEnd
                  selectedYear={endSelectedYear}
                  onYearChange={setEndSelectedYear}
                  onMonthSelect={handleEndMonthSelect}
                />
              ) : (
                <div className="w-full min-w-[280px] h-[320px] flex flex-col">
                  <CalendarHeader
                    date={endViewMonth}
                    onMonthClick={() => setEndMonthView(true)}
                    onPrevMonth={() => setEndViewMonth(prev => setMonth(prev, getMonth(prev) - 1))}
                    onNextMonth={() => setEndViewMonth(prev => setMonth(prev, getMonth(prev) + 1))}
                  />
                  <div className="flex-1 flex flex-col">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={handleEndSelect}
                      month={endViewMonth}
                      onMonthChange={setEndViewMonth}
                      disabled={(date) => {
                        if (isBefore(date, today)) return true;
                        if (startDate && !isBefore(startDate, date)) return true;
                        return false;
                      }}
                      fixedWeeks
                      className={cn("p-3 pt-0 pointer-events-auto")}
                      classNames={{
                        months: "flex flex-col w-full",
                        month: "space-y-2 w-full",
                        caption: "hidden",
                        nav: "hidden",
                        table: "w-full border-collapse",
                        head_row: "flex w-full justify-between",
                        head_cell: "text-muted-foreground rounded-md flex-1 text-center font-medium text-[0.8rem]",
                        row: "flex w-full justify-between mt-1",
                        cell: cn(
                          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1 flex items-center justify-center",
                          "[&:has([aria-selected])]:bg-accent [&:has([aria-selected])]:rounded-lg"
                        ),
                        day: cn(
                          "h-9 w-9 sm:h-10 sm:w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-primary/10 rounded-lg transition-all duration-150"
                        ),
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-md",
                        day_today: "bg-accent text-accent-foreground font-bold",
                        day_outside: "text-muted-foreground opacity-50",
                        day_disabled: "text-muted-foreground opacity-30 cursor-not-allowed hover:bg-transparent",
                        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                        day_hidden: "invisible",
                      }}
                    />
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Trip duration indicator */}
      {startDate && endDate && nights > 0 && (
        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-primary/5 rounded-lg border border-primary/10">
          <div className="flex items-center gap-1.5">
            <span className="text-xl">✈️</span>
            <span className="text-sm font-semibold text-primary">
              {nights} night{nights !== 1 ? "s" : ""} adventure
            </span>
            <span className="text-xl">🌴</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
