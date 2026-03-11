import { useEffect, useState } from "react";
import { Loader2, Plane, X } from "lucide-react";
import { LOADING_MESSAGES, MESSAGE_INTERVAL } from "@/config/api";
import { cn } from "@/lib/utils";

interface LoadingOverlayProps {
  isVisible: boolean;
  onCancel?: () => void;
}

const LoadingOverlay = ({ isVisible, onCancel }: LoadingOverlayProps) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setMessageIndex(0);
      setElapsed(0);
      return;
    }

    const msgInterval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        setIsAnimating(false);
      }, 300);
    }, MESSAGE_INTERVAL);

    const ticker = setInterval(() => setElapsed((s) => s + 1), 1000);

    return () => {
      clearInterval(msgInterval);
      clearInterval(ticker);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const formatElapsed = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 p-8 max-w-sm text-center">
        {/* Animated plane */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Plane className="w-10 h-10 text-primary animate-bounce" />
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>

        {/* Loading spinner */}
        <Loader2 className="w-6 h-6 text-primary animate-spin" />

        {/* Rotating messages */}
        <div className="h-8 flex items-center justify-center">
          <p
            className={cn(
              "text-lg font-medium text-foreground transition-all duration-300",
              isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
            )}
          >
            {LOADING_MESSAGES[messageIndex]}
          </p>
        </div>

        {/* Elapsed time */}
        <p className="text-sm text-muted-foreground tabular-nums">
          {formatElapsed(elapsed)} elapsed
        </p>

        {/* Cancel button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;
