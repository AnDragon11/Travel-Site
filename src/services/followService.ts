import { supabase } from "@/integrations/supabase/client";

export interface FollowCounts {
  followers: number;
  following: number;
}

/** Follow a user by their profile ID */
export const followUser = async (followingId: string): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");
  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: session.user.id, following_id: followingId });
  if (error) throw new Error(error.message);
};

/** Unfollow a user by their profile ID */
export const unfollowUser = async (followingId: string): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", session.user.id)
    .eq("following_id", followingId);
  if (error) throw new Error(error.message);
};

/** Check if the current user follows a given profile */
export const getIsFollowing = async (followingId: string): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;
  const { data, error } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", session.user.id)
    .eq("following_id", followingId)
    .maybeSingle();
  if (error) return false;
  return !!data;
};

/** Get follower + following counts for a profile */
export const getFollowCounts = async (profileId: string): Promise<FollowCounts> => {
  const [followersRes, followingRes] = await Promise.all([
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", profileId),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", profileId),
  ]);
  return {
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
  };
};
