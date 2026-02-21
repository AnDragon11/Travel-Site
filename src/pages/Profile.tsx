import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle, Loader } from "lucide-react";

const HANDLE_RE = /^[a-z0-9_]+$/i;

const Profile = () => {
  // ProtectedRoute guarantees user is non-null when this component renders
  const { user } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name ?? "");
  const [handle, setHandle] = useState(user?.user_metadata?.handle ?? "");
  const [savingInfo, setSavingInfo] = useState(false);

  // Handle availability check
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [checkingHandle, setCheckingHandle] = useState(false);
  const originalHandle = user?.user_metadata?.handle ?? "";

  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const [phone, setPhone] = useState(user?.phone ?? "");
  const [savingPhone, setSavingPhone] = useState(false);

  // Debounced handle availability check (skip if unchanged)
  useEffect(() => {
    const normalized = handle.toLowerCase().trim();
    if (normalized === originalHandle.toLowerCase() || normalized.length < 3 || !HANDLE_RE.test(normalized)) {
      setHandleAvailable(null);
      setCheckingHandle(false);
      return;
    }
    setCheckingHandle(true);
    setHandleAvailable(null);
    const timer = setTimeout(async () => {
      const { data } = await supabase.rpc("is_handle_available", { p_handle: normalized });
      setHandleAvailable(data ?? false);
      setCheckingHandle(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [handle, originalHandle]);

  // Sync form fields once auth resolves (useState initializes before user is available)
  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.display_name ?? "");
      setHandle(user.user_metadata?.handle ?? "");
      setPhone(user.phone ?? "");
    }
  }, [user]);

  if (!user) return null;

  const handleInput = (value: string) => setHandle(value.toLowerCase().replace(/[^a-z0-9_]/g, ""));

  const handleStatus = () => {
    const normalized = handle.toLowerCase().trim();
    if (normalized === originalHandle.toLowerCase()) return null;
    if (handle.length < 3) return <span className="text-xs text-muted-foreground">Min 3 chars</span>;
    if (!HANDLE_RE.test(handle)) return <span className="text-xs text-destructive">Letters, numbers, _ only</span>;
    if (checkingHandle) return <Loader className="w-3 h-3 text-muted-foreground animate-spin" />;
    if (handleAvailable === true) return <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3 h-3" />Available</span>;
    if (handleAvailable === false) return <span className="flex items-center gap-1 text-xs text-destructive"><XCircle className="w-3 h-3" />Taken</span>;
    return null;
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedHandle = handle.toLowerCase().trim();
    // Only validate handle if it's being set/changed (allow empty = no handle)
    if (normalizedHandle.length > 0 && normalizedHandle.length < 3) { toast.error("Handle must be at least 3 characters"); return; }
    if (normalizedHandle.length > 0 && !HANDLE_RE.test(normalizedHandle)) { toast.error("Handle can only contain letters, numbers and underscores"); return; }
    if (handleAvailable === false) { toast.error("That handle is already taken"); return; }

    setSavingInfo(true);
    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName.trim(), handle: normalizedHandle },
    });
    if (!error) {
      await supabase.from("profiles").update({
        display_name: displayName.trim(),
        handle: normalizedHandle,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);
    }
    setSavingInfo(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSavingEmail(false);
    if (error) toast.error(error.message);
    else { toast.success("Confirmation sent to new email"); setNewEmail(""); }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setSavingPassword(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email!, password: currentPassword });
    if (signInError) { setSavingPassword(false); toast.error("Current password is incorrect"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
  };

  const handleForgotPassword = async () => {
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email!, {
      redirectTo: `${window.location.origin}/profile`,
    });
    setSendingReset(false);
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent to your email");
  };

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPhone(true);
    await supabase.auth.updateUser({ data: { phone_display: phone.trim() } });
    const { error } = await supabase.from("profiles").update({ updated_at: new Date().toISOString() }).eq("id", user.id);
    setSavingPhone(false);
    if (error) toast.error(error.message);
    else toast.success("Phone number saved");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-16 bg-gradient-to-br from-accent/20 via-background to-muted/30">
        <div className="container mx-auto px-4 py-8 max-w-xl">

          <div className="mb-6">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="text-2xl font-bold text-foreground">
              Profile <span className="text-gradient-primary">Settings</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage your account and security</p>
          </div>

          <div className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50">

            {/* ── Account Info ── */}
            <form onSubmit={handleSaveInfo} className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Account</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Display name</label>
                  <Input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Email</label>
                  <Input
                    value={user.email ?? ""}
                    readOnly
                    className="h-8 text-sm bg-muted text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>
              {/* Handle row */}
              <div className="space-y-1 mb-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Handle</label>
                  <div className="flex items-center">{handleStatus()}</div>
                </div>
                <div className="flex items-center rounded-md border border-input bg-background h-8 focus-within:ring-2 focus-within:ring-primary/50 transition overflow-hidden">
                  <span className="pl-3 pr-1 text-muted-foreground text-sm select-none">@</span>
                  <input
                    type="text"
                    value={handle}
                    onChange={e => handleInput(e.target.value)}
                    placeholder="yourhandle"
                    maxLength={30}
                    className="flex-1 h-full pr-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={savingInfo || handleAvailable === false || checkingHandle} className="h-7 text-xs px-3">
                  {savingInfo ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>

            {/* ── Phone ── */}
            <form onSubmit={handleSavePhone} className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Phone</p>
              <div className="flex gap-2 items-center">
                <Input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 555 000 0000"
                  className="h-8 text-sm"
                />
                <Button type="submit" size="sm" disabled={savingPhone} className="h-8 text-xs px-3 shrink-0">
                  {savingPhone ? "Saving…" : "Save"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Used for two-factor authentication when enabled</p>
            </form>

            {/* ── Change Email ── */}
            <form onSubmit={handleSaveEmail} className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Change Email</p>
              <div className="flex gap-2 items-center">
                <Input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="new@email.com"
                  required
                  className="h-8 text-sm"
                />
                <Button type="submit" size="sm" disabled={savingEmail} className="h-8 text-xs px-3 shrink-0">
                  {savingEmail ? "Sending…" : "Update"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">A confirmation link will be sent to both addresses</p>
            </form>

            {/* ── Change Password ── */}
            <form onSubmit={handleSavePassword} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Change Password</p>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={sendingReset}
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                >
                  {sendingReset ? "Sending…" : "Forgot password?"}
                </button>
              </div>
              <div className="space-y-2 mb-3">
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  required
                  className="h-8 text-sm"
                />
                <Separator />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="New password"
                    required
                    className="h-8 text-sm"
                  />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    required
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={savingPassword} className="h-7 text-xs px-3">
                  {savingPassword ? "Updating…" : "Update Password"}
                </Button>
              </div>
            </form>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
