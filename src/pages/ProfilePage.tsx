import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  loadTrips, loadBucketList, loadPublicTripsForUser,
  copyToBucketList, setTripPublic, deleteTrip,
} from "@/services/storageService";
import { SavedTrip } from "@/lib/tripTypes";
import { toast } from "sonner";
import {
  Globe, Lock, Grid3X3,
  MapPin, Bookmark, Trash2, Eye, Sparkles, Plus,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────
interface ProfileData {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  bio: string | null;
}

// ─── Guest avatar SVG ─────────────────────────────────────────────────
const GuestAvatar = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M20 21a8 8 0 1 0-16 0h16Z" />
  </svg>
);

// ─── Trip Card (photo-first, diary/bucket list style) ─────────────────
const TripCard = ({
  trip, isOwn, onTogglePublic, onDelete, onBucketList,
}: {
  trip: SavedTrip;
  isOwn: boolean;
  onTogglePublic?: (id: string, val: boolean) => void;
  onDelete?: (id: string) => void;
  onBucketList?: (trip: SavedTrip) => void;
}) => {
  const navigate = useNavigate();
  const firstAct = trip.days?.[0]?.activities?.[0] as unknown as (Record<string, string>) | undefined;
  const coverPhoto = trip.photos?.[0] ?? firstAct?.image_url ?? firstAct?.image;
  const startDate = trip.days?.[0]?.date
    ? new Date(trip.days[0].date).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;

  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer group aspect-square bg-muted"
      onClick={() => navigate(`/trip/${trip.id}`, { state: { trip } })}
    >
      {/* Cover image or placeholder */}
      {coverPhoto ? (
        <img src={coverPhoto} alt={trip.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
          <MapPin className="w-10 h-10 text-white/50" />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-white text-sm font-semibold leading-tight truncate">{trip.destination}</p>
        {startDate && <p className="text-white/70 text-xs mt-0.5">{startDate}</p>}
      </div>

      {/* Top-right actions */}
      <div className="absolute top-2 right-2 flex gap-1" onClick={e => e.stopPropagation()}>
        {isOwn && onTogglePublic && (
          <button
            onClick={() => onTogglePublic(trip.id, !(trip.isPublic ?? true))}
            className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            title={trip.isPublic ? "Make private" : "Make public"}
          >
            {trip.isPublic !== false ? <Eye className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          </button>
        )}
        {isOwn && onDelete && (
          <button
            onClick={() => onDelete(trip.id)}
            className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500/80 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        {!isOwn && onBucketList && (
          <button
            onClick={() => onBucketList(trip)}
            className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-primary/80 transition-colors"
            title="Add to bucket list"
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Private badge */}
      {isOwn && trip.isPublic === false && (
        <div className="absolute top-2 left-2">
          <span className="flex items-center gap-1 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
            <Lock className="w-3 h-3" /> Private
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Main ProfilePage component ───────────────────────────────────────
const ProfilePage = () => {
  const { handle } = useParams<{ handle?: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Is this the viewer's own profile?
  const isOwn = !handle;
  // True when viewing own profile without being signed in
  const isGuest = isOwn && !user;

  // Use the user ID (primitive) in effect deps to avoid re-running on every
  // Supabase onAuthStateChange event (TOKEN_REFRESHED, INITIAL_SESSION, etc.),
  // which creates a new User object reference even when the data is identical.
  const userId = user?.id ?? null;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [diaryTrips, setDiaryTrips] = useState<SavedTrip[]>([]);
  const [bucketList, setBucketList] = useState<SavedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState<"diary" | "bucket">("diary");

  // ── Load profile + trips ──────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return; // wait for auth session to be restored

    let cancelled = false; // abort if effect re-runs

    const load = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        if (isOwn) {
          if (!user) {
            // Guest mode — serve entirely from localStorage
            if (cancelled) return;
            setProfile({ id: 'guest', display_name: null, handle: null, avatar_url: null, bio: null });
            const [trips, bucket] = await Promise.all([loadTrips(), loadBucketList()]);
            if (cancelled) return;
            setDiaryTrips(trips.filter(t => !t.isBucketList));
            setBucketList(bucket);
            return;
          }

          if (cancelled) return;
          const meta = user.user_metadata;
          setProfile({
            id: user.id,
            display_name: meta?.display_name ?? null,
            handle: meta?.handle ?? null,
            avatar_url: meta?.avatar_url ?? null,
            bio: null, // loaded from profiles table below
          });

          // Also fetch bio from profiles table (ignore error — column may not exist yet)
          const { data: profileRow } = await supabase
            .from("profiles").select("bio").eq("id", user.id).maybeSingle();
          if (cancelled) return;
          if (profileRow) {
            setProfile(p => p ? { ...p, bio: (profileRow as { bio?: string | null }).bio ?? null } : p);
          }

          const [trips, bucket] = await Promise.all([loadTrips(), loadBucketList()]);
          if (cancelled) return;
          setDiaryTrips(trips.filter(t => !t.isBucketList));
          setBucketList(bucket);
        } else {
          // Other user's profile
          const { data: profileRow, error } = await supabase
            .from("profiles")
            .select("id, display_name, handle, avatar_url, bio")
            .eq("handle", handle)
            .maybeSingle();

          if (cancelled) return;
          if (error || !profileRow) {
            toast.error("Profile not found");
            navigate("/explore");
            return;
          }

          setProfile(profileRow);
          const trips = await loadPublicTripsForUser(profileRow.id);
          if (cancelled) return;
          setDiaryTrips(trips);
          setBucketList([]); // other users' bucket lists are private
        }
      } catch (err) {
        if (cancelled) return;
        console.error("ProfilePage load error:", err);
        setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [handle, userId, isOwn, navigate, authLoading]);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleTogglePublic = useCallback(async (id: string, val: boolean) => {
    try {
      await setTripPublic(id, val);
      setDiaryTrips(ts => ts.map(t => t.id === id ? { ...t, isPublic: val } : t));
    } catch { toast.error("Failed to update visibility"); }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteTrip(id);
      setDiaryTrips(ts => ts.filter(t => t.id !== id));
      setBucketList(ts => ts.filter(t => t.id !== id));
    } catch { toast.error("Failed to delete trip"); }
  }, []);

  const handleBucketList = useCallback(async (trip: SavedTrip) => {
    if (!user) { toast.error("Sign in to add to your bucket list"); return; }
    try {
      await copyToBucketList(trip);
      toast.success("Added to your bucket list!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add to bucket list");
    }
  }, [user]);

  // ── Stats ─────────────────────────────────────────────────────────
  // Use optional chaining to guard against null/undefined destinations
  const countries = new Set(
    diaryTrips.map(t => t.destination?.split(",").pop()?.trim()).filter(Boolean)
  ).size;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-16 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-16 flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Could not load profile.</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-primary underline"
          >
            Try again
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  const displayName = profile.display_name || profile.handle || (isGuest ? "Guest" : "User");
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-16">

        {/* ── Profile Header ────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-accent/20 border-b border-border/50">
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex flex-col sm:flex-row items-start gap-6">

              {/* Left: avatar + identity + follow */}
              <div className="flex flex-col items-center sm:items-start gap-3 shrink-0">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center overflow-hidden ring-4 ring-background shadow-lg">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                  ) : profile.handle ? (
                    <span className="text-2xl font-bold text-white">{initials}</span>
                  ) : (
                    <GuestAvatar className="w-10 h-10 text-white/80" />
                  )}
                </div>
                {/* Name + handle */}
                <div>
                  <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
                  {profile.handle && (
                    <p className="text-sm text-muted-foreground">@{profile.handle}</p>
                  )}
                </div>
                {/* Follow / Edit buttons */}
                {isOwn && !isGuest && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/profile-settings">Edit Profile</Link>
                  </Button>
                )}
                {!isOwn && (
                  <Button variant="outline" size="sm" disabled title="Coming soon">
                    Follow
                  </Button>
                )}
              </div>

              {/* Right: bio + stats */}
              <div className="flex-1 space-y-3">
                {profile.bio && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="text-center sm:text-left">
                    <p className="font-bold text-foreground text-lg leading-none">{diaryTrips.length}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">trips</p>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="font-bold text-foreground text-lg leading-none">{countries}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">destinations</p>
                  </div>
                  {isOwn && (
                    <div className="text-center sm:text-left">
                      <p className="font-bold text-foreground text-lg leading-none">{bucketList.length}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">bucket list</p>
                    </div>
                  )}
                </div>
                {isOwn && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" asChild>
                      <Link to="/"><Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI Trip</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/trip"><Plus className="w-3.5 h-3.5 mr-1.5" /> Custom Trip</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Guest Banner ─────────────────────────────────────── */}
        {isGuest && (
          <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-accent/20 border-b border-primary/20">
            <div className="container mx-auto px-4 py-7 max-w-4xl text-center space-y-3">
              <p className="text-lg font-semibold text-foreground">
                You're browsing as a guest
              </p>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Your trips are saved on this device only and are private to you.
                Create an account to keep your data permanently, sync across devices,
                share your journeys publicly, and connect with other travelers.
              </p>
              <div className="flex gap-3 justify-center flex-wrap pt-1">
                <Button asChild size="default">
                  <Link to="/login">Log in</Link>
                </Button>
                <Button asChild size="default" variant="outline">
                  <Link to="/signup">Sign up</Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div className="border-b border-border/50 bg-background sticky top-16 z-10">
          <div className="container mx-auto px-4 max-w-4xl flex gap-0">
            <button
              onClick={() => setTab("diary")}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === "diary"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Grid3X3 className="w-4 h-4" /> Travel Diary
            </button>
            {isOwn && (
              <button
                onClick={() => setTab("bucket")}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === "bucket"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bookmark className="w-4 h-4" /> Bucket List
                {bucketList.length > 0 && (
                  <span className="ml-1 text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">{bucketList.length}</span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── Tab Content ──────────────────────────────────────── */}
        <div className="container mx-auto px-4 py-6 max-w-4xl">

          {tab === "diary" && (
            <div className="space-y-6">
              {/* Trip count */}
              {diaryTrips.length > 0 && (
                <h2 className="text-sm font-medium text-muted-foreground">
                  {diaryTrips.length} {diaryTrips.length === 1 ? "trip" : "trips"}
                  {!isOwn && " · public"}
                </h2>
              )}

              {/* Trip grid */}
              {diaryTrips.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {diaryTrips.map(trip => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      isOwn={isOwn}
                      onTogglePublic={isOwn && !isGuest ? handleTogglePublic : undefined}
                      onDelete={isOwn ? handleDelete : undefined}
                      onBucketList={!isOwn ? handleBucketList : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Globe className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">
                    {isOwn ? "No trips yet" : "No public trips yet"}
                  </p>
                  {isOwn && (
                    <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
                      <Button asChild>
                        <Link to="/"><Sparkles className="w-4 h-4 mr-2" /> AI-Generated Trip</Link>
                      </Button>
                      <Button asChild variant="outline">
                        <Link to="/trip"><Plus className="w-4 h-4 mr-2" /> Create Custom Trip</Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "bucket" && isOwn && (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                {bucketList.length} {bucketList.length === 1 ? "item" : "items"} saved
              </h2>
              {bucketList.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {bucketList.map(trip => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      isOwn={true}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Bookmark className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">Your bucket list is empty</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Browse other profiles and save trips you'd love to do
                  </p>
                  <Button variant="outline" className="mt-4" asChild>
                    <Link to="/explore">Explore trips</Link>
                  </Button>
                </div>
              )}
            </div>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
};

// ─── Error boundary to catch render crashes (shows error instead of blank) ──
class ProfileErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ProfilePage crash]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 pt-16 flex flex-col items-center justify-center gap-3 px-4">
            <p className="text-base font-semibold text-destructive">Something went wrong on the profile page</p>
            <p className="text-sm text-muted-foreground font-mono bg-muted px-3 py-2 rounded max-w-lg break-all">
              {this.state.error.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-primary underline mt-2"
            >
              Reload page
            </button>
          </main>
          <Footer />
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ProfilePageWithBoundary() {
  return (
    <ProfileErrorBoundary>
      <ProfilePage />
    </ProfileErrorBoundary>
  );
}
