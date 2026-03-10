import { useState, useRef, useEffect, useMemo, Fragment } from "react"; // Fragment still used in row render
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Plane, Hotel, Utensils, Camera, MapPin, Clock, Plus, Trash2, Pencil, Save,
  Bus, ImagePlus, Tag,
  Calendar as CalendarIcon, Users, ArrowLeft, GripVertical, LogOut, Link2,
  ChevronDown, Upload, X as XIcon, Undo2, Redo2,
  AlertCircle, FileUp, FileDown, Printer, CopyPlus, Filter,
  ThumbsUp, ThumbsDown, DollarSign, Receipt,
} from "lucide-react";
import { usePreferences } from "@/context/PreferencesContext";
import { toast } from "sonner";
import { BuilderActivity, BuilderDay } from "@/lib/builderTypes";
import { activityTypeConfig, getActivityConfig, GAP, SLOT_WIDTH, BOND_COLOR_HEX } from "@/lib/builderConstants";
import { BuilderSlot, AddSlotCard } from "@/components/builder/BuilderSlot";
import { ActivityDialog } from "@/components/builder/ActivityDialog";
import { useSnakeCanvas } from "@/hooks/useSnakeCanvas";
import { useTripHistory } from "@/hooks/useTripHistory";


// ─── Storage ────────────────────────────────────────────────────────
import { loadTrips, saveTrip as saveToStorage, rowToSavedTrip } from "@/services/storageService";
import { SavedTrip } from "@/lib/tripTypes";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Collaborator, getCollaborators, getTripRole, leaveTrip, getTripOwnerProfile, transferOwnership, declineInvite,
} from "@/services/collaboratorService";
import ShareTripModal from "@/components/ShareTripModal";
import CollaboratorAvatars from "@/components/CollaboratorAvatars";
import {
  VoteSummary, TripExpense,
  getVotesForTrip, upsertVote, removeVote,
  getExpensesForTrip, addExpense, deleteExpense, calcBalances,
} from "@/services/groupTripService";

const generateId = () => Math.random().toString(36).substring(2, 10);

const createEmptyActivity = (type = "experience", subtype?: string): BuilderActivity => ({
  id: generateId(),
  type,
  subtype,
  name: "",
  time: "09:00",
  duration: "1h",
  location: "",
  cost: 0,
  notes: "",
  image_url: "",
  booking_url: "",
});

const createEmptyDay = (): BuilderDay => ({
  id: generateId(),
  date: "",
  activities: [],
});

const sortByTime = (acts: BuilderActivity[]) =>
  [...acts].sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));


