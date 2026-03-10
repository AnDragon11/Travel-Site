import { useState, useRef, useEffect } from "react";
import { SavedTrip } from "@/lib/tripTypes";

export function useTripHistory(
  trip: SavedTrip,
  setTrip: React.Dispatch<React.SetStateAction<SavedTrip>>,
  skipAutoSaveRef: React.MutableRefObject<number>
) {
  const undoStackRef = useRef<SavedTrip[]>([]);
  const redoStackRef = useRef<SavedTrip[]>([]);
  const prevTripRef = useRef<SavedTrip | null>(null);
  const [historySize, setHistorySize] = useState(0);
  const [futureSize, setFutureSize] = useState(0);

  const undo = () => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    redoStackRef.current = [...redoStackRef.current, trip];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    setHistorySize(undoStackRef.current.length);
    setFutureSize(redoStackRef.current.length);
    skipAutoSaveRef.current++;
    prevTripRef.current = prev;
    setTrip(prev);
  };

  const redo = () => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current[redoStackRef.current.length - 1];
    undoStackRef.current = [...undoStackRef.current, trip];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    setHistorySize(undoStackRef.current.length);
    setFutureSize(redoStackRef.current.length);
    skipAutoSaveRef.current++;
    prevTripRef.current = next;
    setTrip(next);
  };

  // Stable refs so keyboard handler never goes stale
  const undoHandlerRef = useRef(undo);
  const redoHandlerRef = useRef(redo);
  undoHandlerRef.current = undo;
  redoHandlerRef.current = redo;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undoHandlerRef.current(); }
      else if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); redoHandlerRef.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { undo, redo, historySize, futureSize, undoStackRef, redoStackRef, prevTripRef, setHistorySize, setFutureSize };
}
