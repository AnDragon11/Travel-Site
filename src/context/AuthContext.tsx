import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { migrateLocalToSupabase } from "@/services/storageService";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string, handle?: string) => Promise<{ error: Error | null }>;
  signIn: (identifier: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Detect whether a string looks like an email vs a handle vs a phone number */
function identifierType(value: string): "email" | "handle" | "phone" {
  const v = value.trim();
  if (v.startsWith("+") || /^\+?[\d\s\-().]{7,}$/.test(v)) return "phone";
  if (v.includes("@") && !v.startsWith("@")) return "email";
  return "handle";
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_IN" && session?.user) {
        const provider = session.user.app_metadata?.provider;
        if (provider && provider !== "email") {
          // OAuth sign-in: migrate localStorage trips
          void migrateLocalToSupabase();
          // Sync handle, display_name, and avatar_url into auth metadata
          setTimeout(async () => {
            const updates: Record<string, string> = {};

            const { data: profile } = await supabase
              .from("profiles")
              .select("handle, avatar_url")
              .eq("id", session.user!.id)
              .single();

            if (profile?.handle && !session.user.user_metadata?.handle) {
              updates.handle = profile.handle;
            }

            // Google stores the user's name as full_name; map it to display_name
            if (!session.user.user_metadata?.display_name && session.user.user_metadata?.full_name) {
              updates.display_name = session.user.user_metadata.full_name;
            }

            // If DB has a different avatar (e.g. manually uploaded), it takes priority over Google's
            if (profile?.avatar_url && profile.avatar_url !== session.user.user_metadata?.avatar_url) {
              updates.avatar_url = profile.avatar_url;
            }

            if (Object.keys(updates).length > 0) {
              await supabase.auth.updateUser({ data: updates });
            }
          }, 1000);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string, handle?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName ?? "",
          handle: handle ? handle.toLowerCase().trim() : "",
        },
      },
    });
    return { error };
  };

  const signIn = async (identifier: string, password: string) => {
    let email = identifier.trim();

    const type = identifierType(email);

    if (type === "handle") {
      // Strip leading @ if present
      const handle = email.startsWith("@") ? email.slice(1) : email;
      const { data, error: lookupError } = await supabase.rpc("get_email_by_handle", { p_handle: handle });
      if (lookupError || !data) {
        return { error: new Error("No account found with that handle") };
      }
      email = data;
    } else if (type === "phone") {
      // Phone login not yet supported without Supabase phone auth (paid plan)
      return { error: new Error("Phone login is not yet enabled") };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      await migrateLocalToSupabase();
    }
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/profile` },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
