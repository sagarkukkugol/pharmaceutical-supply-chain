import { useEffect, useState } from "react";
import { QRScanUpload } from "./BatchCodeInput";

// ============================================================
// Homepage images — centralized, replaceable asset config
// ============================================================
// To change any of the six homepage photos, replace the corresponding
// file in src/assets/images/ with your own image (same filename, any
// real photo). Nothing in this component or any CSS needs to change —
// Vite re-bundles whatever file is at that path.
import heroImage from "../assets/images/hero-pharmaceutical.png"; // Replace this image file to change the Hero image.
import manufacturerImage from "../assets/images/manufacturer.jpg"; // Replace this image file to change the Manufacturer image.
import transporterImage from "../assets/images/transporter.jpg"; // Replace this image file to change the Transporter image.
import distributorImage from "../assets/images/distributor.jpg"; // Replace this image file to change the Distributor image.
import pharmacyImage from "../assets/images/pharmacy.jpg"; // Replace this image file to change the Pharmacy image.
import consumerImage from "../assets/images/consumer.jpg";
import partnerImage from "../assets/images/partner.jpg"; // Replace this image file to change the Consumer image.

const homepageImages = {
  hero: heroImage,
  manufacturer: manufacturerImage,
  transporter: transporterImage,
  distributor: distributorImage,
  pharmacy: pharmacyImage,
  consumer: consumerImage,
};

// ============================================================
// HomePage — one long scrolling landing page
// ============================================================
// Sections, top to bottom: header, hero, Our Key Features, How It Works,
// Partner Login, Verify Your Medicine (the final major section), footer,
// plus a floating Go-to-Top button.
//
// It builds NO verification or login logic of its own:
//  - "Login →" calls onPartnerLogin (the existing sign-in flow).
//  - The verify card hands a batch code (scanned / decoded from an
//    uploaded QR image / typed) to onVerifyCode, which opens the existing
//    Customer Verification screen. Scanning and QR-image decoding are the
//    existing QRScanUpload component.
//
// Photos: see the homepageImages config above — replace a file in
// src/assets/images/ to change a photo. If an image ever fails to load
// at runtime, Photo (below) falls back to a clean illustrated placeholder
// rather than a broken-image icon.

const BLUE_BRIGHT = "#2563eb";
// NAVY stays a literal hex — it's also used for a few decorative/
// background fills that must NOT flip in dark mode (the footer, and a
// few shapes inside the illustrated Scene fallbacks). For actual text
// and icon-stroke color, use INK below instead, which IS theme-aware.
const NAVY = "#0b1b3f";
// NEW: theme-aware text colors (see the --ink/--ink-muted CSS variables
// defined in `css` below, flipped by the light/dark toggle).
const INK = "var(--ink)";
const MUTED = "var(--ink-muted)";

const NAV = [
  { label: "Home", target: "top" },
  { label: "Key Features", target: "features" },
  { label: "How It Works", target: "how" },
  { label: "Partner Login", target: "partner" },
];

