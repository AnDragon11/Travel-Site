import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Compass, Briefcase, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import UserMenu from "./UserMenu";
import { getPendingInviteCount } from "@/services/collaboratorService";

const Header = () => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const [inviteCount, setInviteCount] = useState(0);

  useEffect(() => {
    if (!user) { setInviteCount(0); return; }
    getPendingInviteCount(user.id).then(setInviteCount).catch(() => {});
  }, [user]);

  const navLinks = [
    { href: "/", label: "Plan Trip" },
    { href: "/profile", label: "Profile" },
    { href: "/explore", label: "Explore" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center group-hover:shadow-glow transition-shadow duration-300">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient-primary">DiaryTrips</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`${isActive(link.href) ? "nav-link-active" : "nav-link"} flex items-center gap-2`}
              >
                {link.label === "Profile" && <Briefcase className="w-4 h-4" />}
                {link.label === "Explore" && <Globe className="w-4 h-4" />}
                {link.label}
                {link.label === "Profile" && inviteCount > 0 && (
                  <span className="ml-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">{inviteCount > 9 ? "9+" : inviteCount}</span>
                )}
              </Link>
            ))}
          </nav>

          {/* Right side — desktop */}
          <div className="hidden md:flex items-center gap-2">
            {!loading && (
              <>
                {!user && (
                  <Button asChild variant="default" size="sm">
                    <Link to="/signup">Sign Up</Link>
                  </Button>
                )}
                <UserMenu />
              </>
            )}
          </div>

          {/* Mobile: no hamburger — BottomNav handles all navigation */}
        </div>
      </div>
    </header>
  );
};

export default Header;
