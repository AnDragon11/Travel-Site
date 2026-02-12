import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TripProvider } from "@/context/TripContext";
import { ThemeProvider } from "next-themes";
import Planner from "./pages/Planner";
import Itinerary from "./pages/Itinerary";
import MyTrips from "./pages/MyTrips";
import TripBuilder from "./pages/TripBuilder";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TripProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Planner />} />
              <Route path="/my-trips" element={<MyTrips />} />
              <Route path="/itinerary" element={<Itinerary />} />
              <Route path="/builder" element={<TripBuilder />} />
              <Route path="/builder/:id" element={<TripBuilder />} />
              <Route path="/about" element={<About />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </TripProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
