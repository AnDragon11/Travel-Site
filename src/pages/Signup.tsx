import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader } from "lucide-react";

const HANDLE_RE = /^[a-z0-9_]+$/i;

const Signup = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle availability state
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [checkingHandle, setCheckingHandle] = useState(false);

  // Debounced handle availability check
  useEffect(() => {
    if (handle.length < 3 || !HANDLE_RE.test(handle)) {
      setHandleAvailable(null);
      setCheckingHandle(false);
      return;
    }
    setCheckingHandle(true);
    setHandleAvailable(null);
    const timer = setTimeout(async () => {
      const { data } = await supabase.rpc("is_handle_available", { p_handle: handle });
      setHandleAvailable(data ?? false);
      setCheckingHandle(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [handle]);

  const handleInput = (value: string) => {
    // Enforce alphanumeric + underscore, lowercase, strip spaces
    setHandle(value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
  };

  const handleStatus = () => {
    if (handle.length === 0) return null;
    if (handle.length < 3) return <span className="text-xs text-muted-foreground">At least 3 characters</span>;
    if (!HANDLE_RE.test(handle)) return <span className="text-xs text-destructive">Letters, numbers and _ only</span>;
    if (checkingHandle) return <Loader className="w-3.5 h-3.5 text-muted-foreground animate-spin" />;
    if (handleAvailable === true) return <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3.5 h-3.5" />Available</span>;
    if (handleAvailable === false) return <span className="flex items-center gap-1 text-xs text-destructive"><XCircle className="w-3.5 h-3.5" />Already taken</span>;
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (handle.length < 3) { toast.error("Handle must be at least 3 characters"); return; }
    if (!HANDLE_RE.test(handle)) { toast.error("Handle can only contain letters, numbers and underscores"); return; }
    if (handleAvailable === false) { toast.error("That handle is already taken"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }

    setLoading(true);
    const { error } = await signUp(email, password, displayName, handle);
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! Check your email to confirm.");
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-16 flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/30">
        <div className="w-full max-w-md px-4 py-12">
          <div className="feature-card">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Join <span className="text-gradient-primary">DiaryTrips</span>
              </h1>
              <p className="text-muted-foreground">Create your account and start planning</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Handle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-foreground">Handle</label>
                  <div className="flex items-center">{handleStatus()}</div>
                </div>
                <div className="flex items-center rounded-lg border border-border bg-background focus-within:ring-2 focus-within:ring-primary/50 transition overflow-hidden">
                  <span className="pl-4 pr-1 text-muted-foreground font-medium select-none">@</span>
                  <input
                    type="text"
                    required
                    value={handle}
                    onChange={e => handleInput(e.target.value)}
                    placeholder="yourhandle"
                    autoComplete="username"
                    maxLength={30}
                    className="flex-1 py-2.5 pr-4 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">This is how others will find you. Letters, numbers and _ only.</p>
              </div>

              {/* Display name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Display Name <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                />
              </div>

              <Button type="submit" disabled={loading || handleAvailable === false || checkingHandle} className="w-full">
                {loading ? "Creating account…" : "Create Account"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Signup;
