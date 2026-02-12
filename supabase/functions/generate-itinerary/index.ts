import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// IMPORTANT: Use production webhook URL (/webhook/) not test URL (/webhook-test/)
// Test webhooks return immediately without waiting for workflow completion
const N8N_WEBHOOK_URL = Deno.env.get("N8N_WEBHOOK_URL") || "https://n8n.toomanygames.net/webhook/itinerary";
const WEBHOOK_TIMEOUT_MS = 115000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.json();

    console.log("=== Trip Planning Request Received ===");
    console.log("Form Data:", JSON.stringify(formData, null, 2));
    console.log("Forwarding to n8n webhook:", N8N_WEBHOOK_URL);

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error("n8n webhook error:", response.status, response.statusText);
        throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("=== n8n Response ===");
      console.log("Response:", JSON.stringify(data, null, 2));

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        console.error("Webhook timed out after", WEBHOOK_TIMEOUT_MS, "ms");
        return new Response(
          JSON.stringify({ error: "Request timed out. The trip planner is taking longer than expected." }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate itinerary" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