function scrollToTarget(target) {
  if (target === "top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- icons (monochrome outline) ---------- */
const stroke = { fill: "none", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
const Ico = ({ d, size = 22, color = INK, extra }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke}>
    <path d={d} />
    {extra}
  </svg>
);
const IconShield = (p) => <Ico d="M12 2.8 19.5 5.6v5.8c0 4.6-3.2 8-7.5 9.8-4.3-1.8-7.5-5.2-7.5-9.8V5.6L12 2.8Zm-2.8 9 2.1 2.1 3.7-4" {...p} />;
const IconDoc = (p) => <Ico d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5" {...p} />;
const IconLock = (p) => <Ico d="M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11M12 15v2" {...p} />;
const IconQr = (p) => <Ico d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2.5v2.5H14zM19 14v3M14 19.5h3M19 20h1M6.5 6.5h1M16.5 6.5h1M6.5 16.5h1" {...p} />;
const IconCube = (p) => <Ico d="M12 2.8 20 7v10l-8 4.2L4 17V7l8-4.2ZM4 7l8 4.2L20 7M12 11.2v10" {...p} />;
const IconTruck = (p) => <Ico d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7M7 18a1.7 1.7 0 1 0 0-.01M17 18a1.7 1.7 0 1 0 0-.01" {...p} />;
const IconHistory = (p) => <Ico d="M7 3h7l4 4v14H7zM14 3v4h4M10 11h5M10 14.5h5M10 18h3" {...p} />;
const IconCheckCircle = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="11" fill={BLUE_BRIGHT} />
    <path d="m7.2 12.4 3.2 3.2 6.4-6.6" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconArrow = ({ color = "#fff", size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const IconCamera = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff">
    <path d="M9 4 7.5 6H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2.5L15 4H9Zm3 4.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />
  </svg>
);
const IconImage = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={BLUE_BRIGHT} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.7" />
    <path d="m4 18 5-5 4 4 3-3 4 4" />
  </svg>
);

function Logo({ light = false }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "10px", fontWeight: 700, fontSize: "17px", color: light ? "#fff" : NAVY }}>
      <svg width="30" height="32" viewBox="0 0 64 68">
        <path d="M32 3 56 12v17c0 17-11 28-24 35C19 57 8 46 8 29V12L32 3Z" fill={light ? "#fff" : BLUE_BRIGHT} />
        <path d="M32 20v22M21 31h22" stroke={light ? NAVY : "#fff"} strokeWidth="6" strokeLinecap="round" />
      </svg>
      <span>
        Pharmaceutical <span style={{ color: light ? "#fff" : BLUE_BRIGHT }}>Supply Chain</span>
      </span>
    </span>
  );
}

