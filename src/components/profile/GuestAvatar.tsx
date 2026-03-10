// ─── Guest avatar SVG ─────────────────────────────────────────────────
export const GuestAvatar = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M20 21a8 8 0 1 0-16 0h16Z" />
  </svg>
);
