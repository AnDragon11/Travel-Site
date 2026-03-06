import { Collaborator } from "@/services/collaboratorService";

type SimpleProfile = { display_name: string | null; handle: string | null; avatar_url: string | null };

interface CollaboratorAvatarsProps {
  collaborators: Collaborator[];
  ownerProfile?: SimpleProfile | null;
  max?: number;
  size?: "sm" | "md";
}

const Avatar = ({ profile, title, size }: { profile: SimpleProfile; title: string; size: "sm" | "md" }) => {
  const dim = size === "sm" ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm";
  const initials = (profile.display_name || profile.handle || "?").slice(0, 2).toUpperCase();
  return (
    <div
      className={`${dim} rounded-full border-2 border-primary-foreground/30 overflow-hidden flex items-center justify-center bg-primary/60 text-primary-foreground font-bold shrink-0`}
      title={title}
    >
      {profile.avatar_url
        ? <img src={profile.avatar_url} alt={initials} className="w-full h-full object-cover" />
        : initials}
    </div>
  );
};

const CollaboratorAvatars = ({ collaborators, ownerProfile, max = 5, size = "md" }: CollaboratorAvatarsProps) => {
  const accepted = collaborators.filter(c => c.status === "accepted");

  // Build full roster: owner first, then accepted collaborators
  const roster: { profile: SimpleProfile; title: string; key: string }[] = [];
  if (ownerProfile) {
    roster.push({ profile: ownerProfile, title: `${ownerProfile.display_name || ownerProfile.handle || "Owner"} (Owner)`, key: "owner" });
  }
  accepted.forEach(c => {
    roster.push({ profile: c.profile, title: c.profile.display_name || c.profile.handle || "Collaborator", key: c.id });
  });

  const dim = size === "sm" ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm";
  const visible = roster.slice(0, max);
  const overflow = roster.length - max;

  if (roster.length === 0) return null;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visible.map(item => (
          <Avatar key={item.key} profile={item.profile} title={item.title} size={size} />
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
