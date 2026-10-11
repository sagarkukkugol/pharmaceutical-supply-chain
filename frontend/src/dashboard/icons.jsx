// One professional outline icon set for the whole dashboard (sidebar,
// KPI cards, activity, profile, notifications). Single-colour strokes
// that inherit currentColor — the surrounding IconCircle supplies the
// dark-navy-on-light-gray styling. No emoji, no multicolour glyphs.
const PATHS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="5" rx="1.5" />
      <rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </>
  ),
  document: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  documentPlus: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M12 11.5v6M9 14.5h6" />
    </>
  ),
  package: (
    <>
      <path d="M12 3 4 7v10l8 4 8-4V7z" />
      <path d="m4 7 8 4 8-4M12 11v10" />
    </>
  ),
  archive: (
    <>
      <rect x="3" y="4" width="18" height="4.5" rx="1" />
      <path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5M10 12.5h4" />
    </>
  ),
  transfer: (
    <>
      <path d="m7 4-4 4 4 4M3 8h14M17 20l4-4-4-4M21 16H7" />
    </>
  ),
  history: (
    <>
      <path d="M3 4v5h5" />
      <path d="M3.6 9A9 9 0 1 1 3 12" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  truck: (
    <>
      <path d="M2.5 6.5h10.5V16H2.5zM13 9.5h4.2l3.3 3.2V16H13" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="16.5" cy="17.5" r="1.8" />
    </>
  ),
  send: (
    <>
      <path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.1 7.9 7.5 9.5 4.4-1.6 7.5-4.9 7.5-9.5V6z" />
      <path d="m8.8 12 2.3 2.3 4.1-4.6" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.5 20c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" />
      <rect x="3" y="7.5" width="18" height="12" rx="2.2" />
      <path d="M16 13.5h2.5" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2" />
      <path d="M15.5 8.5V6A2 2 0 0 0 13.5 4H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" />
    </>
  ),
  logout: (
    <>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M16 8l4 4-4 4M20 12H9" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  qr: (
    <>
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" />
      <rect x="14" y="3.5" width="6.5" height="6.5" rx="1" />
      <rect x="3.5" y="14" width="6.5" height="6.5" rx="1" />
      <path d="M14 14h2.5v2.5H14zM20.5 14v2.5M14 20.5h2.5M20.5 20.5h0M18 18v2.5" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.3 2.8 2.8L16.2 9.5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5 2.8 19.5h18.4z" />
      <path d="M12 10v4.5M12 17.2h.01" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  thermometer: (
    <>
      <path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0z" />
      <path d="M12 9v7" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 5v5h-5M4 19v-5h5" />
      <path d="M19 10A7.5 7.5 0 0 0 5.8 7.5M5 14a7.5 7.5 0 0 0 13.2 2.5" />
    </>
  ),
  star: <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9-4.3-4.1 5.9-.8z" />,
  thumbUp: (
    <>
      <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z" />
      <path d="M7 11l4-7a2 2 0 0 1 2 2l-.6 4H19a2 2 0 0 1 2 2.3l-1.2 6a2 2 0 0 1-2 1.7H7" />
    </>
  ),
  thumbDown: (
    <>
      <path d="M7 13V4H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1z" />
      <path d="M7 13l4 7a2 2 0 0 0 2-2l-.6-4H19a2 2 0 0 0 2-2.3l-1.2-6a2 2 0 0 0-2-1.7H7" />
    </>
  ),
  home: (
    <>
      <path d="m3 11 9-7.5 9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
    </>
  ),
  filter: <path d="M4 5h16l-6.2 7.5V19l-3.6-1.8v-4.7z" />,
};

export default function Icon({ name, size = 18, stroke = 1.7 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name] || PATHS.document}
    </svg>
  );
}

// Dark-navy outline icon on a light-gray (or white) circle — the single
// icon treatment used everywhere.
export function IconCircle({ name, size = "md", tone = "gray", iconSize }) {
  const cls = ["sc-icon-circle"];
  if (tone === "white") cls.push("sc-icon-circle--white");
  if (size === "sm") cls.push("sc-icon-circle--sm");
  if (size === "lg") cls.push("sc-icon-circle--lg");
  const px = iconSize || (size === "sm" ? 15 : size === "lg" ? 22 : 18);
  return (
    <span className={cls.join(" ")}>
      <Icon name={name} size={px} />
    </span>
  );
}

// The project's existing shield-and-cross mark (same artwork as the home
// page logo).
export function BrandMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M32 4 54 12v16c0 16-10 26-22 32C20 54 10 44 10 28V12L32 4Z" fill="#3b2fe0" />
      <path d="M32 20v20M22 30h20" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <circle cx="47" cy="47" r="5" fill="#a855f7" />
    </svg>
  );
}
