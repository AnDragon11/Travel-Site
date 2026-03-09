import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TripVote {
  id: string;
  trip_id: string;
  activity_id: string;
  user_id: string;
  vote: 1 | -1;
  created_at: string;
}

export interface VoteSummary {
  activity_id: string;
  up: number;
  down: number;
  myVote: 1 | -1 | 0;
}

export interface TripExpense {
  id: string;
  trip_id: string;
  activity_id?: string | null;
  description: string;
  amount: number;
  paid_by: string;
  split_between: string[];
  created_at: string;
  paid_by_profile?: { display_name: string | null; handle: string | null; avatar_url: string | null };
}

export interface Balance {
  userId: string;
  display_name: string | null;
  handle: string | null;
  net: number; // positive = owed money, negative = owes money
}

// ─── Votes ────────────────────────────────────────────────────────────────────

export const getVotesForTrip = async (tripId: string): Promise<VoteSummary[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("trip_votes")
    .select("activity_id, vote, user_id")
    .eq("trip_id", tripId);
  if (error) throw error;

  const map: Record<string, VoteSummary> = {};
  (data ?? []).forEach((row: { activity_id: string; vote: number; user_id: string }) => {
    if (!map[row.activity_id]) map[row.activity_id] = { activity_id: row.activity_id, up: 0, down: 0, myVote: 0 };
    if (row.vote === 1) map[row.activity_id].up++;
    else map[row.activity_id].down++;
    if (row.user_id === user?.id) map[row.activity_id].myVote = row.vote as 1 | -1;
  });
  return Object.values(map);
};

export const upsertVote = async (tripId: string, activityId: string, vote: 1 | -1): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("trip_votes")
    .upsert({ trip_id: tripId, activity_id: activityId, user_id: user.id, vote }, { onConflict: "trip_id,activity_id,user_id" });
  if (error) throw error;
};

export const removeVote = async (tripId: string, activityId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("trip_votes")
    .delete()
    .eq("trip_id", tripId)
    .eq("activity_id", activityId)
    .eq("user_id", user.id);
  if (error) throw error;
};

// ─── Expenses ─────────────────────────────────────────────────────────────────

export const getExpensesForTrip = async (tripId: string): Promise<TripExpense[]> => {
  const { data, error } = await supabase
    .from("trip_expenses")
    .select("*, paid_by_profile:profiles!trip_expenses_paid_by_fkey(display_name, handle, avatar_url)")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TripExpense[];
};

export const addExpense = async (
  tripId: string,
  description: string,
  amount: number,
  activityId?: string,
  splitBetween?: string[]
): Promise<TripExpense> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("trip_expenses")
    .insert({ trip_id: tripId, activity_id: activityId ?? null, description, amount, paid_by: user.id, split_between: splitBetween ?? [] })
    .select("*, paid_by_profile:profiles!trip_expenses_paid_by_fkey(display_name, handle, avatar_url)")
    .single();
  if (error) throw error;
  return data as TripExpense;
};

export const deleteExpense = async (expenseId: string): Promise<void> => {
  const { error } = await supabase.from("trip_expenses").delete().eq("id", expenseId);
  if (error) throw error;
};

// ─── Balance calculation ──────────────────────────────────────────────────────

/** Returns net balances per user: positive = they are owed money, negative = they owe */
export const calcBalances = (expenses: TripExpense[], memberIds: string[]): Record<string, number> => {
  const net: Record<string, number> = {};
  memberIds.forEach(id => { net[id] = 0; });

  expenses.forEach(exp => {
    const paidBy = exp.paid_by;
    const splitIds = exp.split_between.length > 0 ? exp.split_between : memberIds;
    const share = exp.amount / splitIds.length;
    net[paidBy] = (net[paidBy] ?? 0) + exp.amount;
    splitIds.forEach(id => { net[id] = (net[id] ?? 0) - share; });
  });

  return net;
};
