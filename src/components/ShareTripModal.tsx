import { useState, useEffect, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { UserPlus, X, Clock, CheckCircle, Loader2, Users, Crown } from "lucide-react";
import {
  Collaborator,
  getCollaborators,
  inviteByHandle,
  removeCollaborator,
  transferOwnership,
} from "@/services/collaboratorService";
import { supabase } from "@/integrations/supabase/client";

interface ProfilePreview {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
}

interface ShareTripModalProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  tripTitle: string;
}

const AvatarCircle = ({ profile, size = "md" }: { profile: { display_name?: string | null; handle?: string | null; avatar_url?: string | null }; size?: "sm" | "md" }) => {
  const dim = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  const initials = (profile.display_name || profile.handle || "?").slice(0, 2).toUpperCase();
  return (
    <div className={`${dim} rounded-full bg-primary/20 border border-border flex items-center justify-center font-semibold text-foreground shrink-0 overflow-hidden`}>
      {profile.avatar_url
        ? <img src={profile.avatar_url} alt={initials} className="w-full h-full object-cover" />
        : initials}
    </div>
  );
};

const ShareTripModal = ({ open, onClose, tripId, tripTitle }: ShareTripModalProps) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingCollabs, setLoadingCollabs] = useState(false);

  const [handleInput, setHandleInput] = useState("");
  const [preview, setPreview] = useState<ProfilePreview | null>(null);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load collaborators when opened
  useEffect(() => {
    if (!open || !tripId) return;
    setLoadingCollabs(true);
    getCollaborators(tripId)
      .then(setCollaborators)
      .catch(() => toast.error("Failed to load collaborators"))
      .finally(() => setLoadingCollabs(false));
  }, [open, tripId]);

  // Debounced handle lookup
  useEffect(() => {
    const raw = handleInput.replace(/^@/, "").trim().toLowerCase();
    if (!raw || raw.length < 2) {
      setPreview(null);
      setNotFound(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setPreview(null);
      setNotFound(false);
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, handle, avatar_url")
        .eq("handle", raw)
        .single();
      setSearching(false);
      if (data) setPreview(data);
      else setNotFound(true);
    }, 400);
  }, [handleInput]);

  const handleInvite = async () => {
    if (!preview) return;
    setInviting(true);
    try {
      await inviteByHandle(tripId, preview.handle!);
      toast.success(`Invite sent to @${preview.handle}`);
      setHandleInput("");
      setPreview(null);
      // Refresh collaborators list
      const updated = await getCollaborators(tripId);
      setCollaborators(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (collab: Collaborator) => {
    try {
      await removeCollaborator(collab.id);
      setCollaborators(prev => prev.filter(c => c.id !== collab.id));
      toast.success(`Removed @${collab.profile.handle}`);
    } catch {
      toast.error("Failed to remove collaborator");
    }
  };

  const handleTransferOwnership = async (collab: Collaborator) => {
    if (!confirm(`Transfer ownership to @${collab.profile.handle ?? collab.profile.display_name}? You'll become a collaborator.`)) return;
    try {
      await transferOwnership(tripId, collab.user_id);
      toast.success(`@${collab.profile.handle ?? collab.profile.display_name} is now the owner`);
      onClose();
    } catch {
      toast.error("Failed to transfer ownership");
    }
  };

  const alreadyInvited = (profileId: string) =>
    collaborators.some(c => c.user_id === profileId);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Share Trip
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Invite collaborators to plan <span className="font-medium text-foreground">"{tripTitle}"</span> together.
          </DialogDescription>
        </DialogHeader>

        {/* Invite input */}
        <div className="space-y-3 pt-1">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
            <Input
              value={handleInput}
              onChange={e => setHandleInput(e.target.value)}
              placeholder="username"
              className="pl-7 pr-10"
              autoComplete="off"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Profile preview */}
          {preview && (
            <div className="flex items-center justify-between bg-accent rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <AvatarCircle profile={preview} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{preview.display_name}</p>
                  <p className="text-xs text-muted-foreground">@{preview.handle}</p>
                </div>
              </div>
              {alreadyInvited(preview.id) ? (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Already invited</span>
              ) : (
                <Button size="sm" onClick={handleInvite} disabled={inviting} className="gap-1.5 shrink-0">
                  {inviting ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                  Invite
                </Button>
              )}
            </div>
          )}

          {notFound && handleInput.replace(/^@/, "").trim().length >= 2 && (
            <p className="text-xs text-muted-foreground px-1">No user found with that handle.</p>
          )}
        </div>

        {/* Current collaborators */}
        <div className="mt-2 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-0.5">Collaborators</p>
          {loadingCollabs ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : collaborators.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3 text-center">No collaborators yet — invite someone above.</p>
          ) : (
            <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
              {collaborators.map(c => (
                <div key={c.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent/50 group">
                  <div className="flex items-center gap-2.5">
                    <AvatarCircle profile={c.profile} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.profile.display_name}</p>
                      <p className="text-xs text-muted-foreground">@{c.profile.handle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {c.status === "pending" ? (
                      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    )}
                    {c.status === "accepted" && (
                      <button
                        onClick={() => handleTransferOwnership(c)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-amber-500 transition-all p-0.5 rounded"
                        title="Make owner"
                      >
                        <Crown className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(c)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5 rounded"
                      title="Remove collaborator"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareTripModal;
