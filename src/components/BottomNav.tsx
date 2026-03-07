import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Globe, Plus, Briefcase, Settings, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { getPendingInviteCount } from "@/services/collaboratorService";

const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [inviteCount, setInviteCount] = useState(0);

  useEffect(() => {
    if (!user) { setInviteCount(0); return; }
    getPendingInviteCount(user.id).then(setInviteCount).catch(() => {});
  }, [user]);

  const isActive = (href: string) =>
    href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);

  const tabs = [
    { href: "/explore",                       icon: Globe,     label: "Explore"  },
    { href: "/",                              icon: Plus,      label: "Plan"     },
    { href: "/profile",                       icon: Briefcase, label: "My Trips" },
    { href: user ? "/profile-settings" : "/login", icon: user ? Settings : LogIn, label: user ? "Account" : "Sign In" },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch h-16">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const isAccount = tab.href === "/profile-settings" || tab.href === "/login";
          const showBadge = tab.href === "/profile" && inviteCount > 0;

          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Active indicator bar at top */}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
              )}

              {/* Icon — account tab shows avatar when logged in */}
              <div className="relative">
                {isAccount && user ? (
                  <div className={cn(
                    "w-6 h-6 rounded-full overflow-hidden border-2 flex items-center justify-center text-[9px] font-bold",
                    active ? "border-primary bg-primary/20 text-primary" : "border-muted-foreground/40 bg-muted text-muted-foreground"
                  )}>
                    {user.user_metadata?.avatar_url
                      ? <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                      : (user.user_metadata?.display_name || user.email || "").slice(0, 2).toUpperCase()
                    }
                  </div>
                ) : (
                  <tab.icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
                )}

                {/* Invite badge */}
                {showBadge && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                    {inviteCount > 9 ? "9+" : inviteCount}
                  </span>
                )}
              </div>

              <span className={cn("text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
