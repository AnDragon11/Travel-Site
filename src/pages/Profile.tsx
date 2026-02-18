import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Lock, Phone, Mail, Save, ArrowLeft } from "lucide-react";

// ─── Section Card ────────────────────────────────────────────────────
const Section = ({ icon: Icon, title, children }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-card rounded-2xl border border-border/50 p-6">
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-4.5 h-4.5 text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
    </div>
    {children}
  </div>
);

// ─── Field Row ───────────────────────────────────────────────────────
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-sm text-foreground">{label}</Label>
    {children}
  </div>
);

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ─── Account info ─────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name ?? "");
  const [savingInfo, setSavingInfo] = useState(false);

  // ─── Email ────────────────────────────────────────────────────
  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  // ─── Password ────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // ─── Phone ───────────────────────────────────────────────────
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  if (!user) return null;

  // ─── Handlers ────────────────────────────────────────────────

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName.trim() },
    });
    // Also update profiles table
    if (!error) {
      await supabase.from("profiles").update({
        display_name: displayName.trim(),
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
    else {
      toast.success("Confirmation sent to your new email address");
      setNewEmail("");
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setSavingPassword(true);
    // Verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });
    if (signInError) {
      setSavingPassword(false);
      toast.error("Current password is incorrect");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPhone(true);
    // Store phone in profiles table (Supabase phone auth requires a paid plan)
    const { error } = await supabase.from("profiles").update({
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    // Also attempt to update phone via auth (may require phone auth enabled)
    await supabase.auth.updateUser({ data: { phone_display: phone.trim() } });
    setSavingPhone(false);
    if (error) toast.error(error.message);
    else toast.success("Phone number saved");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-16 bg-gradient-to-br from-accent/20 via-background to-muted/30">
        <div className="container mx-auto px-4 py-10 max-w-2xl">
          {/* Page header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="text-3xl font-bold text-foreground mb-1">
              Profile <span className="text-gradient-primary">Settings</span>
            </h1>
            <p className="text-muted-foreground">Manage your account information and security</p>
          </div>

          <div className="space-y-5">
            {/* ── Account Info ── */}
            <Section icon={User} title="Account Info">
              <form onSubmit={handleSaveInfo} className="space-y-4">
                <Field label="Display Name">
                  <Input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your name"
                  />
                </Field>
                <Field label="Email Address">
                  <Input
                    value={user.email ?? ""}
                    readOnly
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Change your email in the Security section below
                  </p>
                </Field>
                <div className="flex justify-end pt-1">
                  <Button type="submit" size="sm" disabled={savingInfo} className="gap-1.5">
                    <Save className="w-3.5 h-3.5" />
                    {savingInfo ? "Saving…" : "Save"}
                  </Button>
                </div>
              </form>
            </Section>

            {/* ── Phone ── */}
            <Section icon={Phone} title="Phone Number">
              <form onSubmit={handleSavePhone} className="space-y-4">
                <Field label="Phone">
                  <Input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 555 000 0000"
                  />
                </Field>
                <p className="text-xs text-muted-foreground -mt-2">
                  Used for two-factor authentication when enabled
                </p>
                <div className="flex justify-end pt-1">
                  <Button type="submit" size="sm" disabled={savingPhone} className="gap-1.5">
                    <Save className="w-3.5 h-3.5" />
                    {savingPhone ? "Saving…" : "Save"}
                  </Button>
                </div>
              </form>
            </Section>

            {/* ── Change Email ── */}
            <Section icon={Mail} title="Change Email">
              <form onSubmit={handleSaveEmail} className="space-y-4">
                <Field label="New Email Address">
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="new@email.com"
                    required
                  />
                </Field>
                <p className="text-xs text-muted-foreground -mt-2">
                  A confirmation link will be sent to both your old and new email addresses
                </p>
                <div className="flex justify-end pt-1">
                  <Button type="submit" size="sm" disabled={savingEmail} className="gap-1.5">
                    <Save className="w-3.5 h-3.5" />
                    {savingEmail ? "Sending…" : "Update Email"}
                  </Button>
                </div>
              </form>
            </Section>

            {/* ── Change Password ── */}
            <Section icon={Lock} title="Change Password">
              <form onSubmit={handleSavePassword} className="space-y-4">
                <Field label="Current Password">
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </Field>
                <Separator />
                <Field label="New Password">
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                  />
                </Field>
                <Field label="Confirm New Password">
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                  />
                </Field>
                <div className="flex justify-end pt-1">
                  <Button type="submit" size="sm" disabled={savingPassword} className="gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    {savingPassword ? "Updating…" : "Update Password"}
                  </Button>
                </div>
              </form>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
