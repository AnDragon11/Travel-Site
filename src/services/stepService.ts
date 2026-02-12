import { supabase } from "@/integrations/supabase/client";

interface StepData {
  [key: string]: unknown;
}

// Fire-and-forget: sends data to backend but doesn't block on response
export const submitStepData = async (step: string, data: StepData): Promise<void> => {
  try {
    const { data: response, error } = await supabase.functions.invoke("planner-step", {
      body: { step, data },
    });

    if (error) {
      console.warn(`Step ${step} submission warning (continuing anyway):`, error);
      return; // Don't throw, just log and continue
    }

    console.log(`Step ${step} submitted:`, response);
  } catch (err) {
    console.warn(`Step ${step} network error (continuing anyway):`, err);
    // Don't throw, just log and continue
  }
};

export const submitLocationStep = async (departureCity: string, destinationCity: string) => {
  return submitStepData("location", { departure_city: departureCity, destination_city: destinationCity });
};

export const submitDateStep = async (startDate: string, endDate: string) => {
  return submitStepData("dates", { start_date: startDate, end_date: endDate });
};

export const submitTravelersStep = async (travelers: number, groupType: string) => {
  return submitStepData("travelers", { travelers, group_type: groupType });
};

export const submitPreferencesStep = async (preferences: string[]) => {
  return submitStepData("preferences", { preferences });
};

export const submitComfortStep = async (comfortLevel: number) => {
  return submitStepData("comfort", { comfort_level: comfortLevel });
};