/* ---------- photo slot with illustrated fallback ---------- */
function Scene({ kind }) {
  const bg = "#e8f0fe";
  const line = "#9db8e6";
  const solid = "#c7d9f7";
  const accent = BLUE_BRIGHT;
  const common = { width: "100%", height: "100%", preserveAspectRatio: "xMidYMid slice", viewBox: "0 0 800 450" };
  const scenes = {
    lab: (
      <>
        {[120, 230, 340, 450, 560].map((x) => (
          <g key={x}>
            <rect x={x} y="250" width="62" height="110" rx="10" fill={solid} />
            <rect x={x + 14} y="228" width="34" height="26" rx="5" fill={accent} />
          </g>
        ))}
        <rect x="0" y="360" width="800" height="90" fill="#dbe7fb" />
      </>
    ),
    factory: (
      <>
        <rect x="0" y="300" width="800" height="150" fill="#dbe7fb" />
        {[80, 190, 300, 410, 520, 630].map((x) => (
          <g key={x}>
            <rect x={x} y="235" width="46" height="70" rx="8" fill="#fff" stroke={line} strokeWidth="3" />
            <rect x={x + 9} y="218" width="28" height="20" rx="4" fill={accent} />
          </g>
        ))}
        <rect x="0" y="305" width="800" height="14" fill={accent} opacity="0.55" />
        <path d="M60 60h120v90H60zM220 90h90v60h-90z" fill={solid} />
      </>
    ),
    truck: (
      <>
        <rect x="0" y="330" width="800" height="120" fill="#dbe7fb" />
        <rect x="0" y="372" width="800" height="6" fill="#fff" opacity="0.8" />
        <rect x="150" y="190" width="330" height="130" rx="10" fill="#fff" stroke={line} strokeWidth="4" />
        <path d="M490 230h80l60 50v40H490z" fill={accent} opacity="0.85" />
        <circle cx="230" cy="330" r="30" fill={NAVY} />
        <circle cx="400" cy="330" r="30" fill={NAVY} />
        <circle cx="590" cy="330" r="30" fill={NAVY} />
      </>
    ),
    boxes: (
      <>
        <rect x="0" y="360" width="800" height="90" fill="#dbe7fb" />
        {[0, 1, 2].map((r) =>
          [0, 1, 2, 3, 4].map((c) => (
            <rect key={`${r}-${c}`} x={70 + c * 140} y={90 + r * 90} width="118" height="74" rx="6" fill={(r + c) % 2 ? solid : "#fff"} stroke={line} strokeWidth="3" />
          ))
        )}
        <rect x="40" y="70" width="8" height="290" fill={accent} />
        <rect x="752" y="70" width="8" height="290" fill={accent} />
      </>
    ),
    pharmacy: (
      <>
        {[70, 160, 250].map((y) => (
          <rect key={y} x="40" y={y + 70} width="720" height="8" fill={line} />
        ))}
        {[0, 1, 2].map((r) =>
          [0, 1, 2, 3, 4, 5, 6, 7].map((c) => (
            <rect key={`${r}-${c}`} x={60 + c * 88} y={80 + r * 90} width="64" height="62" rx="5" fill={(r * 3 + c) % 3 === 0 ? accent : (r + c) % 2 ? solid : "#fff"} stroke={line} strokeWidth="2" opacity="0.95" />
          ))
        )}
        <circle cx="690" cy="60" r="26" fill="#fff" />
        <path d="M690 46v28M676 60h28" stroke={accent} strokeWidth="7" strokeLinecap="round" />
      </>
    ),
    phone: (
      <>
        <rect x="0" y="0" width="800" height="450" fill="#eaf1fd" />
        <rect x="320" y="40" width="170" height="350" rx="26" fill={NAVY} />
        <rect x="334" y="58" width="142" height="314" rx="16" fill="#fff" />
        <rect x="364" y="120" width="82" height="82" rx="8" fill="none" stroke={accent} strokeWidth="6" />
        <rect x="378" y="134" width="22" height="22" fill={accent} />
        <rect x="410" y="166" width="22" height="22" fill={accent} />
        <circle cx="405" cy="265" r="26" fill={accent} />
        <path d="m393 265 9 9 17-18" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="170" y="290" width="120" height="86" rx="8" fill="#fff" stroke={line} strokeWidth="3" />
      </>
    ),
    handshake: (
      <>
        <rect width="800" height="450" fill="#e3ecfc" />
        <circle cx="330" cy="225" r="130" fill={NAVY} opacity="0.92" />
        <circle cx="470" cy="225" r="130" fill={accent} opacity="0.85" />
        <path d="m350 228 36 36 66-70" fill="none" stroke="#fff" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  };
  return (
    <svg {...common} role="img" aria-hidden="true">
      <rect width="800" height="450" fill={bg} />
      {scenes[kind] || scenes.lab}
    </svg>
  );
}

function Photo({ src, alt, kind, style, className }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={className} style={{ overflow: "hidden", ...style }}>
      {failed ? (
        <Scene kind={kind} />
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      )}
    </div>
  );
}

/* ---------- content ---------- */
const FEATURES = [
  { icon: IconQr, title: "Medicine Verification", text: "Verify a medicine using its QR code or batch code." },
  { icon: IconCube, title: "Batch Registration", text: "Register pharmaceutical batches and record their details on the blockchain." },
  { icon: IconTruck, title: "Ownership Tracking", text: "Track ownership transfers between authorized supply-chain participants." },
  { icon: IconHistory, title: "Batch History", text: "View the recorded history of a pharmaceutical batch." },
];

const STORY = [
  { role: "Manufacturer", kind: "factory", src: homepageImages.manufacturer, text: "Registers the pharmaceutical batch with complete product details and records its initial information securely on the blockchain." },
  { role: "Transporter", kind: "truck", src: homepageImages.transporter, text: "Receives the batch and records its movement through the supply chain, ensuring traceability throughout transportation." },
  { role: "Distributor", kind: "boxes", src: homepageImages.distributor, text: "Receives the pharmaceutical batch and securely records the ownership transfer on the blockchain." },
  { role: "Pharmacy", kind: "pharmacy", src: homepageImages.pharmacy, text: "Verifies the batch authenticity, receives ownership, and makes the verified medicine available to customers." },
  { role: "Consumer", kind: "phone", src: homepageImages.consumer, text: "Scans the QR code or enters the batch code to verify authenticity, check expiry and view the complete batch history." },
];

