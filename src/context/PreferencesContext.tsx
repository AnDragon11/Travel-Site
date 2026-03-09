import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type DateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
export type Currency =
  | "EUR" | "USD" | "GBP" | "JPY" | "CAD" | "AUD"
  | "CHF" | "SEK" | "NOK" | "DKK" | "INR" | "CNY"
  | "BRL" | "MXN" | "THB" | "SGD" | "HKD" | "KRW"
  | "ZAR" | "AED" | "NZD" | "PLN" | "TRY" | "CZK"
  | "HUF" | "RON" | "ILS" | "SAR" | "PHP" | "IDR";

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: "€",   USD: "$",   GBP: "£",   JPY: "¥",   CAD: "CA$", AUD: "A$",
  CHF: "Fr",  SEK: "kr",  NOK: "kr",  DKK: "kr",  INR: "₹",   CNY: "¥",
  BRL: "R$",  MXN: "$",   THB: "฿",   SGD: "S$",  HKD: "HK$", KRW: "₩",
  ZAR: "R",   AED: "د.إ", NZD: "NZ$", PLN: "zł",  TRY: "₺",   CZK: "Kč",
  HUF: "Ft",  RON: "lei", ILS: "₪",   SAR: "﷼",   PHP: "₱",   IDR: "Rp",
};

/** Static approximate exchange rates: 1 USD → X <currency> */
export const USD_EXCHANGE_RATES: Record<Currency, number> = {
  EUR: 0.92,   USD: 1,     GBP: 0.79,  JPY: 149,   CAD: 1.36,  AUD: 1.53,
  CHF: 0.90,   SEK: 10.5,  NOK: 10.6,  DKK: 6.89,  INR: 83.5,  CNY: 7.24,
  BRL: 5.0,    MXN: 17.2,  THB: 35.5,  SGD: 1.35,  HKD: 7.82,  KRW: 1330,
  ZAR: 18.7,   AED: 3.67,  NZD: 1.63,  PLN: 3.98,  TRY: 32.5,  CZK: 23.2,
  HUF: 363,    RON: 4.58,  ILS: 3.65,  SAR: 3.75,  PHP: 56.5,  IDR: 15700,
};

/** Convert an amount from USD to the given currency */
export const convertFromUSD = (amount: number, toCurrency: Currency): number =>
  Math.round(amount * USD_EXCHANGE_RATES[toCurrency]);

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

const STORAGE_KEY = "diarytrips_prefs";

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
      const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
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
