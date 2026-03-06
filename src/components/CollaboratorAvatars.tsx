import { Collaborator } from "@/services/collaboratorService";

interface CollaboratorAvatarsProps {
  collaborators: Collaborator[];
  max?: number;
  size?: "sm" | "md";
}

const Avatar = ({ profile, size }: { profile: Collaborator["profile"]; size: "sm" | "md" }) => {
  const dim = size === "sm" ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm";
  const initials = (profile.display_name || profile.handle || "?").slice(0, 2).toUpperCase();
  return (
    <div
      className={`${dim} rounded-full border-2 border-primary-foreground/30 overflow-hidden flex items-center justify-center bg-primary/60 text-primary-foreground font-bold shrink-0`}
      title={profile.display_name || profile.handle || "Collaborator"}
    >
      {profile.avatar_url
        ? <img src={profile.avatar_url} alt={initials} className="w-full h-full object-cover" />
        : initials}
    </div>
  );
};

const CollaboratorAvatars = ({ collaborators, max = 4, size = "md" }: CollaboratorAvatarsProps) => {
  const accepted = collaborators.filter(c => c.status === "accepted");
  const visible = accepted.slice(0, max);
  const overflow = accepted.length - max;
  const dim = size === "sm" ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm";

  if (accepted.length === 0) return null;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visible.map(c => (
          <Avatar key={c.id} profile={c.profile} size={size} />
        ))}
        {overflow > 0 && (
          <div className={`${dim} rounded-full border-2 border-primary-foreground/30 bg-primary-foreground/20 flex items-center justify-center text-primary-foreground font-bold`}>
            +{overflow}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollaboratorAvatars;