// ─── Main Page ──────────────────────────────────────────────────────
const TripBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { currencySymbol, formatDate } = usePreferences();
  const fromExplore = (location.state as { from?: string } | null)?.from === 'explore';
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1000);

  // Collaboration state
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isOwner, setIsOwner] = useState<boolean | null>(null); // null = role not yet determined
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null); // current user has pending invite for this trip
  const [ownerProfile, setOwnerProfile] = useState<{ display_name: string | null; handle: string | null; avatar_url: string | null } | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const tripUpdatedAtRef = useRef<string>("");
  const [shareOpen, setShareOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [thumbnailPickerOpen, setThumbnailPickerOpen] = useState(false);
  const [openDayPicker, setOpenDayPicker] = useState<string | null>(null); // day ID with open calendar picker

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const skipAutoSaveRef = useRef(0); // incremented before programmatic setTrip calls to skip auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tripLoadedRef = useRef(false); // true once trip is fully loaded; prevents double-load on authLoading change

  const [trip, setTrip] = useState<SavedTrip>({
    id: crypto.randomUUID(),
    source: 'custom',
    title: "My Trip",
    destination: "",
    travelers: 1,
    days: [createEmptyDay()],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Undo / Redo history (up to 10 steps)
  const { undo: handleUndo, redo: handleRedo, historySize, futureSize, undoStackRef, redoStackRef, prevTripRef, setHistorySize, setFutureSize } = useTripHistory(trip, setTrip, skipAutoSaveRef);

  // Load existing trip if editing — only runs once per trip (tripLoadedRef prevents double-load on authLoading change)
  useEffect(() => {
    const stateTrip = (location.state as { trip?: SavedTrip } | null)?.trip;
    if (stateTrip) {
      if (!tripLoadedRef.current) {
        tripLoadedRef.current = true;
        skipAutoSaveRef.current++;
        setTrip(stateTrip);
      }
      return;
    }
    if (!id || authLoading || tripLoadedRef.current) return;
    loadTrips().then(async trips => {
      const found = trips.find(t => t.id === id);
      if (found) {
        tripLoadedRef.current = true;
        tripUpdatedAtRef.current = found.updatedAt;
        skipAutoSaveRef.current++;
        setTrip(found);
        return;
      }
      // Not in user's trips — try fetching directly (shared link, public trip)
      const { data } = await supabase.from("trips").select("*").eq("id", id).maybeSingle();
      if (data) {
        tripLoadedRef.current = true;
        tripUpdatedAtRef.current = data.updated_at ?? "";
        skipAutoSaveRef.current++;
        setTrip(rowToSavedTrip(data as Parameters<typeof rowToSavedTrip>[0]));
      } else if (!user) {
        navigate(`/login?redirect=/trip/${id}`, { replace: true });
      }
    });
  }, [id, authLoading]);

  // Determine role, load collaborators, and resolve owner profile
  useEffect(() => {
    if (!user) return;

    // New unsaved trip — current user is always the owner
    if (!id) {
      setIsOwner(true);
      setOwnerProfile({
        display_name: user.user_metadata?.display_name ?? null,
        handle: user.user_metadata?.handle ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      });
      return;
    }

    getTripRole(id, user.id).then(role => {
      if (role === "owner") {
        setIsOwner(true);
        setOwnerProfile({
          display_name: user.user_metadata?.display_name ?? null,
          handle: user.user_metadata?.handle ?? null,
          avatar_url: user.user_metadata?.avatar_url ?? null,
        });
      } else if (role === "editor") {
        setIsOwner(false);
        getTripOwnerProfile(id).then(p => { if (p) setOwnerProfile(p); }).catch(() => {});
      } else {
        // null = pending invite or no access — show pending invite banner
        setIsOwner(false);
        getTripOwnerProfile(id).then(p => { if (p) setOwnerProfile(p); }).catch(() => {});
        // Find this user's pending invite id for the accept button
        supabase.from("trip_collaborators")
          .select("id")
          .eq("trip_id", id)
          .eq("user_id", user.id)
          .eq("status", "pending")
          .maybeSingle()
          .then(({ data }) => { if (data) setPendingInviteId(data.id); });
      }
    });
    getCollaborators(id).then(setCollaborators).catch(() => {});
  }, [id, user]);

  // Group tools (votes + expenses) — only for collaborated trips
  const [groupPanelOpen] = useState(false); // kept for vote badge compat; loading now driven by overviewOpen
  const [groupTab, setGroupTab] = useState<"votes" | "expenses">("votes");
  const [votes, setVotes] = useState<VoteSummary[]>([]);
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [addingExpense, setAddingExpense] = useState(false);

  // Load group tools data when panel is opened
  useEffect(() => {
    if (!id || !overviewOpen || !user) return;
    if (collaborators.filter(c => c.status === "accepted").length === 0) return;
    getVotesForTrip(id).then(setVotes).catch(() => {});
    getExpensesForTrip(id).then(setExpenses).catch(() => {});
  }, [id, overviewOpen, user, collaborators]);

  // Real-time sync — two separate channels to prevent broadcast/postgres_changes conflicts
  useEffect(() => {
    if (!id) return;

    // Channel 1: broadcast-only for trip content sync between collaborators
    const broadcastChannel = supabase
      .channel(`trip-collab:${id}`, { config: { broadcast: { self: false, ack: false } } })
      .on("broadcast", { event: "trip_updated" }, ({ payload }) => {
        const { updatedAt, days } = payload as { updatedAt: string; days: BuilderDay[] };
        if (updatedAt <= tripUpdatedAtRef.current) return;
        toast.info("Trip updated by a collaborator");
        skipAutoSaveRef.current++;
        tripUpdatedAtRef.current = updatedAt;
        setTrip(prev => ({ ...prev, days, updatedAt }));
      })
      .subscribe();

    realtimeChannelRef.current = broadcastChannel;

    // Channel 2: postgres_changes for collaborator list updates only
    const pgChannel = supabase
      .channel(`trip-collabs-pg:${id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "trip_collaborators",
        filter: `trip_id=eq.${id}`,
      }, () => {
        getCollaborators(id).then(setCollaborators).catch(() => {});
      })
      .subscribe();

    return () => {
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(pgChannel);
      realtimeChannelRef.current = null;
    };
  }, [id]);

  // Polling fallback: if broadcast fails, catch changes within 5s by comparing updated_at
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from("trips")
          .select("updated_at")
          .eq("id", id)
          .maybeSingle();
        if (data?.updated_at && data.updated_at > tripUpdatedAtRef.current) {
          const { data: full } = await supabase.from("trips").select("*").eq("id", id).maybeSingle();
          if (full) {
            toast.info("Trip updated by a collaborator");
            skipAutoSaveRef.current++;
            tripUpdatedAtRef.current = full.updated_at ?? tripUpdatedAtRef.current;
            setTrip(rowToSavedTrip(full as Parameters<typeof rowToSavedTrip>[0]));
          }
        }
      } catch { /* ignore poll errors */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [id]);

  // Unmount cleanup for auto-save timers
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // Auto-save: fires 1.5s after any user-triggered trip change.
  // Does NOT return a cleanup — timers are cleared at the top of each non-skip run,
  // so a programmatic setTrip (skip run) never cancels a pending user-edit save.
  useEffect(() => {
    if (skipAutoSaveRef.current > 0) {
      skipAutoSaveRef.current--;
      prevTripRef.current = trip; // keep prev in sync for programmatic changes
      return;
    }
    // Don't auto-save trips we don't own (public trips viewed from Explore)
    if (isOwner === false) return;
    if (isOwner === null && id) return; // role not yet determined
    // User-initiated change: push previous trip state to undo history
    if (prevTripRef.current !== null) {
      undoStackRef.current = [...undoStackRef.current.slice(-9), prevTripRef.current];
      redoStackRef.current = [];
      setHistorySize(undoStackRef.current.length);
      setFutureSize(0);
    }
    prevTripRef.current = trip;
    // Never auto-save a brand-new trip in its default empty state — only save once
    // the user has actually added something (title, destination, or any named activity).
    // Also guard when `id` is in the URL but the trip was never found/loaded (tripLoadedRef stays false).
    if (!id || !tripLoadedRef.current) {
      const hasContent =
        trip.title.trim() !== "" && trip.title !== "My Trip" ||
        trip.destination.trim() !== "" ||
        trip.days.some(d => d.activities.some(a => a.name.trim() !== ""));
      if (!hasContent) return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setAutoSaveStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      try {
        let updated = { ...trip, updatedAt: new Date().toISOString() };

        // Pre-save merge: pull in any days added by collaborators that we don't have locally
        if (id) {
          const { data: dbCurrent } = await supabase
            .from("trips")
            .select("updated_at, days")
            .eq("id", updated.id)
            .maybeSingle();
          if (dbCurrent?.updated_at && dbCurrent.updated_at > tripUpdatedAtRef.current) {
            const dbDays = (dbCurrent.days as BuilderDay[]) ?? [];
            const localDayIds = new Set(updated.days.map((d: BuilderDay) => d.id));
            const newFromDB = dbDays.filter((d: BuilderDay) => !localDayIds.has(d.id));
            if (newFromDB.length > 0) {
              const mergedDays = [...updated.days, ...newFromDB];
              updated = { ...updated, days: mergedDays };
              skipAutoSaveRef.current++;
              tripUpdatedAtRef.current = dbCurrent.updated_at;
              setTrip(prev => ({ ...prev, days: mergedDays }));
            }
          }
        }

        await saveToStorage(updated);
        // Sync local updatedAt to what was written to DB so broadcast/poll echo is ignored
        tripUpdatedAtRef.current = updated.updatedAt;
        skipAutoSaveRef.current++;
        setTrip(prev => ({ ...prev, updatedAt: updated.updatedAt }));
        // Broadcast change to all collaborators on the same channel
        realtimeChannelRef.current?.send({
          type: "broadcast",
          event: "trip_updated",
          payload: { updatedAt: updated.updatedAt, days: updated.days },
        });
        setAutoSaveStatus("saved");
        savedTimerRef.current = setTimeout(() => setAutoSaveStatus("idle"), 2500);
        // For new trips, mark as loaded before navigating so the load effect doesn't re-fetch
        if (!id) {
          tripLoadedRef.current = true;
          navigate(`/trip/${updated.id}`, { replace: true });
        }
      } catch {
        setAutoSaveStatus("error");
      }
    }, 1500);
  }, [trip]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<BuilderActivity>(createEmptyActivity());
  const [editingDayId, setEditingDayId] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number>(-1); // -1 = adding new

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{ dayId: string; activityIndex: number } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{ dayId: string; activityIndex: number; position: 'before' | 'after'; rowIsRTL?: boolean } | null>(null);
  const dragScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Activity type filter
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  // Costs by day toggle
  const [showDayCosts, setShowDayCosts] = useState(false);

  // Track width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // ─── CRUD ──────────────────────────────────────────────────────
  const addDay = () => {
    setTrip((p) => ({ ...p, days: [...p.days, createEmptyDay()] }));
  };

  const removeDay = (dayId: string) => {
    if (trip.days.length <= 1) { toast.error("Need at least one day"); return; }
    setTrip((p) => ({ ...p, days: p.days.filter((d) => d.id !== dayId) }));
  };

  const openAddActivity = (dayId: string) => {
    setEditingDayId(dayId);
    setEditingIndex(-1);
    setEditingActivity(createEmptyActivity());
    setDialogOpen(true);
  };

  const openEditActivity = (dayId: string, index: number, activity: BuilderActivity) => {
    setEditingDayId(dayId);
    setEditingIndex(index);
    setEditingActivity({ ...activity });
    setDialogOpen(true);
  };

  const handleSaveActivity = (a: BuilderActivity, targetDayId?: string) => {
    // If moving to a different day, also move bonded card if present
    if (targetDayId && targetDayId !== editingDayId && editingIndex >= 0) {
      const isFlightDep = ((a.type === "transport" && a.subtype === "flight") || a.type === "flight") && !a.is_arrival;
      const isHotelCheckin = a.type === "accommodation" && !a.is_checkout;
      const bonded = isFlightDep
        ? trip.days.flatMap(d => d.activities).find(x => x.is_arrival && x.flight_bond_id === a.id)
        : isHotelCheckin
        ? trip.days.flatMap(d => d.activities).find(x => x.is_checkout && x.hotel_bond_id === a.id)
        : undefined;
      setTrip((p) => ({
        ...p,
        days: p.days.map((d) => {
          let acts = d.activities.filter(x => x.id !== a.id && !(bonded && x.id === bonded.id));
          if (d.id === targetDayId) acts = [...acts, a, ...(bonded ? [bonded] : [])];
          return { ...d, activities: sortByTime(acts) };
        }),
      }));
      if (bonded) {
        const label = isFlightDep ? "flight + arrival" : "check-in + check-out";
        toast.success(`Moved ${label} to the new day`);
      }
      return;
    }

    setTrip((p) => {
      // 1. Save the primary activity into its day
      const days = p.days.map((d) => {
        if (d.id !== editingDayId) return d;
        const acts = [...d.activities];
        if (editingIndex === -1) acts.push(a);
        else acts[editingIndex] = a;
        return { ...d, activities: sortByTime(acts) };
      });

      // 2. Auto-generate flight arrival when destination_airport is filled
      const isFlightType = (a.type === "transport" && a.subtype === "flight") || a.type === "flight";
      if (isFlightType && !a.is_arrival && a.destination_airport) {
        // Remove existing arrival linked to this departure (bond_id = departure id)
        const cleanDays = days.map(d => ({
          ...d,
          activities: d.activities.filter(x => !(x.is_arrival && x.flight_bond_id === a.id)),
        }));
        // Insert arrival right after the departure in the same day
        const arrival: BuilderActivity = {
          ...createEmptyActivity("transport", a.subtype ?? "flight"),
          name: `Arrive at ${a.destination_airport}`,
          location: a.destination_airport,
          time: a.time, // user can adjust
          duration: a.duration || "",
          airline: a.airline,
          flight_number: a.flight_number,
          flight_class: a.flight_class,
          luggage_checkin: a.luggage_checkin,
          luggage_cabin: a.luggage_cabin,
          flight_bond_id: a.id,
          is_arrival: true,
          image_url: a.image_url,
        };
        const updatedDays = cleanDays.map(d => {
          if (d.id !== editingDayId) return d;
          const depIdx = d.activities.findIndex(x => x.id === a.id);
          const acts = [...d.activities];
          acts.splice(depIdx + 1, 0, arrival);
          return { ...d, activities: sortByTime(acts) };
        });
        return { ...p, days: updatedDays };
      }

      // Remove arrival if destination_airport was cleared
      if (isFlightType && !a.is_arrival && !a.destination_airport) {
        const cleanDays = days.map(d => ({
          ...d,
          activities: d.activities.filter(x => !(x.is_arrival && x.flight_bond_id === a.id)),
        }));
        return { ...p, days: cleanDays };
      }

      // 3. Auto-generate hotel checkout when nights is filled on check-in
      if (a.type === "accommodation" && !a.is_checkout && a.nights) {
        // Find existing checkout before removing (preserve user-entered data like notes/booking)
        const existingCheckout = days.flatMap(d => d.activities).find(
          x => x.is_checkout && (x.hotel_bond_id === a.id || (!x.hotel_bond_id && x.location === a.location && !!x.location))
        );
        // Remove existing checkout — by bond ID, with location fallback for older/AI-generated trips
        const cleanDays = days.map(d => ({
          ...d,
          activities: d.activities.filter(x => !(
            x.is_checkout && (x.hotel_bond_id === a.id || (!x.hotel_bond_id && x.location === a.location && !!x.location))
          )),
        }));
        // Target day = check-in day index + nights; default checkout time 12:00
        const dayIdx = cleanDays.findIndex(d => d.id === editingDayId);
        const targetDayIdx = Math.min(dayIdx + a.nights, cleanDays.length - 1);
        const hotelName = (a.name || "").replace(/^Check-in:\s*/i, "") || a.location || "Hotel";
        const checkout: BuilderActivity = {
          ...(existingCheckout ?? createEmptyActivity("accommodation")),
          name: `Check-out: ${hotelName}`,
          location: a.location,
          time: a.checkout_time || existingCheckout?.time || "12:00",
          duration: "",
          hotel_bond_id: a.id,
          is_checkout: true,
          stars: a.stars,
          image_url: a.image_url,
        };
        const updatedDays = cleanDays.map((d, i) => {
          if (i !== targetDayIdx) return d;
          return { ...d, activities: sortByTime([...d.activities, checkout]) };
        });
        return { ...p, days: updatedDays };
      }

      // Remove checkout if nights was cleared
      if (a.type === "accommodation" && !a.is_checkout && !a.nights) {
        const cleanDays = days.map(d => ({
          ...d,
          activities: d.activities.filter(x => !(
            x.is_checkout && (x.hotel_bond_id === a.id || (!x.hotel_bond_id && x.location === a.location && !!x.location))
          )),
        }));
        return { ...p, days: cleanDays };
      }

      return { ...p, days };
    });
  };

  // Live-save: called on every field change when editing an existing activity
  const handleLiveSaveActivity = (a: BuilderActivity) => {
    if (editingIndex < 0) return;
    setTrip((p) => {
      let days = p.days.map((d) => {
        if (d.id !== editingDayId) return d;
        const acts = [...d.activities];
        acts[editingIndex] = a;
        return { ...d, activities: acts };
      });
      // Sync hotel partner card name/location live
      if (a.type === "accommodation" && !a.is_checkout) {
        const hotelName = (a.name || "").replace(/^Check-in:\s*/i, "");
        days = days.map(d => ({
          ...d,
          activities: d.activities.map(x =>
            x.is_checkout && x.hotel_bond_id === a.id
              ? { ...x, name: hotelName ? `Check-out: ${hotelName}` : x.name, location: a.location }
              : x
          ),
        }));
      } else if (a.type === "accommodation" && a.is_checkout && a.hotel_bond_id) {
        const hotelName = (a.name || "").replace(/^Check-out:\s*/i, "");
        days = days.map(d => ({
          ...d,
          activities: d.activities.map(x =>
            x.id === a.hotel_bond_id
              ? { ...x, name: hotelName ? `Check-in: ${hotelName}` : x.name }
              : x
          ),
        }));
      }
      // Sync flight arrival card fields live (airline, flight number, class, luggage)
      const isFlightDep = ((a.type === "transport" && a.subtype === "flight") || a.type === "flight") && !a.is_arrival;
      if (isFlightDep) {
        days = days.map(d => ({
          ...d,
          activities: d.activities.map(x =>
            x.is_arrival && x.flight_bond_id === a.id
              ? { ...x, airline: a.airline, flight_number: a.flight_number, flight_class: a.flight_class, luggage_checkin: a.luggage_checkin, luggage_cabin: a.luggage_cabin, image_url: a.image_url || x.image_url, duration: a.duration || x.duration }
              : x
          ),
        }));
      }
      return { ...p, days };
    });
  };

  // Revert: called on Cancel when editing — restores the original activity state
  const handleRevertActivity = (original: BuilderActivity) => {
    if (editingIndex < 0) return;
    setTrip((p) => ({
      ...p,
      days: p.days.map((d) => {
        if (d.id !== editingDayId) return d;
        const acts = [...d.activities];
        acts[editingIndex] = original;
        return { ...d, activities: acts };
      }),
    }));
  };

  const deleteActivity = (dayId: string, index: number) => {
    setTrip((p) => {
      // Get the activity being deleted so we can clean up bonded activities
      const day = p.days.find(d => d.id === dayId);
      const activity = day?.activities[index];
      const isFlightDep = activity && (activity.type === "transport" || activity.type === "flight") && !activity.is_arrival;
      const isHotelCheckin = activity?.type === "accommodation" && !activity.is_checkout;

      return {
        ...p,
        days: p.days.map((d) => {
          let acts = [...d.activities];
          // Remove the activity itself from its day
          if (d.id === dayId) acts = acts.filter((_, i) => i !== index);
          // Remove linked arrival if deleting a flight departure
          if (isFlightDep && activity) acts = acts.filter(x => !(x.is_arrival && x.flight_bond_id === activity.id));
          // Remove linked checkout if deleting a hotel check-in
          if (isHotelCheckin && activity) acts = acts.filter(x => !(x.is_checkout && x.hotel_bond_id === activity.id));
          return { ...d, activities: acts };
        }),
      };
    });
  };

  const copyActivity = (dayId: string, index: number) => {
    setTrip((p) => ({
      ...p,
      days: p.days.map((d) => {
        if (d.id !== dayId) return d;
        const copy = { ...d.activities[index], id: generateId() };
        const acts = [...d.activities];
        acts.splice(index + 1, 0, copy);
        return { ...d, activities: acts };
      }),
    }));
  };

  // Reorder activities - supports cross-day moves and insertion
  const reorderActivity = (
    sourceDayId: string,
    sourceIndex: number,
    targetDayId: string,
    targetIndex: number,
    position: 'before' | 'after'
  ) => {
    setTrip((p) => {
      const newDays = p.days.map(d => ({ ...d, activities: [...d.activities] }));

      // Find source and target days
      const sourceDayIdx = newDays.findIndex(d => d.id === sourceDayId);
      const targetDayIdx = newDays.findIndex(d => d.id === targetDayId);

      if (sourceDayIdx === -1 || targetDayIdx === -1) return p;

      // Remove activity from source day
      const [movedActivity] = newDays[sourceDayIdx].activities.splice(sourceIndex, 1);

      // Calculate insertion index based on position
      let insertIndex = targetIndex;

      // If moving within same day and moving forward, adjust for removal
      if (sourceDayId === targetDayId && sourceIndex < targetIndex) {
        insertIndex--;
      }

      // Adjust for before/after
      if (position === 'after') {
        insertIndex++;
      }

      // Insert into target day
      newDays[targetDayIdx].activities.splice(insertIndex, 0, movedActivity);

      return { ...p, days: newDays };
    });
  };

  // ─── Day Date with auto-populate ───────────────────────────────
  // Format a Date object to YYYY-MM-DD using local timezone (avoids UTC shift off-by-one)
  const localDateStr = (dt: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  };

  const handleDayDateChange = (dayId: string, dateStr: string) => {
    if (!dateStr) {
      setTrip(p => ({ ...p, days: p.days.map(d => d.id === dayId ? { ...d, date: dateStr } : d) }));
      return;
    }
    const changedIdx = trip.days.findIndex(d => d.id === dayId);
    if (changedIdx < 0) return;
    const base = new Date(dateStr + "T00:00:00");
    setTrip(p => ({
      ...p,
      days: p.days.map((d, i) => {
        const offset = i - changedIdx;
        const dt = new Date(base);
        dt.setDate(base.getDate() + offset);
        return { ...d, date: localDateStr(dt) };
      }),
    }));
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/trip/${id}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success("Link copied to clipboard!"))
      .catch(() => toast.error("Could not copy link"));
  };

  // ─── Delete confirmation ─────────────────────────────────────────
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteDayId, setDeleteDayId] = useState<string | null>(null);

  const confirmRemoveDay = (dayId: string) => {
    if (trip.days.length <= 1) { toast.error("Need at least one day"); return; }
    setDeleteDayId(dayId);
    setDeleteConfirmOpen(true);
  };

  const executeRemoveDay = () => {
    if (deleteDayId) {
      setTrip((p) => ({ ...p, days: p.days.filter((d) => d.id !== deleteDayId) }));
    }
    setDeleteConfirmOpen(false);
    setDeleteDayId(null);
  };

  // ─── JSON Export ─────────────────────────────────────────────────
  const handleExportJSON = () => {
    const json = JSON.stringify(trip, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${trip.title.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "trip"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Trip exported as JSON");
  };

  // ─── JSON Import ─────────────────────────────────────────────────
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as SavedTrip;
        if (!parsed.days || !Array.isArray(parsed.days)) throw new Error("Invalid trip file");
        // Give it a fresh ID to avoid collision, keep everything else
        const imported: SavedTrip = {
          ...parsed,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        skipAutoSaveRef.current++;
        tripLoadedRef.current = false; // allow re-save as new trip
        setTrip(imported);
        toast.success(`Imported "${imported.title}"`);
      } catch {
        toast.error("Invalid trip file — could not import");
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    e.target.value = "";
  };

  // ─── PDF Print ───────────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  const handleLeaveTrip = async () => {
    if (!id) return;
    try {
      if (isOwner) {
        // Transfer to oldest accepted collaborator before leaving
        const accepted = collaborators
          .filter(c => c.status === "accepted")
          .sort((a, b) => new Date(a.accepted_at ?? a.invited_at).getTime() - new Date(b.accepted_at ?? b.invited_at).getTime());
        if (accepted.length === 0) {
          toast.error("You're the only person on this trip. Delete it instead.");
          return;
        }
        await transferOwnership(id, accepted[0].user_id);
        toast.success(`Ownership transferred to @${accepted[0].profile.handle ?? accepted[0].profile.display_name}`);
      } else {
        await leaveTrip(id);
        toast.success("You've left the trip");
      }
      navigate("/profile");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to leave trip");
    }
  };

  const handleAcceptInvite = async () => {
    if (!pendingInviteId) return;
    try {
      const { error } = await supabase
        .from("trip_collaborators")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", pendingInviteId);
      if (error) throw error;
      setPendingInviteId(null);
      setIsOwner(false);
      getCollaborators(id!).then(setCollaborators).catch(() => {});
      toast.success("You've joined the trip!");
    } catch {
      toast.error("Failed to accept invite");
    }
  };

  // Canvas layout and bond colors — delegated to useSnakeCanvas hook
  const { rowLayouts, snakePath, hotelStayPaths, dayBadgePositions, svgHeight, bondColorMap, availableWidth } = useSnakeCanvas(trip, containerWidth);

  const totalCost = trip.days.reduce((t, d) => t + d.activities.reduce((s, a) => s + (a.cost || 0), 0), 0);

  // Group tools helpers
  const handleVote = async (activityId: string, v: 1 | -1) => {
    if (!id || !user) return;
    const existing = votes.find(x => x.activity_id === activityId);
    try {
      if (existing?.myVote === v) {
        await removeVote(id, activityId);
        setVotes(prev => prev.map(x => x.activity_id === activityId
          ? { ...x, myVote: 0, up: x.up - (v === 1 ? 1 : 0), down: x.down - (v === -1 ? 1 : 0) }
          : x));
      } else {
        await upsertVote(id, activityId, v);
        setVotes(prev => {
          const found = prev.find(x => x.activity_id === activityId);
          if (found) {
            return prev.map(x => x.activity_id === activityId ? {
              ...x, myVote: v,
              up: v === 1 ? x.up + 1 : (x.myVote === 1 ? x.up - 1 : x.up),
              down: v === -1 ? x.down + 1 : (x.myVote === -1 ? x.down - 1 : x.down),
            } : x);
          }
          return [...prev, { activity_id: activityId, up: v === 1 ? 1 : 0, down: v === -1 ? 1 : 0, myVote: v }];
        });
      }
    } catch { toast.error("Failed to save vote"); }
  };

  const handleAddExpense = async () => {
    if (!id || !expenseDesc.trim() || !expenseAmount) return;
    setAddingExpense(true);
    try {
      const exp = await addExpense(id, expenseDesc.trim(), Number(expenseAmount));
      setExpenses(prev => [...prev, exp]);
      setExpenseDesc("");
      setExpenseAmount("");
    } catch { toast.error("Failed to add expense"); }
    finally { setAddingExpense(false); }
  };

  const handleDeleteExpense = async (expId: string) => {
    try {
      await deleteExpense(expId);
      setExpenses(prev => prev.filter(e => e.id !== expId));
    } catch { toast.error("Failed to delete expense"); }
  };

  // Collaborator member IDs (owner + accepted collabs)
  const memberIds = [
    ...(trip.days.length > 0 && user ? [user.id] : []),
    ...collaborators.filter(c => c.status === "accepted").map(c => c.user_id ?? c.id),
  ];

  // Key activities for the overview panel (flights + hotel check-in/out only)
  const keyActivities = useMemo(() =>
    trip.days.flatMap((day, di) =>
      day.activities
        .filter(a => a.type === "flight" || a.type === "accommodation")
        .map(a => ({ ...a, dayLabel: day.date || `Day ${di + 1}` }))
    ),
  [trip.days]);

  // Separated flight/hotel activities + cost breakdown for the rich overview
  const flightActivities = useMemo(() =>
    trip.days.flatMap((day, di) =>
      day.activities
        .filter(a => (a.type === "flight" || (a.type === "transport" && a.subtype === "flight")) && !a.is_arrival)
        .map(a => ({ ...a, dayLabel: day.date ? formatDate(day.date) : `Day ${di + 1}` }))
    ),
  [trip.days, formatDate]);

  const hotelActivities = useMemo(() =>
    trip.days.flatMap((day, di) =>
      day.activities
        .filter(a => a.type === "accommodation" && !a.is_checkout)
        .map(a => ({ ...a, dayLabel: day.date ? formatDate(day.date) : `Day ${di + 1}` }))
    ),
  [trip.days, formatDate]);

  const costByCategory = useMemo(() => {
    const allActs = trip.days.flatMap(d => d.activities);
    const isFlightAct = (a: BuilderActivity) => a.type === "flight" || (a.type === "transport" && a.subtype === "flight");
    const sum = (acts: BuilderActivity[]) => acts.reduce((s, a) => s + (a.cost || 0), 0);
    return {
      flights:    sum(allActs.filter(isFlightAct)),
      hotels:     sum(allActs.filter(a => a.type === "accommodation")),
      dining:     sum(allActs.filter(a => ["food", "dining", "cafe"].includes(a.type))),
      transport:  sum(allActs.filter(a => a.type === "transport" && a.subtype !== "flight")),
      activities: sum(allActs.filter(a => ["experience", "activity", "sightseeing", "shopping"].includes(a.type))),
      other:      sum(allActs.filter(a => !isFlightAct(a) && !["accommodation","food","dining","cafe","transport","experience","activity","sightseeing","shopping"].includes(a.type))),
    };
  }, [trip.days]);

  // All activity image URLs available for thumbnail selection
  const activityImages = useMemo(() =>
    [...new Set(
      trip.days.flatMap(d => d.activities.map(a => a.image_url)).filter(Boolean)
    )],
  [trip.days]);

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      {id && (
        <ShareTripModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          tripId={id}
          tripTitle={trip.title}
        />
      )}
      <main className="flex-1 pt-16">
        {/* Hero Header */}
        <section className="relative text-primary-foreground py-8 md:py-12 overflow-hidden print:hidden">
          {/* Base gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />

          {/* Thumbnail — full-width background, scaled 110% to avoid hard edges, diagonal gradient overlay */}
          {trip.thumbnail && (
            <>
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${trip.thumbnail})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center right",
                  transform: "scale(1.1)",
                }}
              />
              {/* Diagonal gradient: fully opaque primary on text side, fades to semi-transparent right */}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(108deg, hsl(var(--primary)) 38%, hsl(var(--primary)/0.9) 52%, hsl(var(--primary)/0.55) 68%, hsl(var(--primary)/0.15) 85%)" }}
              />
            </>
          )}

          {/* Content */}
          <div className="relative z-10 container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 -ml-2" onClick={() => navigate(fromExplore ? "/explore" : "/profile")}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> {fromExplore ? "Explore" : "My Trips"}
                </Button>

                {/* Change thumbnail button */}
                <button
                  onClick={() => setThumbnailPickerOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-primary-foreground/60 hover:text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 rounded-lg px-2.5 py-1.5 transition-colors"
                  title="Change cover photo"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  {trip.thumbnail ? "Change Cover" : "Set Cover"}
                </button>
              </div>

              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                {/* Left: title, meta, action buttons */}
                <div className="space-y-3 flex-1 max-w-xl">
                  <input
                    value={trip.title}
                    onChange={(e) => setTrip((p) => ({ ...p, title: e.target.value }))}
                    className="text-3xl md:text-4xl font-bold bg-transparent border-none outline-none text-primary-foreground placeholder:text-primary-foreground/40 w-full"
                    placeholder="Trip Title"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-primary-foreground/10 rounded-lg px-3 py-1.5">
                      <MapPin className="w-4 h-4 text-primary-foreground/70" />
                      <input
                        value={trip.destination}
                        onChange={(e) => setTrip((p) => ({ ...p, destination: e.target.value }))}
                        className="bg-transparent border-none outline-none text-sm text-primary-foreground placeholder:text-primary-foreground/40 w-40"
                        placeholder="Destination"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 bg-primary-foreground/10 rounded-lg px-3 py-1.5">
                      <Users className="w-4 h-4 text-primary-foreground/70" />
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={trip.travelers}
                        onChange={(e) => setTrip((p) => ({ ...p, travelers: Number(e.target.value) || 1 }))}
                        className="bg-transparent border-none outline-none text-sm text-primary-foreground w-12"
                      />
                      <span className="text-sm text-primary-foreground/70">travelers</span>
                    </div>
                  </div>

                  {/* Collaborate / Share buttons — left side */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {isOwner && id && (
                      <div className="flex items-center rounded-md overflow-hidden border border-primary-foreground/20 text-sm shrink-0">
                        <button
                          onClick={() => setShareOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
                          title="Invite collaborators"
                        >
                          <Users className="w-3.5 h-3.5" /> Collaborate
                        </button>
                        <div className="w-px self-stretch bg-primary-foreground/20" />
                        <button
                          onClick={handleCopyLink}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
                          title="Copy share link"
                        >
                          <Link2 className="w-3.5 h-3.5" /> Share Link
                        </button>
                      </div>
                    )}

                    {/* Save a Copy — shown when viewing a public trip you don't own */}
                    {user && isOwner === false && (
                      <Button
                        size="sm"
                        className="gap-1.5 shrink-0"
                        onClick={async () => {
                          try {
                            const copy: import("@/lib/tripTypes").SavedTrip = {
                              ...trip,
                              id: crypto.randomUUID(),
                              source: 'custom',
                              isBucketList: false,
                              isPublic: false,
                              isFavorite: false,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            };
                            await saveToStorage(copy);
                            toast.success("Saved a copy to your trips!");
                            navigate(`/trip/${copy.id}`, { replace: true });
                          } catch {
                            toast.error("Failed to save a copy");
                          }
                        }}
                      >
                        <CopyPlus className="w-3.5 h-3.5" /> Use this itinerary
                      </Button>
                    )}

                    {/* Auto-save status — always rendered, opacity toggle avoids layout shifts */}
                    <span className={cn(
                      "flex items-center gap-1 text-xs shrink-0 transition-opacity duration-300 w-16",
                      autoSaveStatus === "idle" ? "opacity-0 pointer-events-none" : "opacity-100",
                      autoSaveStatus === "error" ? "text-red-300" : "text-primary-foreground/60"
                    )}>
                      {autoSaveStatus === "saving" && (
                        <><span className="w-3 h-3 border border-primary-foreground/40 border-t-transparent rounded-full animate-spin shrink-0" />Saving…</>
                      )}
                      {autoSaveStatus === "saved" && (
                        <><Save className="w-3 h-3 shrink-0" />Saved</>
                      )}
                      {autoSaveStatus === "error" && "Save failed"}
                    </span>

                    {/* Collaborator: leave trip */}
                    {isOwner === false && id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                        onClick={handleLeaveTrip}
                      >
                        <LogOut className="w-4 h-4" /> Leave Trip
                      </Button>
                    )}
                  </div>
                </div>

                {/* Right: avatars + total cost */}
                <div className="flex items-center gap-3 shrink-0">
                  {(ownerProfile || collaborators.length > 0) && (
                    <CollaboratorAvatars collaborators={collaborators} ownerProfile={ownerProfile} />
                  )}
                  <div className="text-right">
                    <p className="text-primary-foreground/70 text-xs">Total Cost</p>
                    <p className="text-2xl font-bold">{currencySymbol}{totalCost.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Trip Summary — rich overview panel below hero ── */}
        {(flightActivities.length > 0 || hotelActivities.length > 0 || totalCost > 0 || (id && user && collaborators.filter(c => c.status === "accepted").length > 0)) && (
          <div className="bg-card border-b border-border print:hidden">
            <div className="container mx-auto px-4">
              <div className="max-w-6xl mx-auto">
                <button
                  onClick={() => setOverviewOpen(v => !v)}
                  className="flex items-center justify-between py-3 w-full text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Plane className="w-4 h-4 text-primary" />
                    Trip Summary
                  </span>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", overviewOpen && "rotate-180")} />
                </button>

                {overviewOpen && (
                  <div className="pb-5 space-y-5">

                    {/* Row 1: Flights · Hotels · Cost Breakdown */}
                    {(flightActivities.length > 0 || hotelActivities.length > 0 || totalCost > 0) && (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

                        {/* Flights */}
                        {flightActivities.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              <Plane className="w-3.5 h-3.5 text-sky-500" /> Flights
                            </h4>
                            {flightActivities.map((a) => (
                              <div key={a.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50">
                                <Plane className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1 text-xs">
                                  <p className="font-semibold text-foreground truncate">{a.name}</p>
                                  {(a.airline || a.flight_number) && (
                                    <p className="text-muted-foreground">{[a.airline, a.flight_number].filter(Boolean).join(" · ")}</p>
                                  )}
                                  <p className="text-muted-foreground">{a.dayLabel}{a.time ? ` · ${a.time}` : ""}</p>
                                </div>
                                {a.cost > 0 && <span className="text-xs font-bold text-sky-600 dark:text-sky-400 shrink-0">{currencySymbol}{a.cost.toLocaleString()}</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Hotels */}
                        {hotelActivities.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              <Hotel className="w-3.5 h-3.5 text-amber-500" /> Hotels
                            </h4>
                            {hotelActivities.map((a) => (
                              <div key={a.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50">
                                <Hotel className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1 text-xs">
                                  <p className="font-semibold text-foreground truncate">{a.name}</p>
                                  {(a.nights || a.stars) && (
                                    <p className="text-muted-foreground">
                                      {a.nights ? `${a.nights} night${a.nights !== 1 ? "s" : ""}` : ""}
                                      {a.nights && a.stars ? " · " : ""}
                                      {a.stars ? "★".repeat(Math.min(a.stars, 5)) : ""}
                                    </p>
                                  )}
                                  <p className="text-muted-foreground">{a.dayLabel}</p>
                                </div>
                                {a.cost > 0 && <span className="text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">{currencySymbol}{a.cost.toLocaleString()}</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Cost Breakdown */}
                        {totalCost > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Cost Breakdown
                            </h4>
                            <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                              {[
                                { label: "Flights",    icon: Plane,    color: "text-sky-500",            amount: costByCategory.flights },
                                { label: "Hotels",     icon: Hotel,    color: "text-amber-500",          amount: costByCategory.hotels },
                                { label: "Dining",     icon: Utensils, color: "text-orange-500",         amount: costByCategory.dining },
                                { label: "Transport",  icon: Bus,      color: "text-violet-500",         amount: costByCategory.transport },
                                { label: "Activities", icon: Camera,   color: "text-emerald-500",        amount: costByCategory.activities },
                                { label: "Other",      icon: Tag,      color: "text-muted-foreground",   amount: costByCategory.other },
                              ].filter(c => c.amount > 0).map(({ label, icon: Icon, color, amount }) => (
                                <div key={label} className="flex items-center justify-between gap-2 text-xs">
                                  <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <Icon className={cn("w-3 h-3", color)} />{label}
                                  </span>
                                  <span className="font-semibold text-foreground">{currencySymbol}{amount.toLocaleString()}</span>
                                </div>
                              ))}
                              <div className="pt-1.5 border-t border-border flex items-center justify-between text-sm font-bold text-foreground">
                                <span>Total</span>
                                <span>{currencySymbol}{totalCost.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Row 2: Group section — collaborative trips only */}
                    {id && user && collaborators.filter(c => c.status === "accepted").length > 0 && (
                      <div className="space-y-3 border-t border-border pt-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-primary" /> Group
                        </h4>

                        {/* Member balance cards */}
                        {memberIds.length > 0 && (() => {
                          const nets = expenses.length > 0 && memberIds.length > 1 ? calcBalances(expenses, memberIds) : {};
                          const profileMap: Record<string, { name: string; avatar?: string }> = {};
                          if (user) profileMap[user.id] = { name: user.user_metadata?.display_name ?? "You", avatar: user.user_metadata?.avatar_url };
                          collaborators.forEach(c => {
                            const uid = c.user_id ?? c.id;
                            profileMap[uid] = { name: c.profile.display_name ?? c.profile.handle ?? "Member", avatar: c.profile.avatar_url };
                          });
                          return (
                            <div className="flex flex-wrap gap-2">
                              {memberIds.map(uid => {
                                const prof = profileMap[uid] ?? { name: "Member" };
                                const net = nets[uid] ?? 0;
                                return (
                                  <div key={uid} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card border border-border min-w-[120px]">
                                    {prof.avatar
                                      ? <img src={prof.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                                      : <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">{prof.name.slice(0, 1).toUpperCase()}</div>
                                    }
                                    <div>
                                      <p className="text-xs font-medium text-foreground">{uid === user.id ? "You" : prof.name}</p>
                                      {expenses.length > 0 && (
                                        <p className={cn("text-xs font-semibold", net > 0 ? "text-emerald-600" : net < 0 ? "text-red-500" : "text-muted-foreground")}>
                                          {Math.abs(net) < 0.01 ? "Settled" : `${net > 0 ? "+" : ""}${currencySymbol}${Math.abs(net).toFixed(2)}`}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {/* Votes + Expenses tabs */}
                        <div className="rounded-xl border border-border overflow-hidden">
                          <div className="flex border-b border-border">
                            {(["votes", "expenses"] as const).map(tab => (
                              <button
                                key={tab}
                                onClick={() => setGroupTab(tab)}
                                className={cn(
                                  "flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize",
                                  groupTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                              >
                                {tab === "votes" ? <ThumbsUp className="w-3.5 h-3.5" /> : <Receipt className="w-3.5 h-3.5" />}
                                {tab}
                              </button>
                            ))}
                          </div>

                          {/* ── Votes tab ── */}
                          {groupTab === "votes" && (
                            <div className="p-4 space-y-2">
                              <p className="text-xs text-muted-foreground mb-3">Vote on activities to help the group decide what to keep.</p>
                              {trip.days.flatMap(d => d.activities).length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No activities yet.</p>
                              ) : (
                                trip.days.flatMap((d, di) => d.activities.map((a) => {
                                  const v = votes.find(x => x.activity_id === a.id);
                                  return (
                                    <div key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-xs text-muted-foreground shrink-0">D{di + 1}</span>
                                        <span className="text-sm font-medium truncate">{a.name || "Untitled"}</span>
                                        {a.location && <span className="text-xs text-muted-foreground truncate hidden sm:block">· {a.location}</span>}
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          onClick={() => handleVote(a.id, 1)}
                                          className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all border", v?.myVote === 1 ? "bg-emerald-100 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300" : "border-border bg-background text-muted-foreground hover:text-emerald-600")}
                                        >
                                          <ThumbsUp className="w-3 h-3" />{v?.up ?? 0}
                                        </button>
                                        <button
                                          onClick={() => handleVote(a.id, -1)}
                                          className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all border", v?.myVote === -1 ? "bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300" : "border-border bg-background text-muted-foreground hover:text-red-500")}
                                        >
                                          <ThumbsDown className="w-3 h-3" />{v?.down ?? 0}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }))
                              )}
                            </div>
                          )}

                          {/* ── Expenses tab ── */}
                          {groupTab === "expenses" && (
                            <div className="p-4 space-y-4">
                              <div className="flex gap-2 items-end">
                                <div className="flex-1 space-y-1">
                                  <label className="text-xs text-muted-foreground">Description</label>
                                  <input
                                    value={expenseDesc}
                                    onChange={e => setExpenseDesc(e.target.value)}
                                    placeholder="e.g. Dinner at La Piazza"
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                  />
                                </div>
                                <div className="w-28 space-y-1">
                                  <label className="text-xs text-muted-foreground">Amount ({currencySymbol})</label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={expenseAmount}
                                    onChange={e => setExpenseAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                  />
                                </div>
                                <Button size="sm" disabled={addingExpense || !expenseDesc.trim() || !expenseAmount} onClick={handleAddExpense} className="shrink-0">
                                  {addingExpense ? <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                </Button>
                              </div>
                              {expenses.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No expenses logged yet.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {expenses.map(exp => (
                                    <div key={exp.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted/40 text-sm">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <DollarSign className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        <span className="truncate font-medium">{exp.description}</span>
                                        <span className="text-muted-foreground text-xs shrink-0">
                                          by {exp.paid_by_profile?.display_name ?? exp.paid_by_profile?.handle ?? "someone"}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-bold text-foreground">{currencySymbol}{Number(exp.amount).toLocaleString()}</span>
                                        {exp.paid_by === user.id && (
                                          <button onClick={() => handleDeleteExpense(exp.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pending invite banner */}
        {pendingInviteId && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-3 print:hidden">
            <div className="container mx-auto max-w-6xl flex items-center justify-between gap-4">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <span className="font-semibold">{ownerProfile?.display_name ?? ownerProfile?.handle ?? "Someone"}</span> invited you to collaborate on this trip.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" onClick={handleAcceptInvite} className="gap-1.5">
                  Accept & Join
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-amber-700 dark:text-amber-400"
                  onClick={async () => {
                    if (pendingInviteId) {
                      try { await declineInvite(pendingInviteId); } catch { /* non-critical */ }
                    }
                    navigate("/profile");
                  }}
                >
                  Decline
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Print-only trip header */}
        <div className="hidden print:block px-8 pt-6 pb-4 border-b-2 border-gray-300">
          <h1 className="text-2xl font-bold text-black">{trip.title}</h1>
          {trip.destination && <p className="text-sm text-gray-600 mt-0.5">📍 {trip.destination}</p>}
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
            <span>{trip.days.length} day{trip.days.length !== 1 ? "s" : ""}</span>
            <span>{trip.travelers} traveler{trip.travelers !== 1 ? "s" : ""}</span>
            {totalCost > 0 && <span>{currencySymbol}{totalCost.toLocaleString()} total</span>}
          </div>
        </div>

        {/* Journey Section */}
        <section className="py-6 pb-12">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto" ref={containerRef}>
              <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
                {/* Left: filter toggle + inline chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  {trip.days.some(d => d.activities.length > 0) && (
                    <button
                      onClick={() => setFilterOpen(v => !v)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all shrink-0",
                        (filterOpen || filterTypes.length > 0)
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      {filterTypes.length > 0 ? `${filterTypes.length} active` : "Filter"}
                    </button>
                  )}
                  {filterOpen && trip.days.some(d => d.activities.length > 0) && (
                    <>
                      {Object.entries(activityTypeConfig)
                        .filter(([key]) => ["transport","accommodation","food","experience","flight","sightseeing","activity","shopping","dining","cafe"].includes(key))
                        .filter(([key]) => trip.days.some(d => d.activities.some(a => a.type === key || a.subtype === key)))
                        .map(([key, cfg]) => {
                          const Icon = cfg.icon;
                          const active = filterTypes.includes(key);
                          return (
                            <button
                              key={key}
                              onClick={() => setFilterTypes(prev => prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key])}
                              className={cn(
                                "flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition-all",
                                active ? cn("border-transparent", cfg.bgColor, cfg.color) : "border-border bg-background text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <Icon className="w-3 h-3" />{cfg.label}
                            </button>
                          );
                        })}
                      {filterTypes.length > 0 && (
                        <button onClick={() => setFilterTypes([])} className="text-xs text-muted-foreground hover:text-foreground underline">
                          Clear
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Undo / Redo */}
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={historySize === 0} onClick={handleUndo}
                    title={`Undo (${historySize} step${historySize !== 1 ? "s" : ""}) — Ctrl+Z`}>
                    <Undo2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={futureSize === 0} onClick={handleRedo}
                    title={`Redo (${futureSize} step${futureSize !== 1 ? "s" : ""}) — Ctrl+Y`}>
                    <Redo2 className="w-4 h-4" />
                  </Button>

                  {/* Divider */}
                  <div className="w-px h-5 bg-border mx-1" />

                  {/* Import JSON */}
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground"
                    title="Import trip from JSON" onClick={() => importFileRef.current?.click()}>
                    <FileUp className="w-4 h-4" />
                  </Button>
                  <input ref={importFileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportJSON} />

                  {/* Export JSON */}
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground"
                    title="Export trip as JSON" onClick={handleExportJSON}>
                    <FileDown className="w-4 h-4" />
                  </Button>

                  {/* Print / PDF */}
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground"
                    title="Print / Save as PDF" onClick={handlePrint}>
                    <Printer className="w-4 h-4" />
                  </Button>

                  {/* Divider */}
                  <div className="w-px h-5 bg-border mx-1" />

                  {/* Costs by day toggle */}
                  <Button
                    variant={showDayCosts ? "default" : "ghost"}
                    size="icon"
                    className="w-8 h-8"
                    title={showDayCosts ? "Hide day costs" : "Show cost per day"}
                    onClick={() => setShowDayCosts(v => !v)}
                  >
                    <span className="text-xs font-bold">{currencySymbol}</span>
                  </Button>
                </div>
              </div>


              {/* Journey Canvas — hidden on print */}
              <div className="relative print:hidden" style={{ height: svgHeight }}>
                {/* SVG Snake Path */}
                <svg className="absolute inset-0 pointer-events-none" width={containerWidth} height={svgHeight} style={{ overflow: "visible" }}>
                  <path d={snakePath} fill="none" stroke="hsl(var(--border))" strokeWidth="3" strokeOpacity="0.75" strokeLinecap="round" strokeLinejoin="round" />
                  {hotelStayPaths.map(({ path, color }, i) => (
                    <path key={i} d={path} fill="none" stroke={color} strokeWidth="3.5" strokeOpacity="0.6" strokeLinecap="round" strokeLinejoin="round" />
                  ))}
                </svg>

                {/* Day badges on connector lines */}
                {dayBadgePositions.map((pos, idx) => {
                  const dayIndex = trip.days.findIndex((d) => d.id === pos.day.id);
                  const isFirst = dayIndex === 0;
                  const dayCost = showDayCosts ? pos.day.activities.reduce((s, a) => s + (a.cost || 0), 0) : 0;
                  return (
                    <>
                    {showDayCosts && dayCost > 0 && (
                      <div
                        key={`cost-${idx}`}
                        className="absolute text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full z-20 whitespace-nowrap"
                        style={{ left: pos.x, top: pos.y + 24, transform: "translate(-50%, 0)" }}
                      >
                        {currencySymbol}{dayCost.toLocaleString()}
                      </div>
                    )}

                    <div key={idx} className="absolute flex items-center gap-2 bg-background pl-0.5 pr-3 h-10 rounded-full shadow-lg border border-border z-20" style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }}>
                      <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center shrink-0">{dayIndex + 1}</div>
                      <Popover open={openDayPicker === pos.day.id} onOpenChange={(v) => setOpenDayPicker(v ? pos.day.id : null)}>
                        <PopoverTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary transition-colors whitespace-nowrap"
                          >
                            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            {pos.day.date
                              ? formatDate(pos.day.date)
                              : "Set date"}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="center" onClick={(e) => e.stopPropagation()}>
                          <Calendar
                            mode="single"
                            selected={pos.day.date ? new Date(pos.day.date + "T00:00:00") : undefined}
                            onSelect={(date) => {
                              if (!date) return;
                              handleDayDateChange(pos.day.id, localDateStr(date));
                              setOpenDayPicker(null);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {(!isFirst || trip.days.length > 1) && (
                        <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => confirmRemoveDay(pos.day.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    </>
                  );
                })}

                {/* Activity rows */}
                {rowLayouts.map((row) => (
                  <div key={`row-${row.rowIndex}`} className={cn("absolute flex items-center", row.isRTL && "flex-row-reverse")} style={{ top: row.top, left: row.rowLeft, width: row.rowWidth }}>
                    {row.slots.map((slot, slotIndex) => {
                      const isAdd = slot === "add";
                      // Show transport/gap before any slot (including add) after the first
                      const showTransport = slotIndex > 0;
                      const activity = isAdd ? null : (slot as BuilderActivity);

                      // Count activities in previous rows of the same day to compute the global index
                      let prevCount = 0;
                      for (const r of rowLayouts) {
                        if (r.dayIndex === row.dayIndex && r.rowIndex < row.rowIndex) {
                          prevCount += r.slots.filter((s) => s !== "add").length;
                        }
                      }
                      // Compute proper activity index excluding the "add" slot
                      const realSlotIndex = row.slots.slice(0, slotIndex).filter((s) => s !== "add").length;
                      const globalActIndex = prevCount + realSlotIndex;

                      // Determine if this activity can be dragged
                      const isDraggable = !isAdd && !(
                        trip.source === 'ai' &&
                        (activity!.type === 'flight' || activity!.type === 'accommodation')
                      );

                      const currentDayId = trip.days[row.dayIndex].id;
                      const isSelf = draggedItem?.dayId === currentDayId && draggedItem?.activityIndex === globalActIndex;
                      const isDragging = isSelf;
                      const isDragOver = !isAdd && !isSelf && dragOverItem?.dayId === currentDayId && dragOverItem?.activityIndex === globalActIndex;
                      const dropPosition = isDragOver ? dragOverItem?.position : undefined;

                      // For "Add Activity" slot
                      const isAddDragOver = isAdd && dragOverItem?.dayId === currentDayId && dragOverItem?.activityIndex === -1;

                      // AddSlotCard bond color — inherits the snake segment color if last activity has an open bond
                      const addSlotBondColor = (() => {
                        if (!isAdd) return undefined;
                        const day = trip.days[row.dayIndex];
                        if (!day || day.activities.length === 0) return undefined;
                        const last = day.activities[day.activities.length - 1];
                        if (last.type === 'accommodation' && !last.is_checkout && last.hotel_bond_id) {
                          const hasCheckout = day.activities.some(a => a.is_checkout && a.hotel_bond_id === last.hotel_bond_id);
                          if (!hasCheckout) return BOND_COLOR_HEX[bondColorMap[last.hotel_bond_id]];
                        }
                        const isFlightDep = (last.type === 'transport' && last.subtype === 'flight') || last.type === 'flight';
                        if (isFlightDep && !last.is_arrival && last.flight_bond_id) {
                          const hasArrival = day.activities.some(a => a.is_arrival && a.flight_bond_id === last.flight_bond_id);
                          if (!hasArrival) return BOND_COLOR_HEX[bondColorMap[last.flight_bond_id]];
                        }
                        return undefined;
                      })();

                      const gap = showTransport && <div className="shrink-0" style={{ width: GAP }} />;

                      const slotKey = isAdd ? `add-${row.dayIndex}` : activity!.id;
                      return (
                        <Fragment key={slotKey}>
                        <div
                          className={cn(
                            "flex items-center",
                            !isAdd && filterTypes.length > 0 && !filterTypes.includes(activity!.type) && !filterTypes.includes(activity!.subtype ?? "") && "opacity-20"
                          )}
                        >
                          {!row.isRTL && gap}
                          {isAdd ? (
                            <AddSlotCard
                              onClick={() => openAddActivity(trip.days[row.dayIndex].id)}
                              isDragOver={isAddDragOver}
                              bondColor={addSlotBondColor}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const SCROLL_ZONE = 80;
                                const SCROLL_SPEED = 10;
                                if (dragScrollRef.current) clearInterval(dragScrollRef.current);
                                if (e.clientY < SCROLL_ZONE) {
                                  dragScrollRef.current = setInterval(() => window.scrollBy(0, -SCROLL_SPEED), 16);
                                } else if (e.clientY > window.innerHeight - SCROLL_ZONE) {
                                  dragScrollRef.current = setInterval(() => window.scrollBy(0, SCROLL_SPEED), 16);
                                }
                                setDragOverItem({ dayId: currentDayId, activityIndex: -1, position: 'after' });
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (draggedItem && dragOverItem) {
                                  const targetDay = trip.days[row.dayIndex];
                                  const lastIndex = targetDay.activities.length - 1;
                                  reorderActivity(
                                    draggedItem.dayId,
                                    draggedItem.activityIndex,
                                    currentDayId,
                                    lastIndex,
                                    'after'
                                  );
                                }
                                setDraggedItem(null);
                                setDragOverItem(null);
                              }}
                            />
                          ) : (
                            <div className="relative">
                            {/* Vote badge — shown when overview is open and activity has votes */}
                            {overviewOpen && !isAdd && (votes.find(x => x.activity_id === activity!.id)?.up ?? 0) + (votes.find(x => x.activity_id === activity!.id)?.down ?? 0) > 0 && (
                              <div className="absolute bottom-1 left-1 z-20 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 border border-border text-[10px] font-semibold pointer-events-none">
                                {(votes.find(x => x.activity_id === activity!.id)?.up ?? 0) > 0 && <span className="text-emerald-600 flex items-center gap-0.5"><ThumbsUp className="w-2.5 h-2.5" />{votes.find(x => x.activity_id === activity!.id)?.up}</span>}
                                {(votes.find(x => x.activity_id === activity!.id)?.down ?? 0) > 0 && <span className="text-red-500 flex items-center gap-0.5"><ThumbsDown className="w-2.5 h-2.5" />{votes.find(x => x.activity_id === activity!.id)?.down}</span>}
                              </div>
                            )}
                            <BuilderSlot
                              activity={activity!}
                              onEdit={() => openEditActivity(trip.days[row.dayIndex].id, globalActIndex, activity!)}
                              onDelete={() => deleteActivity(trip.days[row.dayIndex].id, globalActIndex)}
                              onCopy={() => copyActivity(trip.days[row.dayIndex].id, globalActIndex)}
                              currencySymbol={currencySymbol}
                              bondColor={
                                activity!.flight_bond_id ? bondColorMap[activity!.flight_bond_id]
                                : activity!.hotel_bond_id ? bondColorMap[activity!.hotel_bond_id]
                                : bondColorMap[activity!.id]
                              }
                              isRTL={row.isRTL}
                              isDraggable={isDraggable && filterTypes.length === 0}
                              isDragging={isDragging}
                              isDragOver={isDragOver}
                              dropPosition={dropPosition}
                              onDragStart={(e) => {
                                e.stopPropagation();
                                // Show the full card as drag image (not just the browser's partial capture)
                                const el = e.currentTarget as HTMLElement;
                                e.dataTransfer.setDragImage(el, el.offsetWidth / 2, 30);
                                setDraggedItem({ dayId: currentDayId, activityIndex: globalActIndex });
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();

                                // Auto-scroll when dragging near top/bottom of viewport
                                const SCROLL_ZONE = 80;
                                const SCROLL_SPEED = 10;
                                if (dragScrollRef.current) clearInterval(dragScrollRef.current);
                                if (e.clientY < SCROLL_ZONE) {
                                  dragScrollRef.current = setInterval(() => window.scrollBy(0, -SCROLL_SPEED), 16);
                                } else if (e.clientY > window.innerHeight - SCROLL_ZONE) {
                                  dragScrollRef.current = setInterval(() => window.scrollBy(0, SCROLL_SPEED), 16);
                                }

                                // Calculate drop position based on mouse X relative to slot center
                                const rect = e.currentTarget.getBoundingClientRect();
                                const position: 'before' | 'after' = e.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
                                setDragOverItem({ dayId: currentDayId, activityIndex: globalActIndex, position, rowIsRTL: row.isRTL });
                              }}
                              onDragEnd={() => {
                                if (dragScrollRef.current) { clearInterval(dragScrollRef.current); dragScrollRef.current = null; }
                                if (draggedItem && dragOverItem && dragOverItem.activityIndex !== -1) {
                                  // Flip position for RTL rows: mouse 'before' (left half) = visual 'after' in sequence
                                  const logicalPos = dragOverItem.rowIsRTL
                                    ? (dragOverItem.position === 'before' ? 'after' : 'before')
                                    : dragOverItem.position;
                                  reorderActivity(
                                    draggedItem.dayId,
                                    draggedItem.activityIndex,
                                    dragOverItem.dayId,
                                    dragOverItem.activityIndex,
                                    logicalPos
                                  );
                                }
                                setDraggedItem(null);
                                setDragOverItem(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            />
                            </div>
                          )}
                          {row.isRTL && gap}
                        </div>
                        </Fragment>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Add Day — bottom of timeline */}
              <div className="flex justify-center mt-8 print:hidden">
                <Button variant="outline" onClick={addDay} className="gap-2 px-6">
                  <Plus className="w-4 h-4" /> Add Day
                </Button>
              </div>


              {/* ── Print-only itinerary view ── */}
              <div className="hidden print:block space-y-8">
                {trip.days.map((day, di) => {
                  const dayLabel = day.date
                    ? new Date(day.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
                    : `Day ${di + 1}`;
                  return (
                    <div key={day.id} style={{ breakInside: "avoid" }}>
                      <div className="flex items-center gap-3 mb-3 pb-2 border-b-2 border-gray-200">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">{di + 1}</div>
                        <div>
                          <p className="font-bold text-base text-foreground">{dayLabel}</p>
                          {day.theme && day.theme !== `Day ${di + 1}` && (
                            <p className="text-xs text-muted-foreground">{day.theme}</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 pl-11">
                        {day.activities.map((act) => {
                          const cfg = getActivityConfig(act);
                          const Icon = cfg.icon;
                          return (
                            <div key={act.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                              <div className="flex items-center gap-1 w-14 shrink-0">
                                <Icon className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs font-bold text-foreground">{act.time}</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-foreground">{act.name || "Untitled"}</p>
                                {act.location && <p className="text-xs text-muted-foreground">{act.location}</p>}
                                {act.notes && <p className="text-xs text-gray-500 mt-0.5">{act.notes}</p>}
                                {act.booking_url && <p className="text-xs text-blue-600 mt-0.5">{act.booking_url}</p>}
                              </div>
                              <div className="text-right shrink-0">
                                {act.duration && <p className="text-xs text-muted-foreground">{act.duration}</p>}
                                {act.cost > 0 && <p className="text-xs font-bold text-foreground">{currencySymbol}{act.cost.toLocaleString()}</p>}
                              </div>
                            </div>
                          );
                        })}
                        {day.activities.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">No activities</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="pt-4 border-t-2 border-gray-200 flex justify-between text-sm font-bold">
                  <span>Total Cost</span>
                  <span>{currencySymbol}{totalCost.toLocaleString()}</span>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Pencil className="w-3 h-3" />
                  <span>Click activity to edit</span>
                </div>
                <div className="flex items-center gap-2">
                  <Plus className="w-3 h-3" />
                  <span>Click + to add a new activity</span>
                </div>
                <div className="flex items-center gap-2">
                  <GripVertical className="w-3 h-3" />
                  <span>Drag to reorder activities</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Thumbnail Picker Modal */}
      {thumbnailPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setThumbnailPickerOpen(false)}>
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <ImagePlus className="w-4 h-4 text-primary" /> Choose Cover Photo
              </h3>
              <button onClick={() => setThumbnailPickerOpen(false)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Upload custom */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Upload Custom</p>
                <label className="flex items-center gap-2 cursor-pointer w-fit bg-muted hover:bg-accent rounded-lg px-4 py-2.5 text-sm text-foreground transition-colors border border-dashed border-border">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  Choose image…
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const dataUrl = ev.target?.result as string;
                        setTrip(p => ({ ...p, thumbnail: dataUrl }));
                        setThumbnailPickerOpen(false);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>

              {/* Activity images */}
              {activityImages.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">From Your Trip</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {activityImages.map((url) => (
                      <button
                        key={url}
                        onClick={() => { setTrip(p => ({ ...p, thumbnail: url })); setThumbnailPickerOpen(false); }}
                        className={cn(
                          "relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.02]",
                          trip.thumbnail === url ? "border-primary shadow-md" : "border-transparent hover:border-primary/50"
                        )}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        {trip.thumbnail === url && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activityImages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Add activities with images first, or upload a custom photo above.
                </p>
              )}

              {/* Remove thumbnail */}
              {trip.thumbnail && (
                <button
                  onClick={() => { setTrip(p => ({ ...p, thumbnail: undefined })); setThumbnailPickerOpen(false); }}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Remove cover photo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Day Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" /> Delete Day?
            </DialogTitle>
            <DialogDescription>
              This will permanently remove the day and all its activities. This action can be undone with Ctrl+Z.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={executeRemoveDay}>Delete Day</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Dialog */}
      <ActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activity={editingActivity}
        onSave={handleSaveActivity}
        isEditing={editingIndex >= 0}
        onLiveSave={handleLiveSaveActivity}
        onRevert={handleRevertActivity}
        currencySymbol={currencySymbol}
        days={trip.days}
        currentDayId={editingDayId}
      />
    </div>
  );
};

export default TripBuilder;
