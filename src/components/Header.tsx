import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Compass, Briefcase, Globe, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();

  const navLinks = [
    { href: "/", label: "Plan Trip" },
    { href: "/my-trips", label: "My Trips" },
    { href: "/explore", label: "Explore" },
    { href: "/about", label: "About" },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/");
    setIsMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center group-hover:shadow-glow transition-shadow duration-300">
              <Compass className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              Wanderly
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`${isActive(link.href) ? "nav-link-active" : "nav-link"} flex items-center gap-2`}
              >
                {link.label === "My Trips" && <Briefcase className="w-4 h-4" />}
                {link.label === "Explore" && <Globe className="w-4 h-4" />}
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {!loading && (
              user ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground px-3 py-1.5 rounded-lg bg-muted">
                    <User className="w-4 h-4" />
                    <span className="max-w-[120px] truncate">
                      {user.user_metadata?.display_name || user.email}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button asChild variant="default" size="sm">
                    <Link to="/signup">Sign Up</Link>
                  </Button>
                </div>
              )
            )}
          </div>

          {/* Mobile - Theme Toggle & Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
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
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`px-2 py-2 flex items-center gap-2 ${isActive(link.href) ? "nav-link-active" : "nav-link"}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label === "My Trips" && <Briefcase className="w-4 h-4" />}
                  {link.label === "Explore" && <Globe className="w-4 h-4" />}
                  {link.label}
                </Link>
              ))}
              {!loading && (
                user ? (
                  <>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground px-2 py-1">
                      <User className="w-4 h-4" />
                      <span className="truncate">{user.user_metadata?.display_name || user.email}</span>
                    </div>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-destructive" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4" /> Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild variant="ghost" className="w-full">
                      <Link to="/login" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
                    </Button>
                    <Button asChild variant="default" className="w-full">
                      <Link to="/signup" onClick={() => setIsMenuOpen(false)}>Sign Up</Link>
                    </Button>
                  </>
                )
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
