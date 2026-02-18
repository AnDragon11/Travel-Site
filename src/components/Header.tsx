import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Compass, Briefcase, Globe, LogOut, Sun, Moon, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import UserMenu from "./UserMenu";
import { toast } from "sonner";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();
  const { theme, setTheme } = useTheme();

  const navLinks = [
    { href: "/", label: "Plan Trip" },
    { href: "/profile", label: "Profile" },
    { href: "/explore", label: "Explore" },
    { href: "/about", label: "About" },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    await signOut();
    toast.success("Signed out");
    navigate("/");
  };

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

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <button
              className="p-2 text-foreground"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border/50 animate-fade-in">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`px-3 py-2.5 rounded-lg flex items-center gap-2 ${isActive(link.href) ? "nav-link-active bg-accent" : "nav-link"}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label === "Profile" && <Briefcase className="w-4 h-4" />}
                  {link.label === "Explore" && <Globe className="w-4 h-4" />}
                  {link.label}
                </Link>
              ))}

              {!loading && (
                <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                  {/* User identity row */}
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${user ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                      {user ? (user.user_metadata?.display_name || user.email || "").slice(0, 2).toUpperCase() : "G"}
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">
                      {user ? (user.user_metadata?.display_name || user.email) : "Guest"}
                    </span>
                  </div>

                  {/* Profile — auth only */}
                  {user && (
                    <Link
                      to="/profile-settings"
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm nav-link"
                    >
                      <User className="w-4 h-4" /> Profile Settings
                    </Link>
                  )}

                  {/* Theme toggle */}
                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm nav-link text-left"
                  >
                    {theme === "dark"
                      ? <><Sun className="w-4 h-4" /> Light Mode</>
                      : <><Moon className="w-4 h-4" /> Dark Mode</>
                    }
                  </button>

                  {/* Sign In / Sign Out */}
                  {user ? (
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm nav-link"
                      >
                        <LogOut className="w-4 h-4 rotate-180" /> Sign In
                      </Link>
                      <Button asChild variant="default" className="w-full mt-1">
                        <Link to="/signup" onClick={() => setIsMenuOpen(false)}>Sign Up</Link>
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
