import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { MapPin, Compass, Home, Plane, Map } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-accent via-background to-muted px-4 py-12 overflow-hidden relative">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Floating travel icons */}
        <div className="absolute top-[10%] left-[10%] text-primary/10 animate-pulse">
          <Plane className="w-16 h-16 rotate-12" />
        </div>
        <div className="absolute top-[20%] right-[15%] text-secondary/10 animate-pulse" style={{ animationDelay: '0.5s' }}>
          <Map className="w-12 h-12 -rotate-12" />
        </div>
        <div className="absolute bottom-[25%] left-[8%] text-primary/10 animate-pulse" style={{ animationDelay: '1s' }}>
          <Compass className="w-10 h-10 rotate-45" />
        </div>
        <div className="absolute bottom-[15%] right-[10%] text-secondary/10 animate-pulse" style={{ animationDelay: '1.5s' }}>
          <MapPin className="w-14 h-14" />
        </div>
        
        {/* Dotted path decoration */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path 
            d="M -10 80 Q 30 50, 50 60 T 110 30" 
            fill="none" 
            stroke="hsl(var(--primary) / 0.1)" 
            strokeWidth="0.3"
            strokeDasharray="1 1"
          />
          <path 
            d="M -10 90 Q 40 60, 60 70 T 110 40" 
            fill="none" 
            stroke="hsl(var(--secondary) / 0.1)" 
            strokeWidth="0.2"
            strokeDasharray="0.5 0.5"
          />
        </svg>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-md mx-auto">
        {/* 404 with compass */}
        <div className="relative mb-6">
          <h1 className="text-8xl md:text-9xl font-bold text-primary/20 select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/10 flex items-center justify-center animate-spin" style={{ animationDuration: '20s' }}>
              <Compass className="w-12 h-12 md:w-16 md:h-16 text-primary" />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Looks like you're lost! 🗺️
          </h2>
          <p className="text-muted-foreground text-lg">
            Don't worry, even the best explorers take a wrong turn sometimes. 
            Let's get you back on track.
          </p>
          <p className="text-sm text-muted-foreground/70">
            The page <code className="px-2 py-1 bg-muted rounded text-xs">{location.pathname}</code> doesn't exist.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild size="lg" className="gap-2 w-full sm:w-auto">
            <Link to="/">
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
            <Link to="/">
              <Plane className="w-4 h-4" />
              Plan a Trip
            </Link>
          </Button>
        </div>

        {/* Fun message */}
        <p className="mt-8 text-xs text-muted-foreground/60">
          ✨ Pro tip: The best adventures start with a plan!
        </p>
      </div>
    </div>
  );
};

export default NotFound;
