import { supabase } from "@/integrations/supabase/client";

export interface Collaborator {
  id: string;
  trip_id: string;
  user_id: string;
  role: "owner" | "editor";
  status: "pending" | "accepted" | "declined";
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  profile: {
    display_name: string | null;
    handle: string | null;
    avatar_url: string | null;
  };
}

export interface PendingInvite {
  id: string;
  trip_id: string;
  invited_at: string;
  invited_by_profile: {
    display_name: string | null;
    handle: string | null;
    avatar_url: string | null;
  } | null;
  trip: {
    title: string;
    destination: string;
  } | null;
}

/** Get all collaborators for a trip (with profile info). Owner sees all; editor sees own row. */
export const getCollaborators = async (tripId: string): Promise<Collaborator[]> => {
  const { data, error } = await supabase
    .from("trip_collaborators")
    .select(`
      id, trip_id, user_id, role, status, invited_by, invited_at, accepted_at,
      profile:profiles!trip_collaborators_user_id_fkey(display_name, handle, avatar_url)
    `)
    .eq("trip_id", tripId)
    .neq("status", "declined")
    .order("invited_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Collaborator[];
};

/** Returns 'owner' | 'editor' | null (pending/not involved) for the current user on a trip */
export const getTripRole = async (tripId: string, userId: string): Promise<"owner" | "editor" | null> => {
  // Check ownership via the trips table directly (authoritative source)
  const { data: ownedTrip } = await supabase
    .from("trips")
    .select("id")
    .eq("id", tripId)
    .eq("user_id", userId)
    .maybeSingle();

  if (ownedTrip) return "owner";

  // Check collaborator status
  const { data } = await supabase
    .from("trip_collaborators")
    .select("role, status")
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;
  if (data.role === "owner") return "owner"; // safety
  if (data.status === "accepted") return "editor";
  return null; // pending
};

/** Invite a user by handle to collaborate on a trip */
export const inviteByHandle = async (tripId: string, handle: string): Promise<void> => {
  // Look up the profile by handle
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("handle", handle.toLowerCase().trim())
    .single();

  if (profileError || !profile) throw new Error(`No user found with handle @${handle}`);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  if (profile.id === session.user.id) throw new Error("You can't invite yourself");

  const { error } = await supabase.from("trip_collaborators").insert({
    trip_id: tripId,
    user_id: profile.id,
    role: "editor",
    status: "pending",
    invited_by: session.user.id,
  });

  if (error) {
    if (error.code === "23505") throw new Error(`@${handle} is already invited`);
    throw new Error(error.message);
  }
};

/** Accept a pending invite */
export const acceptInvite = async (collaboratorId: string): Promise<void> => {
  const { error } = await supabase
    .from("trip_collaborators")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", collaboratorId);
  if (error) throw new Error(error.message);
};

/** Decline a pending invite */
export const declineInvite = async (collaboratorId: string): Promise<void> => {
  const { error } = await supabase
    .from("trip_collaborators")
    .delete()
    .eq("id", collaboratorId);
  if (error) throw new Error(error.message);
};

/** Owner removes a collaborator */
export const removeCollaborator = async (collaboratorId: string): Promise<void> => {
  const { error } = await supabase
    .from("trip_collaborators")
    .delete()
    .eq("id", collaboratorId);
  if (error) throw new Error(error.message);
};

/** Collaborator leaves a trip */
export const leaveTrip = async (tripId: string): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");
  const { error } = await supabase
    .from("trip_collaborators")
    .delete()
    .eq("trip_id", tripId)
    .eq("user_id", session.user.id);
  if (error) throw new Error(error.message);
};

/** Get pending invites for the current user (only invites received, not sent) */
export const getPendingInvites = async (): Promise<PendingInvite[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from("trip_collaborators")
    .select(`
      id, trip_id, invited_at,
      invited_by_profile:profiles!trip_collaborators_invited_by_fkey(display_name, handle, avatar_url),
      trip:trips!trip_collaborators_trip_id_fkey(title, destination)
    `)
    .eq("user_id", session.user.id)
    .eq("status", "pending")
    .order("invited_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PendingInvite[];
};

/**
 * Transfer trip ownership to an accepted collaborator.
 * The new owner is removed from trip_collaborators; the old owner is added as an accepted editor.
 */
export const transferOwnership = async (tripId: string, newOwnerId: string): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  // Transfer ownership in trips table
  const { error } = await supabase
    .from("trips")
    .update({ user_id: newOwnerId })
    .eq("id", tripId);
  if (error) throw new Error(error.message);

  // Remove new owner from collaborators (they're now the trip owner)
  await supabase.from("trip_collaborators").delete().eq("trip_id", tripId).eq("user_id", newOwnerId);

  // Add old owner as an accepted collaborator so they retain access
  await supabase.from("trip_collaborators").insert({
    trip_id: tripId,
    user_id: session.user.id,
    role: "editor",
    status: "accepted",
    invited_by: newOwnerId,
    accepted_at: new Date().toISOString(),
  }).onConflict("trip_id,user_id").ignore();
};

/** Get the profile of the trip's owner */
export const getTripOwnerProfile = async (tripId: string): Promise<{ display_name: string | null; handle: string | null; avatar_url: string | null } | null> => {
  const { data } = await supabase
    .from("trips")
    .select("profiles!trips_user_id_fkey(display_name, handle, avatar_url)")
    .eq("id", tripId)
    .maybeSingle();
  return (data?.profiles as { display_name: string | null; handle: string | null; avatar_url: string | null } | null) ?? null;
};

/** Get pending invite count for the current user */
export const getPendingInviteCount = async (userId: string): Promise<number> => {
  const { data } = await supabase.rpc("get_pending_invites_count", { p_user_id: userId });
  return (data as number) ?? 0;
};
