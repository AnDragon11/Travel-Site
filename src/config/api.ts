// API Configuration
// Change these values based on your environment

export const API_CONFIG = {
  // N8N Webhook URL - set via environment variable or fallback to empty
  // In production, set VITE_N8N_WEBHOOK_URL in your environment
  webhookUrl: import.meta.env.VITE_N8N_WEBHOOK_URL || '',
  
  // Request timeout in milliseconds (matches edge function timeout)
  timeout: 50000,
  
  // Enable mock mode for testing without a real webhook
  // Set to false when you have a real webhook URL
  useMockData: !import.meta.env.VITE_N8N_WEBHOOK_URL,
};

// Mock delay for simulating API call (in ms)
export const MOCK_DELAY = 8000;

// Loading messages that rotate during API call
export const LOADING_MESSAGES = [
  "Finding the best flights...",
  "Matching hotels to your budget...",
  "Discovering local experiences...",
  "Building your perfect itinerary...",
  "Almost ready...",
];

// Message rotation interval (ms)
export const MESSAGE_INTERVAL = 3000;
