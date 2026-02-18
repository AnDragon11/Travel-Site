import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type DateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
export type Currency = "EUR" | "USD" | "GBP" | "JPY" | "CAD" | "AUD";

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
};

interface Preferences {
  dateFormat: DateFormat;
  currency: Currency;
}

interface PreferencesContextType extends Preferences {
  setDateFormat: (f: DateFormat) => void;
  setCurrency: (c: Currency) => void;
  formatDate: (iso: string) => string;
  currencySymbol: string;
}

const STORAGE_KEY = "wanderly_prefs";

const defaults: Preferences = { dateFormat: "DD/MM/YYYY", currency: "EUR" };

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [prefs, setPrefs] = useState<Preferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...defaults, ...JSON.parse(stored) };
    } catch {}
    return defaults;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const setDateFormat = (dateFormat: DateFormat) => setPrefs(p => ({ ...p, dateFormat }));
  const setCurrency = (currency: Currency) => setPrefs(p => ({ ...p, currency }));

  const formatDate = (iso: string): string => {
    try {
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, "0");
      const day = pad(d.getDate());
      const month = pad(d.getMonth() + 1);
      const year = d.getFullYear();
      switch (prefs.dateFormat) {
        case "MM/DD/YYYY": return `${month}/${day}/${year}`;
        case "YYYY-MM-DD": return `${year}-${month}-${day}`;
        default: return `${day}/${month}/${year}`;
      }
    } catch {
      return iso;
    }
  };

  return (
    <PreferencesContext.Provider value={{
      ...prefs,
      setDateFormat,
      setCurrency,
      formatDate,
      currencySymbol: CURRENCY_SYMBOLS[prefs.currency],
    }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside PreferencesProvider");
  return ctx;
};
