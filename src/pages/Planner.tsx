import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import Header from "@/components/Header";
import LoadingOverlay from "@/components/LoadingOverlay";
import ErrorModal from "@/components/ErrorModal";
import StepIndicator from "@/components/planner/StepIndicator";
import FormStep from "@/components/planner/FormStep";
import LocationStep from "@/components/planner/steps/LocationStep";
import DateStep from "@/components/planner/steps/DateStep";
import TravelersStep from "@/components/planner/steps/TravelersStep";
import PreferencesStep from "@/components/planner/steps/PreferencesStep";
import ComfortStep from "@/components/planner/steps/ComfortStep";

import { toast } from "sonner";
import { useTripContext, TripFormData } from "@/context/TripContext";
import { submitTripRequest } from "@/services/tripService";

const TOTAL_STEPS = 5;

const Planner = () => {
  const navigate = useNavigate();
  const { setFormData, setItinerary, isLoading, setIsLoading, error, setError } = useTripContext();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Step state
  const [currentStep, setCurrentStep] = useState(0);
  const [stepSubmitting, setStepSubmitting] = useState(false);
  
  // Form state
  const [departureCity, setDepartureCity] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [travelers, setTravelers] = useState(2);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [groupType, setGroupType] = useState("couple");
  const [groupTypeManuallySet, setGroupTypeManuallySet] = useState(false);
  const [comfortLevel, setComfortLevel] = useState(3);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Check if current step can proceed
  const canProceed = () => {
    switch (currentStep) {
      case 0: return departureCity.trim() !== "" && destinationCity.trim() !== "";
      case 1: return startDate !== undefined && endDate !== undefined;
      case 2: return travelers >= 1 && groupType !== "";
      case 3: return true; // Preferences are optional
      case 4: return comfortLevel >= 1;
      default: return false;
    }
  };

  // Get the handler for current step
  const handleScrollContinue = () => {
    if (!canProceed() || stepSubmitting) return;
    
    switch (currentStep) {
      case 0: handleLocationNext(); break;
      case 1: handleDateNext(); break;
      case 2: handleTravelersNext(); break;
      case 3: handlePreferencesNext(); break;
      case 4: handleFinalSubmit(); break;
    }
  };

  // Handle wheel scrolling to navigate steps
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let lastScrollTime = 0;
    let scrollAccumulator = 0;
    const scrollCooldown = 500; // ms between scroll navigations
    const scrollThreshold = 100; // minimum deltaY to trigger step change
    const accumulatorDecayTime = 150; // ms before accumulator resets
    let lastScrollEventTime = 0;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const now = Date.now();

      // Reset accumulator if too much time has passed since last scroll
      if (now - lastScrollEventTime > accumulatorDecayTime) {
        scrollAccumulator = 0;
      }

      lastScrollEventTime = now;

      // Accumulate scroll delta
      scrollAccumulator += e.deltaY;

      // Only trigger step change if:
      // 1. Enough time has passed since last step change (cooldown)
      // 2. Accumulated scroll exceeds threshold
      if (now - lastScrollTime < scrollCooldown) return;

      if (scrollAccumulator > scrollThreshold && canProceed()) {
        // Scrolling down - proceed if fields are filled
        lastScrollTime = now;
        scrollAccumulator = 0;
        handleScrollContinue();
      } else if (scrollAccumulator < -scrollThreshold && currentStep > 0) {
        // Scrolling up - go back
        lastScrollTime = now;
        scrollAccumulator = 0;
        setCurrentStep(prev => Math.max(0, prev - 1));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [currentStep, departureCity, destinationCity, startDate, endDate, travelers, groupType, selectedPreferences, comfortLevel, stepSubmitting]);

  // Handle touch swipe to navigate steps (mobile)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartY = 0;
    let lastSwipeTime = 0;
    const swipeCooldown = 400;
    const swipeThreshold = 50; // minimum swipe distance in pixels

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchStartY - touchEndY;
      
      const now = Date.now();
      if (now - lastSwipeTime < swipeCooldown) return;
      if (Math.abs(deltaY) < swipeThreshold) return;

      if (deltaY > 0 && canProceed()) {
        // Swiped up (scrolling down) - proceed if fields are filled
        lastSwipeTime = now;
        handleScrollContinue();
      } else if (deltaY < 0 && currentStep > 0) {
        // Swiped down (scrolling up) - go back
        lastSwipeTime = now;
        setCurrentStep(prev => Math.max(0, prev - 1));
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentStep, departureCity, destinationCity, startDate, endDate, travelers, groupType, selectedPreferences, comfortLevel, stepSubmitting]);

  // Smart defaults for group type based on traveler count
  const getDefaultGroupType = (count: number): string => {
    if (count === 1) return "solo";
    if (count === 2) return "couple";
    return "friends";
  };

  const handleTravelersChange = (newCount: number) => {
    const clampedCount = Math.max(1, Math.min(10, newCount));
    setTravelers(clampedCount);
    if (!groupTypeManuallySet) {
      setGroupType(getDefaultGroupType(clampedCount));
    }
  };

  const handleGroupTypeChange = (value: string) => {
    setGroupType(value);
    setGroupTypeManuallySet(true);
  };

  const calculateNights = () => {
    if (!startDate || !endDate) return 5;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  const nights = calculateNights();

  const togglePreference = (pref: string) => {
    setSelectedPreferences(prev => 
      prev.includes(pref) 
        ? prev.filter(p => p !== pref)
        : [...prev, pref]
    );
  };

  // Step handlers - just navigate, no API calls per step
  const handleLocationNext = () => {
    setCurrentStep(1);
  };

  const handleDateNext = () => {
    if (!startDate || !endDate) return;
    setCurrentStep(2);
  };

  const handleTravelersNext = () => {
    setCurrentStep(3);
  };

  const handlePreferencesNext = () => {
    setCurrentStep(4);
  };

  const handleFinalSubmit = async () => {
    setStepSubmitting(true);
    try {
      // Build full form data
      const formData: TripFormData = {
        departure_city: departureCity,
        destination_city: destinationCity,
        start_date: format(startDate!, "yyyy-MM-dd"),
        end_date: format(endDate!, "yyyy-MM-dd"),
        travelers,
        preferences: selectedPreferences,
        passport_country: "US",
        group_type: groupType,
        comfort_level: comfortLevel,
      };

      setFormData(formData);
      setIsLoading(true);
      setError(null);

      // Generate itinerary (fires webhook in background, returns placeholder)
      const itineraryData = await submitTripRequest(formData);
      setItinerary(itineraryData);
      toast.success("Your itinerary is ready!");
      navigate("/itinerary");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setErrorMessage(message);
      setShowErrorModal(true);
      setError(message);
    } finally {
      setStepSubmitting(false);
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setShowErrorModal(false);
    handleFinalSubmit();
  };

  return (
    <div 
      ref={containerRef}
      className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-accent via-background to-muted"
    >
      <Header />
      <LoadingOverlay isVisible={isLoading} />
      <ErrorModal 
        isOpen={showErrorModal} 
        onClose={() => setShowErrorModal(false)}
        onRetry={handleRetry}
        errorMessage={errorMessage}
      />
      
      <main className="flex-1 pt-20 pb-4 flex flex-col overflow-hidden">
        <div className="container mx-auto px-4 flex-1 flex flex-col overflow-hidden">

          <div className="flex-shrink-0 py-1">
            <StepIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />
          </div>

          {/* Steps Container - Fixed height viewport */}
          <div className="flex-1 relative max-w-3xl mx-auto w-full overflow-hidden min-h-0">
            {/* Tap zone to go back (above active step) */}
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                className="absolute inset-x-0 top-0 h-24 z-10 cursor-pointer flex items-start justify-center pt-4 opacity-0 hover:opacity-100 transition-opacity group"
                aria-label="Go to previous step"
              >
                <span className="text-xs text-muted-foreground bg-background/80 px-3 py-1 rounded-full backdrop-blur-sm group-hover:bg-background transition-colors">
                  ↑ Tap to go back
                </span>
              </button>
            )}

            {/* Tap zone to continue (below active step) */}
            {currentStep < TOTAL_STEPS - 1 && canProceed() && !stepSubmitting && (
              <button
                type="button"
                onClick={handleScrollContinue}
                className="absolute inset-x-0 bottom-0 h-20 z-10 cursor-pointer flex items-end justify-center pb-4 opacity-0 hover:opacity-100 transition-opacity group"
                aria-label="Continue to next step"
              >
                <span className="text-xs text-muted-foreground bg-background/80 px-3 py-1 rounded-full backdrop-blur-sm group-hover:bg-background transition-colors">
                  ↓ Tap to continue
                </span>
              </button>
            )}

            {/* Step 0: Location */}
            <FormStep
              isActive={currentStep === 0}
              isCompleted={currentStep > 0}
              isPending={currentStep < 0}
              stepIndex={0}
              currentStep={currentStep}
            >
              <LocationStep
                departureCity={departureCity}
                destinationCity={destinationCity}
                onDepartureChange={setDepartureCity}
                onDestinationChange={setDestinationCity}
                onNext={handleLocationNext}
                isSubmitting={stepSubmitting && currentStep === 0}
              />
            </FormStep>

            {/* Step 1: Dates */}
            <FormStep
              isActive={currentStep === 1}
              isCompleted={currentStep > 1}
              isPending={currentStep < 1}
              stepIndex={1}
              currentStep={currentStep}
            >
              <DateStep
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onNext={handleDateNext}
                isSubmitting={stepSubmitting && currentStep === 1}
              />
            </FormStep>

            {/* Step 2: Travelers */}
            <FormStep
              isActive={currentStep === 2}
              isCompleted={currentStep > 2}
              isPending={currentStep < 2}
              stepIndex={2}
              currentStep={currentStep}
            >
              <TravelersStep
                travelers={travelers}
                groupType={groupType}
                onTravelersChange={handleTravelersChange}
                onGroupTypeChange={handleGroupTypeChange}
                onNext={handleTravelersNext}
                isSubmitting={stepSubmitting && currentStep === 2}
              />
            </FormStep>

            {/* Step 3: Preferences */}
            <FormStep
              isActive={currentStep === 3}
              isCompleted={currentStep > 3}
              isPending={currentStep < 3}
              stepIndex={3}
              currentStep={currentStep}
            >
              <PreferencesStep
                selectedPreferences={selectedPreferences}
                onTogglePreference={togglePreference}
                onNext={handlePreferencesNext}
                isSubmitting={stepSubmitting && currentStep === 3}
              />
            </FormStep>

            {/* Step 4: Comfort */}
            <FormStep
              isActive={currentStep === 4}
              isCompleted={currentStep > 4}
              isPending={currentStep < 4}
              stepIndex={4}
              currentStep={currentStep}
            >
              <ComfortStep
                comfortLevel={comfortLevel}
                nights={nights}
                travelers={travelers}
                onComfortChange={setComfortLevel}
                onSubmit={handleFinalSubmit}
                isSubmitting={stepSubmitting && currentStep === 4}
              />
            </FormStep>
          </div>

          {/* Navigation hint for mobile */}
          {currentStep > 0 && (
            <div 
              className="text-center py-2 text-muted-foreground text-xs flex-shrink-0 animate-fade-in cursor-pointer hover:text-foreground transition-colors"
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            >
              ↑ Tap or swipe to go back
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Planner;