import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TripProvider } from "@/context/TripContext";
import { AuthProvider } from "@/context/AuthContext";
import { PreferencesProvider } from "@/context/PreferencesContext";
import { ThemeProvider } from "next-themes";
import Planner from "./pages/Planner";
import Itinerary from "./pages/Itinerary";
import MyTrips from "./pages/MyTrips";
import ProfileSettings from "./pages/ProfileSettings";
import ProfilePage from "./pages/ProfilePage";
import { Navigate } from "react-router-dom";
import TripBuilder from "./pages/TripBuilder";
import Explore from "./pages/Explore";
import TripView from "./pages/TripView";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PreferencesProvider>
        <TripProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Planner />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/profile-settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
                <Route path="/user/:handle" element={<ProfilePage />} />
                <Route path="/my-trips" element={<Navigate to="/profile" replace />} />
                <Route path="/itinerary" element={<Itinerary />} />
                <Route path="/trip/:id" element={<TripView />} />
                <Route path="/builder" element={<TripBuilder />} />
                <Route path="/builder/:id" element={<TripBuilder />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </TripProvider>
        </PreferencesProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
