import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  User, LogOut, Sun, Moon, ChevronDown,
  CalendarDays, DollarSign,
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { usePreferences, DateFormat, Currency, CURRENCY_SYMBOLS } from "@/context/PreferencesContext";
import { toast } from "sonner";

const DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: "EUR", label: "EUR €" },
  { value: "USD", label: "USD $" },
  { value: "GBP", label: "GBP £" },
  { value: "JPY", label: "JPY ¥" },
  { value: "CAD", label: "CAD CA$" },
  { value: "AUD", label: "AUD A$" },
];

const UserMenu = () => {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { dateFormat, setDateFormat, currency, setCurrency } = usePreferences();
  const navigate = useNavigate();

  const displayName = user?.user_metadata?.display_name || user?.email || "";
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    toast.success("Signed out");
    navigate("/");
  };

  const handleNavigate = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const isDark = theme === "dark";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-accent transition-colors text-sm font-medium text-foreground"
          aria-label="User menu"
        >
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
            {initials}
          </div>
          <span className="max-w-[110px] truncate hidden sm:block">
            {displayName}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-64 p-1">
        {/* User info header */}
        <div className="px-3 py-2.5 mb-1">
          <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>

        <Separator className="mb-1" />

        {/* Profile */}
        <button
          onClick={() => handleNavigate("/profile")}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent transition-colors text-left"
        >
          <User className="w-4 h-4 text-muted-foreground shrink-0" />
          Profile
        </button>

        <Separator className="my-1" />

        {/* Appearance */}
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Appearance</p>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setTheme("light")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${
                !isDark ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <Sun className="w-3.5 h-3.5" /> Light
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${
                isDark ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <Moon className="w-3.5 h-3.5" /> Dark
            </button>
          </div>
        </div>

        {/* Format options */}
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Format</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <select
                value={dateFormat}
                onChange={e => setDateFormat(e.target.value as DateFormat)}
                className="flex-1 text-xs bg-background border border-border rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {DATE_FORMATS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as Currency)}
                className="flex-1 text-xs bg-background border border-border rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {CURRENCIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <Separator className="my-1" />

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign Out
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default UserMenu;