export default function HomePage({ onPartnerLogin, onVerifyCode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [active, setActive] = useState("top");
  const [tab, setTab] = useState("scan");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  // NEW: light/dark toggle — starts from a previously saved choice, or
  // the OS-level preference if there isn't one yet, then persists
  // whatever the person picks.
  const [theme, setTheme] = useState(() => {
    const stored = window.localStorage.getItem("hp-theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    window.localStorage.setItem("hp-theme", theme);
  }, [theme]);

  useEffect(() => {
    const onScroll = () => {
      setShowTop(window.scrollY > 500);
      let current = "top";
      for (const n of NAV.slice(1)) {
        const el = document.getElementById(n.target);
        if (el && el.getBoundingClientRect().top <= 120) current = n.target;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (target) => {
    setMenuOpen(false);
    scrollToTarget(target);
  };

  const submitTyped = () => {
    if (!code.trim()) {
      setCodeError("Please enter the batch code printed on the box.");
      return;
    }
    setCodeError("");
    onVerifyCode(code.trim());
  };

  return (
    <div className="hp-root" data-theme={theme} style={rootStyle}>
      <style>{css}</style>

      {/* ===== Header ===== */}
      <header style={headerStyle}>
        <div style={headerInner}>
          <button type="button" onClick={() => go("top")} style={plainButton} aria-label="Home">
            <Logo light={theme === "dark"} />
          </button>
          <nav className="hp-nav" style={{ display: "flex", gap: "30px" }}>
            {NAV.map((n) => (
              <button
                key={n.label}
                type="button"
                onClick={() => go(n.target)}
                className={`nav-link${active === n.target ? " nav-link-active" : ""}`}
                style={{ ...navLink, color: active === n.target ? BLUE_BRIGHT : INK }}
              >
                {n.label}
              </button>
            ))}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* NEW: light/dark toggle */}
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
                </svg>
              )}
            </button>
            <button type="button" className="hp-burger" style={burgerStyle} onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" aria-expanded={menuOpen}>
              <svg width="24" height="24" viewBox="0 0 24 24" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none">
                {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="hp-mobile-menu" style={mobileMenuStyle}>
            {NAV.map((n) => (
              <button key={n.label} type="button" onClick={() => go(n.target)} style={mobileLink}>
                {n.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ===== Hero ===== */}
      <section id="top" className="hp-hero" style={heroStyle}>
        <div className="hp-hero-text" style={heroText}>
          <div style={{ fontSize: "14px", letterSpacing: "1.5px", color: MUTED, fontWeight: 500 }}>BLOCKCHAIN POWERED</div>
          <h1 className="hp-h1" style={h1Style}>
            Pharmaceutical
            <br />
            <span style={{ color: BLUE_BRIGHT }}>Supply Chain Platform</span>
          </h1>
          <p style={{ fontSize: "19px", lineHeight: 1.5, color: INK, margin: "16px 0 26px", maxWidth: "480px" }}>
            Every batch. Every transfer. Every step - securely tracked.
          </p>
          <button type="button" style={ctaStyle} onClick={() => go("verify")}>
            Verify Your Medicine
            {/* <IconArrow /> */}
          </button>
          <div className="hp-trust" style={trustRow}>
            <span style={trustItem}><IconShield size={22} /> Blockchain Secured</span>
            <span style={trustSep} />
            <span style={trustItem}><IconDoc size={22} /> End-to-End Traceability</span>
            <span style={trustSep} />
            <span style={trustItem}><IconLock size={22} /> Data Integrity Assured</span>
          </div>
        </div>
        <div className="hp-hero-img" style={heroImgWrap}>
          <Photo src={homepageImages.hero} alt="Pharmaceutical laboratory" kind="lab" style={{ width: "100%", height: "100%" }} />
        </div>
      </section>

      {/* ===== Our Key Features ===== */}
      <section id="features" style={{ ...sectionStyle, background: "var(--bg-page)" }}>
        <h2 style={h2Style}>Our Key Features</h2>
        <p style={subStyle}>One platform to register, track, verify and trace every pharmaceutical batch.</p>
        <div className="hp-features" style={featureGrid}>
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} style={featureCard}>
              <span style={{ display: "inline-flex", marginBottom: "14px" }}>
                <Icon size={34} />
              </span>
              <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: INK, whiteSpace: "nowrap" }}>{title}</h3>
              <p style={{ margin: 0, fontSize: "15px", lineHeight: 1.5, color: MUTED }}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== How It Works ===== */}
      <section id="how" style={{ ...sectionStyle, paddingBottom: "20px" }}>
        <h2 style={h2Style}>How It Works</h2>
        <p style={subStyle}>Follow every step of a medicine’s journey - from manufacturing to the hands of the consumer.</p>
        <div style={{ maxWidth: "1120px", margin: "40px auto 0" }}>
          {STORY.map((s, i) => {
            const imageLeft = i % 2 === 0;
            const image = <Photo className="hp-story-img" src={s.src} alt={s.role} kind={s.kind} style={storyImg} />;
            const text = (
              <div className="hp-story-text" style={{ flex: "1 1 40%", padding: "0 10px" }}>
                <h3 style={{ margin: "0 0 10px", fontSize: "28px", color: INK }}>{s.role}</h3>
                <p style={{ margin: 0, fontSize: "17px", lineHeight: 1.6, color: MUTED }}>{s.text}</p>
              </div>
            );
            return (
              <div key={s.role} className="hp-story-row" style={storyRow}>
                {imageLeft ? image : text}
                {imageLeft ? text : image}
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== Partner Login ===== */}
      <section id="partner" style={{ background: "var(--bg-subtle)", padding: "46px 24px" }}>
        <div className="hp-partner" style={partnerInner}>
          <div style={{ flex: "1 1 42%" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "32px", fontWeight: 800, color: INK }}>Partner Login</h2>
            <p style={{ margin: "0 0 22px", fontSize: "17px", lineHeight: 1.55, color: MUTED, maxWidth: "460px" }}>
              For authorized manufacturers, transporters, distributors, pharmacies and other supply-chain partners to securely manage pharmaceutical batches.
            </p>
            <button type="button" style={ctaStyle} onClick={onPartnerLogin}>
              Login
              {/* <IconArrow /> */}
            </button>
          </div>
          <Photo src={partnerImage} alt="Partnership" kind="handshake" style={{ ...storyImg, flex: "1 1 52%", height: "260px" }} />
        </div>
      </section>

      {/* ===== Verify Your Medicine (final major section) ===== */}
      <section id="verify" style={{ background: "var(--bg-page)", padding: "56px 24px 64px", scrollMarginTop: "72px" }}>
        <div className="hp-verify" style={verifyInner}>
          <div style={{ flex: "1 1 340px", maxWidth: "430px" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "34px", fontWeight: 800, color: INK }}>Verify Your Medicine</h2>
            <p style={{ margin: "0 0 22px", fontSize: "16px", lineHeight: 1.55, color: MUTED }}>
              Check the authenticity, expiry and complete traceability of your medicine using its QR code or batch code.
            </p>
            {["Blockchain Verified", "Track Supply Chain", "Check Expiry", "Ensure Your Safety"].map((b) => (
              <div key={b} style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px", fontSize: "19px", color: INK }}>
                <IconCheckCircle />
                {b}
              </div>
            ))}
          </div>

          <div className="hp-verify-card" style={verifyCard}>
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
              <button type="button" style={tab === "scan" ? tabOn : tabOff} onClick={() => setTab("scan")}>
                <IconQr size={18} color={tab === "scan" ? "#fff" : INK} /> Scan QR Code
              </button>
              <button type="button" style={tab === "code" ? tabOn : tabOff} onClick={() => setTab("code")}>
                <IconDoc size={18} color={tab === "code" ? "#fff" : INK} /> Enter Batch Code
              </button>
            </div>

            {tab === "scan" ? (
              <QRScanUpload onCode={onVerifyCode}>
                {({ openScanner, openUpload, decoding }) => (
                  <div className="hp-scan-row" style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                    <div style={scanBlock}>
                      <IconQr size={40} color={BLUE_BRIGHT} />
                      <div style={{ fontWeight: 700, fontSize: "18px", color: INK, margin: "8px 0 4px" }}>Scan QR Code</div>
                      <div style={{ fontSize: "14px", color: MUTED, marginBottom: "14px" }}>Point your camera at the medicine QR code to verify instantly.</div>
                      <button type="button" style={primaryBtn} onClick={openScanner}>
                        <IconCamera /> Open Scanner 
                      </button>
                    </div>
                    <div className="hp-or" style={{ color: MUTED, fontWeight: 600 }}>OR</div>
                    <button type="button" style={uploadBtn} onClick={openUpload} disabled={decoding}>
                      <IconImage /> {decoding ? "Reading..." : "Upload QR Image"}
                    </button>
                  </div>
                )}
              </QRScanUpload>
            ) : (
              <div>
                <div style={{ fontWeight: 700, fontSize: "18px", color: INK, marginBottom: "4px" }}>Enter Batch Code</div>
                <div style={{ fontSize: "14px", color: MUTED, marginBottom: "12px" }}>Type the batch code printed on the back of the medicine box.</div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitTyped()}
                  placeholder="Enter batch code (e.g. PARACETAMOL-001)"
                  style={inputStyle}
                />
                {codeError && <div style={{ color: "#dc2626", fontSize: "13px", marginTop: "6px" }}>{codeError}</div>}
                <button type="button" style={{ ...primaryBtn, marginTop: "14px" }} onClick={submitTyped}>
                  Verify Medicine <IconArrow size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer style={footerStyle}>
        <div className="hp-footer" style={footerInner}>
          <Logo light />
          <nav style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px 0" }}>
            {NAV.map((n, i) => (
              <button
                key={n.label}
                type="button"
                onClick={() => go(n.target)}
                style={{ ...footerLink, borderLeft: i === 0 ? "none" : "1px solid rgba(255,255,255,0.25)" }}
              >
                {n.label}
              </button>
            ))}
          </nav>
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)" }}>© Pharmaceutical Supply Chain. All rights reserved.</span>
        </div>
      </footer>

      {/* ===== Go to top ===== */}
      {showTop && (
        <button type="button" title="Go to Top" aria-label="Go to Top" style={topButton} onClick={() => go("top")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

const css = `
/* NEW: light/dark theme variables. --bg-page/--bg-surface/--bg-subtle
   cover the page background, card/header surfaces, and subtle tinted
   panels respectively; --ink/--ink-muted cover primary/secondary text
   and icon-stroke color (see INK/MUTED above); --border covers hairline
   borders/dividers. The footer and a few decorative illustration shapes
   intentionally stay a fixed navy in both themes — only genuinely
   light-surfaced content flips. */
.hp-root {
  --bg-page: #ffffff;
  --bg-surface: #ffffff;
  --bg-subtle: #f6f9ff;
  --ink: #0b1b3f;
  --ink-muted: #475569;
  --border: #e4eaf6;
}
.hp-root[data-theme="dark"] {
  --bg-page: #0b1220;
  --bg-surface: #121a2e;
  --bg-subtle: #0f1830;
  --ink: #e8edf7;
  --ink-muted: #94a3b8;
  --border: #243150;
}
.hp-root section[id] { scroll-margin-top: 72px; }
.hp-root button { font-family: inherit; }
.hp-burger { display: none !important; }

/* NEW: theme toggle button */
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-subtle);
  cursor: pointer;
  transition: background 150ms ease;
}
.theme-toggle:hover { background: var(--border); }

/* NEW: nav underline — animates left-to-right on hover/focus, and
   stays visible for whichever section is currently active (active
   state already comes from the existing scroll-spy logic above; this
   only changes how it's drawn). */
.nav-link {
  position: relative;
}
.nav-link::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 14px;
  width: 100%;
  height: 2px;
  background: ${BLUE_BRIGHT};
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 250ms ease;
}
.nav-link:hover::after,
.nav-link:focus-visible::after,
.nav-link-active::after {
  transform: scaleX(1);
}
.nav-link:focus-visible {
  outline: 2px solid ${BLUE_BRIGHT};
  outline-offset: 4px;
  border-radius: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .nav-link::after { transition: none; }
}
@media (max-width: 900px) {
  .hp-nav { display: none !important; }
  .hp-burger { display: inline-flex !important; }
  .hp-hero { flex-direction: column !important; min-height: 0 !important; }
  .hp-hero-text { padding: 40px 24px 28px !important; }
  .hp-hero-img { width: 100% !important; height: 260px !important; clip-path: none !important; position: relative !important; }
  .hp-features { grid-template-columns: repeat(2, 1fr) !important; }
  .hp-verify, .hp-partner { flex-direction: column !important; align-items: stretch !important; }
  .hp-verify-card { width: 100% !important; flex-basis: auto !important; }
  .hp-footer { flex-direction: column !important; text-align: center; }
}
@media (max-width: 700px) {
  .hp-story-row { flex-direction: column !important; }
  .hp-story-row > * { width: 100% !important; flex-basis: auto !important; }
  .hp-story-row .hp-story-img { order: 0; height: 220px !important; }
  .hp-story-row .hp-story-text { order: 1; }
  .hp-h1 { font-size: 38px !important; }
  .hp-trust { flex-wrap: wrap !important; gap: 12px 18px !important; }
  .hp-trust > span:nth-child(even) { display: none; }
}
@media (max-width: 560px) {
  .hp-features { grid-template-columns: 1fr !important; }
  .hp-scan-row { flex-direction: column !important; align-items: stretch !important; }
  .hp-or { text-align: center; }
}
`;

const rootStyle = {
  position: "relative",
  width: "100vw",
  left: "50%",
  marginLeft: "-50vw",
  boxSizing: "border-box",
  background: "var(--bg-page)",
  color: INK,
  fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
  textAlign: "left",
  overflowX: "clip",
};
const headerStyle = { position: "sticky", top: 0, zIndex: 50, background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" };
const headerInner = { maxWidth: "1180px", margin: "0 auto", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" };
const plainButton = { background: "none", border: "none", padding: 0, cursor: "pointer" };
const navLink = { background: "none", border: "none", borderRadius: 0, padding: "22px 2px 20px", fontSize: "14px", fontWeight: 600, cursor: "pointer" };
const burgerStyle = { background: "none", border: "none", cursor: "pointer", alignItems: "center", justifyContent: "center", padding: "6px" };
const mobileMenuStyle = { borderTop: "1px solid var(--border)", background: "var(--bg-surface)", display: "flex", flexDirection: "column", padding: "8px 24px 14px" };
const mobileLink = { background: "none", border: "none", textAlign: "left", padding: "12px 0", fontSize: "16px", fontWeight: 600, color: INK, cursor: "pointer", borderBottom: "1px solid var(--border)" };
// CHANGED: was a fixed 460px, which left "Our Key Features" visible in
// the initial viewport on most screens. headerInner below is a fixed
// 64px, so this fills exactly the remaining viewport height on first
// load. It's min-height (not height), so on mobile — where the hero
// stacks into text-then-image and can need more room than 100vh — the
// section still grows naturally instead of clipping content.
const heroStyle = { display: "flex", minHeight: "calc(100vh - 64px)", background: "var(--bg-subtle)", position: "relative", overflow: "hidden" };
const heroText = { flex: "0 0 56%", padding: "56px 24px 40px max(24px, calc((100vw - 1180px) / 2 + 24px))", boxSizing: "border-box", position: "relative", zIndex: 2 };
const h1Style = { margin: "10px 0 0", fontSize: "50px", lineHeight: 1.08, fontWeight: 800, letterSpacing: "-1.2px", color: INK };
const ctaStyle = { display: "inline-flex", alignItems: "center", gap: "10px", padding: "14px 26px", border: "none", borderRadius: "8px", background: BLUE_BRIGHT, color: "#fff", fontSize: "16px", fontWeight: 600, cursor: "pointer", boxShadow: "0 6px 16px rgba(37, 99, 235, 0.25)" };
const trustRow = { display: "flex", alignItems: "center", gap: "16px", marginTop: "38px", flexWrap: "nowrap" };
const trustItem = { display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", color: INK, whiteSpace: "nowrap" };
const trustSep = { width: "1px", height: "24px", background: "var(--border)" };
// CHANGED: steeper inset (16% -> 32%) for a sharper, more pronounced
// diagonal boundary — same clip-path mechanism as before (the photo
// itself is never rotated or skewed, object-fit: cover keeps it filling
// the clipped region undistorted; only the visible shape of the wrapper
// changes). A literal 45° would need the inset to roughly equal the
// hero's height-to-width ratio, which varies by viewport and would eat
// most of the image on this short, wide hero — this is tuned to read as
// a crisp, Manhattan-style diagonal without swallowing the photo.
const heroImgWrap = { position: "absolute", top: 0, right: 0, bottom: 0, width: "52%", clipPath: "polygon(32% 0, 100% 0, 100% 100%, 0 100%)", zIndex: 1 };
const sectionStyle = { padding: "56px 24px 40px", textAlign: "center", background: "var(--bg-page)" };
const h2Style = { margin: 0, fontSize: "34px", fontWeight: 800, color: INK, letterSpacing: "-0.5px" };
const subStyle = { margin: "10px 0 0", fontSize: "16px", color: MUTED };
const featureGrid = { maxWidth: "1120px", margin: "32px auto 0", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" };
const featureCard = { textAlign: "left", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "24px 22px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)" };
const storyRow = { display: "flex", alignItems: "center", gap: "40px", marginBottom: "36px", textAlign: "left" };
const storyImg = { flex: "1 1 54%", height: "300px", borderRadius: "6px", boxShadow: "0 4px 16px rgba(15, 23, 42, 0.1)" };
const partnerInner = { maxWidth: "1120px", margin: "0 auto", display: "flex", alignItems: "center", gap: "40px", textAlign: "left" };
const verifyInner = { maxWidth: "1120px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "40px", flexWrap: "wrap", textAlign: "left" };
const verifyCard = { flex: "0 0 600px", maxWidth: "100%", boxSizing: "border-box", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px", boxShadow: "0 8px 30px rgba(15, 23, 42, 0.07)" };
const tabBase = { flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "11px 12px", borderRadius: "6px", fontSize: "14px", fontWeight: 600, cursor: "pointer" };
const tabOn = { ...tabBase, border: "none", background: BLUE_BRIGHT, color: "#fff" };
const tabOff = { ...tabBase, border: "1px solid var(--border)", background: "var(--bg-subtle)", color: INK };
const scanBlock = { flex: 1, background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px", textAlign: "center" };
const primaryBtn = { width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "13px", border: "none", borderRadius: "6px", background: BLUE_BRIGHT, color: "#fff", fontSize: "15px", fontWeight: 600, cursor: "pointer" };
const uploadBtn = { flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: "10px", padding: "14px 20px", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-surface)", color: BLUE_BRIGHT, fontSize: "15px", fontWeight: 600, cursor: "pointer" };
const inputStyle = { width: "100%", boxSizing: "border-box", padding: "13px 14px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "15px", color: INK, background: "var(--bg-surface)", outline: "none" };
const footerStyle = { background: NAVY, padding: "26px 24px" };
const footerInner = { maxWidth: "1180px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px", flexWrap: "wrap" };
const footerLink = { background: "none", border: "none", padding: "0 16px", color: "rgba(255,255,255,0.88)", fontSize: "13px", cursor: "pointer" };
const topButton = { position: "fixed", right: "22px", bottom: "22px", width: "46px", height: "46px", borderRadius: "50%", border: "none", background: BLUE_BRIGHT, boxShadow: "0 6px 16px rgba(37, 99, 235, 0.35)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 };
