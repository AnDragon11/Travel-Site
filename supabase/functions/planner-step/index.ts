import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const N8N_BASE_URL = "https://n8n.toomanygames.net/webhook";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { step, data } = await req.json();

    if (!step || !data) {
      throw new Error("Missing step or data in request");
    }

    // Map step to endpoint
    const endpointMap: Record<string, string> = {
      location: "location",
      dates: "dates",
      travelers: "travelers",
      preferences: "preferences",
      comfort: "comfort",
    };

    const endpoint = endpointMap[step];
    if (!endpoint) {
      throw new Error(`Unknown step: ${step}`);
    }

    const webhookUrl = `${N8N_BASE_URL}/${endpoint}`;

    console.log(`=== Planner Step: ${step} ===`);
    console.log("Data:", JSON.stringify(data, null, 2));
    console.log("Forwarding to:", webhookUrl);

    // Forward request to n8n webhook (fire-and-forget, don't fail on errors)
    let responseData: Record<string, unknown> = { status: "sent", webhook: webhookUrl };

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.warn("n8n webhook returned non-OK (continuing):", response.status, response.statusText);
        responseData = { status: "webhook_error", code: response.status, message: response.statusText };
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          responseData = await response.json();
        } else {
          responseData = { status: "ok", text: await response.text() };
        }
        console.log("n8n Response:", responseData);
      }
    } catch (fetchError) {
      console.warn("n8n webhook fetch error (continuing):", fetchError);
      responseData = { status: "fetch_error", message: String(fetchError) };
    }

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing step:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Failed to process step" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
