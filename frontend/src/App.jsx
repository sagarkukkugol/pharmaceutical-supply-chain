import { useState, useEffect } from "react";
import { isChainReachable, getReadOnlyContract, getProvider, requestMetaMaskAccountSelection, getCurrentlyConnectedAccount, isMetaMaskOnCorrectNetwork, switchMetaMaskToLocalNetwork, isMetaMaskAvailable } from "./contract";
import {
  signup,
  login,
  adminLogin,
  listAllUsers,
  getUserByAddress,
  revealPrivateKey,
  verifyForgotPasswordAnswers,
  resetPasswordWithToken,
  adminSetAccountStatus,
} from "./api";
import { INDIAN_CITIES } from "./cities";
import { SPORTS, INDIAN_FOODS } from "./sportsAndFoods";
import ImportWalletModal from "./components/ImportWalletModal";
import ViewQRButton from "./components/QRModal";
import MetaMaskConnectCard from "./components/MetaMaskConnectCard";
import MessageBox from "./components/MessageBox";
import HomePage from "./components/HomePage";
import TermsAndConditionsModal from "./components/TermsAndConditionsModal";
import OwnerDashboard from "./dashboard/DashboardApp";
import ConsumerApp from "./dashboard/ConsumerApp";
import { describeError, formatDateOnly, shortenAddressFallback, DELIVERY_STATUS_LABELS } from "./utils";
import { cardStyle, labelStyle, inputStyle, readonlyBoxStyle, buttonStyle } from "./styles";

// CHANGED: "Consumer" and "Wholesaler" are no longer sign-up roles.
// A consumer never creates an account at all — see ConsumerVerify below,
// a public verify/rate flow that needs no login and no MetaMask.
// "Wholesaler" was replaced with "Transporter", moved to right after the
// Manufacturer in the chain.
const ROLES = ["Manufacturer", "Transporter", "Distributor", "Pharmacy"];
// Password rule shown to the user and checked before submitting — the
// backend enforces the same rule again, so this is just fast feedback.
const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@$])[A-Za-z0-9@$]{8,}$/;
const PASSWORD_HINT =
  "At least 8 characters, including a number, an uppercase letter, a lowercase letter, and @ or $.";

export default function App() {
  // "landing" | "admin-dashboard" | "owner-auth" | "forgot-password" |
  // "dashboard" | "consumer-verify"
  // (Admin no longer has its own login page — it signs in through the
  // single Partner Login form by choosing the Admin role.)
  const [view, setView] = useState("landing");
  // Batch code handed from the home page (scan / upload / typed) to the
  // existing Customer Verification screen, which verifies it on load.
  const [verifyCode, setVerifyCode] = useState("");
  const [chainOk, setChainOk] = useState(null);
  // Holds { username, role, city, walletAddress, privateKey } for the
  // logged-in owner participant, for the lifetime of this browser tab.
  // NOT persisted anywhere (no localStorage) — refreshing the page logs
  // the user out, which is the safer default for a private key in memory.
  const [session, setSession] = useState(null);
  // NEW: kept in memory only for the admin's session, so AdminDashboard
  // can call the enable/disable endpoint without re-prompting for the
  // admin password on every click. Same trust boundary as the rest of
  // this app's simple auth — no persistent token exists anywhere else.
  const [adminPassword, setAdminPassword] = useState(null);

  useEffect(() => {
    isChainReachable().then(setChainOk);
  }, []);

  const handleLoggedIn = (data) => {
    setSession(data);
    setView("dashboard");
  };

  const handleLogout = () => {
    setSession(null);
    setAdminPassword(null);
    setView("landing");
  };

  // The signed-in dashboards and the public Verify Medicine page render
  // their own full-width shell (header + sidebar) instead of the narrow
  // centred column used by landing / auth / admin.
  if (view === "dashboard" && session) {
    return (
      <>
        {chainOk === false && <ChainDownBanner />}
        <OwnerDashboard session={session} onLogout={handleLogout} />
      </>
    );
  }
  if (view === "consumer-verify") {
    return (
      <>
        {chainOk === false && <ChainDownBanner />}
        <ConsumerApp
          initialCode={verifyCode}
          onBack={() => {
            setVerifyCode("");
            setView("landing");
          }}
        />
      </>
    );
  }

  return (
    <>
      {(view === "landing" || view === "admin-dashboard" || view === "owner-auth" || view === "forgot-password") && <HeroBackdrop />}
      <div
        className={view === "admin-dashboard" ? "light-surface" : undefined}
        style={view === "landing" ? { ...pageStyle, padding: 0, maxWidth: "none" } : pageStyle}
      >
        {view !== "landing" && view !== "owner-auth" && <h1 className="brand-title" style={titleStyle}>Pharmaceutical Supply Chain Platform</h1>}

        {chainOk === false && <ChainDownBanner />}

        {view === "landing" && (
          <HomePage
            onPartnerLogin={() => setView("owner-auth")}
            onVerifyCode={(code) => {
              setVerifyCode(code);
              setView("consumer-verify");
            }}
          />
        )}
        {view === "admin-dashboard" && <AdminDashboard adminPassword={adminPassword} onLogout={handleLogout} />}
        {view === "owner-auth" && (
          <OwnerAuth
            onBack={() => setView("landing")}
            onLoggedIn={handleLoggedIn}
            onAdminLoggedIn={(pwd) => {
              setAdminPassword(pwd);
              setView("admin-dashboard");
            }}
            onForgotPassword={() => setView("forgot-password")}
          />
        )}
        {view === "forgot-password" && <ForgotPasswordFlow onBack={() => setView("owner-auth")} />}
      </div>
    </>
  );
}

function ChainDownBanner() {
  return (
    <div style={{ ...cardStyle, borderColor: "#dc2626", color: "#b91c1c", margin: "12px" }}>
      Cannot reach the local blockchain at 127.0.0.1:8545. Run <code>npx hardhat node</code> in the blockchain folder, then reload this page.
    </div>
  );
}

// ============================================================
// NEW: HeroBackdrop — the full-viewport light gradient background used
// behind Landing and the Admin pages, matching the reference mockup.
// position: fixed + inset 0 means it always fills the browser edge to
// edge (left/right/top/bottom) regardless of scroll position or the
// app's own 700px/1180px centered content column, and negative z-index
// keeps it behind every normal-flow element without needing any of
// them to declare their own z-index. Purely CSS/SVG — no external
// image asset — so it never depends on a photo being bundled.
// ============================================================
// ============================================================
// Small field-prefix icons + IconInput helper — used by the redesigned
// Sign In / Register forms below to match the reference mockup (an icon
// inside each field, an eye toggle on password fields).
// ============================================================
function PersonFieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}
function LockFieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
function EyeToggleIcon({ open }) {
  return open ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a19.7 19.7 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a19.7 19.7 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// A single-line icon-prefixed input, with an optional right-side toggle
// (used for the password show/hide eye icon). Wraps the shared inputStyle
// so it stays consistent with every other input in the app.
function IconInput({
  icon,
  type = "text",
  value,
  onChange,
  placeholder,
  onKeyDown,
  autoFocus,
  rightToggle, // { open, onClick } — omit for no right icon
}) {
  return (
    <div style={heroInputWrapperStyle}>
      <span style={heroInputIconStyle}>{icon}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        style={{
          ...inputStyle,
          marginBottom: 0,
          paddingLeft: "38px",
          paddingRight: rightToggle ? "38px" : "12px",
        }}
      />
      {rightToggle && (
        <button type="button" onClick={rightToggle.onClick} style={heroInputRightToggleStyle} tabIndex={-1}>
          <EyeToggleIcon open={rightToggle.open} />
        </button>
      )}
    </div>
  );
}

// Shared "Blockchain Secured / End-to-End Traceability / Data Integrity
// Assured" trust row — used under Landing and under the Sign In/Register
// card.
function TrustFooter() {
  return (
    <div style={heroFooterRowStyle}>
      <span style={heroFooterItemStyle}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L20 5V11C20 16 16.5 19.5 12 21C7.5 19.5 4 16 4 11V5L12 2Z" stroke="#64748b" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        Blockchain Secured
      </span>
      <span style={heroFooterItemStyle}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="3" width="14" height="18" rx="2" stroke="#64748b" strokeWidth="2" />
          <line x1="8" y1="8" x2="16" y2="8" stroke="#64748b" strokeWidth="1.5" />
          <line x1="8" y1="12" x2="16" y2="12" stroke="#64748b" strokeWidth="1.5" />
          <line x1="8" y1="16" x2="13" y2="16" stroke="#64748b" strokeWidth="1.5" />
        </svg>
        End-to-End Traceability
      </span>
      <span style={heroFooterItemStyle}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="11" width="14" height="10" rx="2" stroke="#64748b" strokeWidth="2" />
          <path d="M8 11V7A4 4 0 0 1 16 7V11" stroke="#64748b" strokeWidth="2" />
        </svg>
        Data Integrity Assured
      </span>
    </div>
  );
}

function HeroBackdrop() {
  return (
    <div style={heroBackdropStyle}>
      <div style={heroBlobTopLeftStyle} />
      <div style={heroBlobBottomRightStyle} />

      {/* Hex network, top-right, with small icon glyphs on a few nodes */}
      <svg style={heroHexSvgStyle} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <g stroke="#bfdbfe" strokeWidth="1.5" fill="none" opacity="0.8">
          <polygon points="100,10 170,50 170,130 100,170 30,130 30,50" />
          <polygon points="100,40 145,65 145,115 100,140 55,115 55,65" />
          <line x1="100" y1="10" x2="100" y2="40" />
          <line x1="170" y1="50" x2="145" y2="65" />
          <line x1="170" y1="130" x2="145" y2="115" />
          <line x1="100" y1="170" x2="100" y2="140" />
          <line x1="30" y1="130" x2="55" y2="115" />
          <line x1="30" y1="50" x2="55" y2="65" />
        </g>
        {[[100, 10], [170, 50], [170, 130], [100, 170], [30, 130], [30, 50]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="3.5" fill="#93c5fd" />
        ))}
        {/* small vial glyph near the top node */}
        <g transform="translate(84,-14)" stroke="#93c5fd" strokeWidth="2" fill="none" opacity="0.85">
          <rect x="10" y="10" width="12" height="18" rx="3" />
          <rect x="9" y="4" width="14" height="7" rx="2" fill="#93c5fd" stroke="none" />
        </g>
        {/* small capsule glyph near the right node */}
        <g transform="translate(155,60) rotate(40)" opacity="0.85">
          <rect x="-11" y="-5" width="22" height="10" rx="5" fill="none" stroke="#93c5fd" strokeWidth="2" />
          <line x1="0" y1="-5" x2="0" y2="5" stroke="#93c5fd" strokeWidth="2" />
        </g>
        {/* small shield-check glyph near the bottom node */}
        <g transform="translate(84,152)" opacity="0.85">
          <path d="M12 2 L22 6 V15 C22 22 17 26 12 28 C7 26 2 22 2 15 V6 Z" fill="none" stroke="#93c5fd" strokeWidth="2" />
          <path d="M7 15 L11 19 L18 11" fill="none" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>

      {/* Vial + scattered pills, bottom-left corner */}
      <svg style={heroVialCornerStyle} viewBox="0 0 220 260" xmlns="http://www.w3.org/2000/svg">
        <g opacity="0.55">
          <rect x="60" y="30" width="70" height="150" rx="14" fill="#eaf2ff" stroke="#93c5fd" strokeWidth="2" />
          <rect x="72" y="10" width="46" height="26" rx="6" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
          <rect x="66" y="110" width="58" height="62" rx="8" fill="#60a5fa" opacity="0.55" />
        </g>
        <g opacity="0.6">
          <ellipse cx="40" cy="220" rx="22" ry="11" fill="#ffffff" stroke="#93c5fd" strokeWidth="2" />
          <path d="M22 220 A22 11 0 0 1 58 220" fill="#60a5fa" opacity="0.5" />
          <ellipse cx="150" cy="230" rx="18" ry="9" fill="#ffffff" stroke="#c4b5fd" strokeWidth="2" transform="rotate(-15 150 230)" />
          <ellipse cx="170" cy="200" rx="14" ry="7" fill="#dbeafe" stroke="#93c5fd" strokeWidth="2" transform="rotate(20 170 200)" />
        </g>
      </svg>

      {/* Clipboard + pen, bottom-right corner */}
      <svg style={heroClipboardCornerStyle} viewBox="0 0 220 240" xmlns="http://www.w3.org/2000/svg">
        <g opacity="0.5">
          <rect x="30" y="20" width="120" height="160" rx="10" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
          <rect x="60" y="8" width="60" height="20" rx="6" fill="#94a3b8" />
          <line x1="48" y1="60" x2="132" y2="60" stroke="#cbd5e1" strokeWidth="3" />
          <line x1="48" y1="80" x2="132" y2="80" stroke="#cbd5e1" strokeWidth="3" />
          <line x1="48" y1="100" x2="110" y2="100" stroke="#cbd5e1" strokeWidth="3" />
          <line x1="140" y1="40" x2="200" y2="220" stroke="#64748b" strokeWidth="6" strokeLinecap="round" />
          <line x1="188" y1="200" x2="200" y2="220" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

// ============================================================
// Landing — Verify (Consumer) or Owner as two cards, Admin as a small
// pill button pinned to the top-right corner of the browser window.
// Redesigned to match the light "hero" reference mockup: full-bleed
// gradient background (HeroBackdrop, rendered by App()), a big icon +
// two-tone gradient title + tagline, then a white card holding the
// role picker, then a row of trust badges.
// ============================================================
// ============================================================
// Admin dashboard — read-only list of everyone who signed up
// ============================================================
function AdminDashboard({ adminPassword, onLogout }) {
  const [tab, setTab] = useState("participants"); // "participants" | "batches"

  return (
    <div style={heroFloatingLightCardStyle}>
      <h2>Admin Dashboard</h2>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button
          style={{ ...tabButtonStyle, ...(tab === "participants" ? tabActiveStyle : {}) }}
          onClick={() => setTab("participants")}
        >
          Participants
        </button>
        <button
          style={{ ...tabButtonStyle, ...(tab === "batches" ? tabActiveStyle : {}) }}
          onClick={() => setTab("batches")}
        >
          All Batches
        </button>
      </div>

      {tab === "participants" ? <AdminParticipantsPanel adminPassword={adminPassword} /> : <AdminBatchesPanel />}

      <button style={{ ...buttonStyle, marginTop: "12px" }} onClick={onLogout}>
        Log Out
      </button>
    </div>
  );
}

function AdminParticipantsPanel({ adminPassword }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(null); // username currently being toggled

  const load = () => {
    setLoading(true);
    listAllUsers()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.resolve().then(load);
  }, []);

  const handleToggle = async (user) => {
    setToggling(user.username);
    setError("");
    try {
      await adminSetAccountStatus(adminPassword, user.username, !user.disabled);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setToggling(null);
    }
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
      {!loading && users.length === 0 && <p style={{ color: "#64748b" }}>No participants have signed up yet.</p>}
      {users.map((u) => (
        <div key={u.username} style={{ ...readonlyBoxStyle, textAlign: "left" }}>
          <strong>{u.username}</strong> — <span style={{ color: "#1d4ed8" }}>{u.role}</span>
          <br />
          <small style={{ color: "#64748b" }}>{u.city}</small>
          <br />
          <small style={{ color: "#94a3b8" }}>{u.walletAddress}</small>
          <br />
          <span style={{ color: u.disabled ? "#b45309" : "#15803d", fontSize: "13px" }}>
            {u.disabled
              ? u.disabledReason === "admin"
                ? "● Disabled by admin"
                : `● Disabled (locked) — re-enables ${new Date(u.disabledUntil).toLocaleString("en-GB", {
                    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                  })}`
              : "● Active"}
          </span>
          <button
            style={{
              ...buttonStyle,
              marginTop: "8px",
              backgroundColor: u.disabled ? "#16a34a" : "#dc2626",
            }}
            onClick={() => handleToggle(u)}
            disabled={toggling === u.username}
          >
            {toggling === u.username ? "Updating..." : u.disabled ? "Enable Account" : "Disable Account"}
          </button>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// NEW: AdminBatchesPanel — every batch ever registered, grouped by
// which Manufacturer registered it, with registration date and full
// batch details. Reads straight from the chain (BatchRegistered events
// + getBatch per id) via the read-only provider — no MetaMask needed,
// same as the consumer verify flow, since this is just reading public
// data.
// ============================================================
function AdminBatchesPanel() {
  const [batches, setBatches] = useState([]); // flat list, every manufacturer
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState("time");
  const [selectedBatch, setSelectedBatch] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const contract = getReadOnlyContract();
        const provider = getProvider();

        const registeredLogs = await contract.queryFilter(contract.filters.BatchRegistered(), 0, "latest");
        const lastActions = await loadLastActionMap(contract);

        const rows = await Promise.all(
          registeredLogs.map(async (log) => {
            const id = log.args.id;
            const [batch, block] = await Promise.all([
              contract.getBatch(id),
              provider.getBlock(log.blockNumber),
            ]);
            const ratingCount = Number(batch.ratingCount);
            const ratingSum = Number(batch.ratingSum);
            return {
              lastAction: lastActions[id.toString()],
              id: id.toString(),
              batchCode: batch.batchCode,
              productName: batch.productName,
              quantity: Number(batch.quantity),
              manufacturer: log.args.owner,
              currentOwner: batch.currentOwner,
              manufactureDate: batch.manufactureDate.toString(),
              expiryDate: batch.expiryDate.toString(),
              deliveryStatus: Number(batch.deliveryStatus),
              timestamp: block.timestamp,
              ratingCount,
              avgRating: ratingCount > 0 ? ratingSum / ratingCount : null,
            };
          })
        );

        // Resolve every manufacturer + current-owner address to a name
        // once, instead of once per row.
        const addresses = [...new Set(rows.flatMap((r) => [r.manufacturer, r.currentOwner]))];
        const lookups = await Promise.all(addresses.map(async (addr) => [addr, await getUserByAddress(addr)]));
        const userByAddress = Object.fromEntries(lookups);

        const withNames = rows.map((r) => ({
          ...r,
          manufacturerName: userByAddress[r.manufacturer]?.username || shortenAddressFallback(r.manufacturer),
          currentOwnerName: userByAddress[r.currentOwner]?.username || null,
        }));

        if (!cancelled) setBatches(withNames);
      } catch (err) {
        if (!cancelled) setError(describeError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p>Loading batches from the chain...</p>;
  if (error) return <p style={{ color: "#b91c1c" }}>{error}</p>;

  return (
    <div style={{ textAlign: "left" }}>
      <BatchSortControls sortKey={sortKey} setSortKey={setSortKey} />
      <BatchTable
        rows={sortBatches(batches, sortKey)}
        onViewDetails={setSelectedBatch}
        emptyText="No batches have been registered yet."
      />
      <BatchDetailsModal batch={selectedBatch} onClose={() => setSelectedBatch(null)} />
    </div>
  );
}

// ============================================================
// Owner auth — Sign In / Sign Up
// ============================================================

function OwnerAuth({ onBack, onLoggedIn, onAdminLoggedIn, onForgotPassword }) {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  // NEW: while SignInForm is in its "Connect MetaMask" step, hide the
  // outer Back button and the hero header/footer chrome — Cancel (inside
  // that step) already returns to the plain sign-in form, and that step
  // keeps its own dark, focused layout rather than the light auth card.
  const [inConnectStep, setInConnectStep] = useState(false);

  return (
    <div
      style={
        inConnectStep
          ? { width: "min(900px, 94vw)", position: "relative", left: "50%", transform: "translateX(-50%)" }
          : undefined
      }
    >
      {inConnectStep ? (
        <div style={{ textAlign: "center", marginBottom: "22px" }}>
          <h1 style={{ ...heroTitleStyle, fontSize: "30px", margin: 0 }}>
            <span style={{ color: "#2e1065" }}>Pharmaceutical </span>
            <span style={{ color: "#1d4ed8" }}>Supply Chain Platform</span>
          </h1>
          <p style={{ margin: "6px 0 0", color: "#5b5680", fontSize: "13px", letterSpacing: "0.5px" }}>
            Secure • Transparent • Traceable
          </p>
        </div>
      ) : (
        <div style={heroAuthHeaderStyle}>
          <div style={heroIconCircleStyle}>
            <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M32 4L54 12V28C54 44 44 54 32 60C20 54 10 44 10 28V12L32 4Z" fill="#2563eb" />
              <path d="M32 20V40M22 30H42" stroke="white" strokeWidth="5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{ ...heroTitleStyle, fontSize: "26px" }}>
            <span style={{ color: "#0f172a" }}>Pharmaceutical </span>
            <span style={{ color: "#2563eb" }}>Supply Chain Platform</span>
          </h1>
          <p style={{ ...heroTaglineStyle, fontSize: "13px" }}>
            <span style={heroDashStyle} /> Secure. Transparent. Trusted. <span style={heroDashStyle} />
          </p>
        </div>
      )}

      <div style={inConnectStep ? undefined : heroFloatingLightCardStyle}>
        {mode === "signin" ? (
          <SignInForm
            onLoggedIn={onLoggedIn}
            onAdminLoggedIn={onAdminLoggedIn}
            onConnectStepChange={setInConnectStep}
            onForgotPassword={onForgotPassword}
            onSwitchToSignUp={() => setMode("signup")}
          />
        ) : (
          <SignUpForm onSignedUp={() => setMode("signin")} onSwitchToSignIn={() => setMode("signin")} />
        )}

        {!inConnectStep && (
          <button style={heroLightBackButtonStyle} onClick={onBack}>
            ← Back
          </button>
        )}
      </div>

      {!inConnectStep && <TrustFooter />}
    </div>
  );
}

function SignInForm({ onLoggedIn, onAdminLoggedIn, onConnectStepChange, onForgotPassword, onSwitchToSignUp }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [role, setRole] = useState(""); // chosen on the Partner Login form
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  // NEW: after a successful username/password check, we don't silently
  // try MetaMask in the background anymore — we show an explicit
  // "Connect to MetaMask" / "Cancel" step instead, and only touch
  // MetaMask once the user clicks Connect.
  const [pendingLogin, setPendingLogin] = useState(null); // { username, password, walletAddress, ...data }
  const [connecting, setConnecting] = useState(false);

  // Shown if MetaMask connects but to a DIFFERENT account than the one
  // that was imported at signup — offers a way to re-fetch the private
  // key for import (requires the password again).
  const [needsImport, setNeedsImport] = useState(null); // { username, password }
  const [reimportInfo, setReimportInfo] = useState(null); // { walletAddress, privateKey }

  const submit = async () => {
    if (!username.trim() || !password) {
      setMessage({ type: "error", text: "Enter both username and password." });
      return;
    }
    if (!role) {
      setMessage({ type: "error", text: "Select your role." });
      return;
    }
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      if (role === "Admin") {
        // Admin is not a registered/wallet account: it signs in with the
        // fixed username "admin" + the admin password and goes straight
        // to the Admin dashboard — no MetaMask connect step.
        await adminLogin(password, username.trim());
        onAdminLoggedIn?.(password);
        return;
      }
      // The server checks the chosen role against the account's
      // registered role too; the check here just gives a quick message.
      const data = await login({ username: username.trim(), password, role });
      if (data.role !== role) {
        setMessage({ type: "error", text: `This account is not registered as ${role}.` });
        return;
      }
      // Password + role checked out — now show the explicit MetaMask
      // connect step rather than jumping straight into extension popups.
      setPendingLogin({ ...data, password });
    } catch (err) {
      // setMessage({ type: "error", text: err.message });
      const errorText = err.message || "Login failed.";
      const message = errorText.includes("registered as")
        ? `This account is not registered as ${role}.`
        : errorText;

      setMessage({ type: "error", text: message });
    } finally {
      setLoading(false);
    }
  };

  // Runs only when the user clicks "Connect to MetaMask" below.
  const handleConnect = async () => {
    if (!pendingLogin) return;
    setMessage({ type: "", text: "" });
    setConnecting(true);
    try {
      if (!isMetaMaskAvailable()) {
        setMessage({ type: "error", text: "MetaMask is not installed. Install it, then import your account." });
        setNeedsImport({ username: pendingLogin.username });
        return;
      }

      const networkOk = await isMetaMaskOnCorrectNetwork();
      if (!networkOk) {
        setMessage({ type: "pending", text: "Switching MetaMask to Localhost 8545..." });
        await switchMetaMaskToLocalNetwork();
      }

      // Force MetaMask's account picker every time, so the user can
      // actually switch accounts here instead of silently getting
      // whatever was last connected (see requestMetaMaskAccountSelection
      // for why a revoke-then-request is needed to guarantee this).
      let connected = await requestMetaMaskAccountSelection();
      if (!connected) {
        // User closed/cancelled the picker (or clicked Cancel inside
        // MetaMask) — per the brief, don't treat that as a hard error.
        // Fall back to whatever account was already connected before,
        // and just check that one instead.
        connected = await getCurrentlyConnectedAccount();
      }
      if (!connected) {
        setMessage({ type: "error", text: "MetaMask isn't connected to this site. Click Connect to try again." });
        return;
      }

      if (connected.toLowerCase() !== pendingLogin.walletAddress.toLowerCase()) {
        setMessage({
          type: "error",
          text: "That's a different account than the one imported at signup. Import the correct account below, then click Connect again.",
        });
        setNeedsImport({ username: pendingLogin.username });
        return;
      }

      onLoggedIn(pendingLogin);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Could not connect to MetaMask." });
    } finally {
      setConnecting(false);
    }
  };

  const handleCancel = () => {
    setPendingLogin(null);
    setNeedsImport(null);
    setReimportInfo(null);
    setReimportPassword("");
    setMessage({ type: "", text: "" });
  };

  const [reimportPassword, setReimportPassword] = useState("");

  // NEW: tell OwnerAuth whether we're in the "Connect MetaMask" step, so
  // it can hide the Sign In/Sign Up tabs and its own Back button (Cancel
  // below already handles leaving this step cleanly).
  useEffect(() => {
    onConnectStepChange?.(!!pendingLogin);
  }, [pendingLogin, onConnectStepChange]);

  const handleReimport = async () => {
    if (!needsImport || !reimportPassword) return;
    setMessage({ type: "", text: "" });
    try {
      const result = await revealPrivateKey(needsImport.username, reimportPassword);
      setReimportInfo(result);
      setReimportPassword("");
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  // ===== Step 2: explicit MetaMask connect prompt =====
  // UI only lives in MetaMaskConnectCard now; every handler/state below
  // (handleConnect, handleCancel, needsImport, handleReimport, ...) is
  // unchanged and simply passed in.
  if (pendingLogin) {
    return (
      <MetaMaskConnectCard
        username={pendingLogin.username}
        walletAddress={pendingLogin.walletAddress}
        connecting={connecting}
        onConnect={handleConnect}
        onCancel={handleCancel}
        showKeyVisible={!needsImport}
        onShowKey={() => setNeedsImport({ username: pendingLogin.username })}
      >
        <MessageBox message={message} />

        {/* Explicit password re-entry, same as signup would require —
            confirms it's really you asking to see the key. */}
        {needsImport && !reimportInfo && (
          <div style={{ marginTop: "14px", textAlign: "left" }}>
            <label style={{ ...labelStyle, color: "#334155", fontWeight: 600 }}>
              Re-enter your password to reveal the private key
            </label>
            <input
              type="password"
              value={reimportPassword}
              onChange={(e) => setReimportPassword(e.target.value)}
              style={inputStyle}
              onKeyDown={(e) => e.key === "Enter" && handleReimport()}
              autoFocus
            />
            <button style={buttonStyle} onClick={handleReimport} disabled={!reimportPassword}>
              Confirm - Reveal Private Key
            </button>
          </div>
        )}

        {reimportInfo && (
          <ImportWalletModal
            walletAddress={reimportInfo.walletAddress}
            privateKey={reimportInfo.privateKey}
            username={needsImport?.username}
            onDone={() => {
              setReimportInfo(null);
              setNeedsImport(null);
              setMessage({ type: "success", text: "Imported. Click Connect to MetaMask again." });
            }}
          />
        )}
      </MetaMaskConnectCard>
    );
  }

  // ===== Step 1: plain username/password form =====
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "18px", textAlign: "left" }}>
        <span style={partnerAvatarStyle}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="#3b2fe0">
            <circle cx="12" cy="8" r="4.2" />
            <path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7H4Z" />
          </svg>
        </span>
        <div>
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: "26px" }}>Partner Login</h2>
          <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "14px" }}>Access your role-based dashboard</p>
        </div>
      </div>

      <label style={heroFieldLabelStyle}>Username</label>
      <IconInput
        icon={<PersonFieldIcon />}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter your username"
      />

      <label style={heroFieldLabelStyle}>Password</label>
      <IconInput
        icon={<LockFieldIcon />}
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        onKeyDown={(e) => e.key === "Enter" && submit()}
        rightToggle={{ open: showPassword, onClick: () => setShowPassword((v) => !v) }}
      />

      <label style={heroFieldLabelStyle}>Role</label>
      <RoleSelect value={role} onChange={setRole} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 0 16px" }}>
        <label style={heroCheckboxRowStyle}>
          <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
          Remember me
        </label>
        {role !== "Admin" && (
          <button type="button" style={heroBlueLinkStyle} onClick={() => onForgotPassword?.()}>
            Forgot password?
          </button>
        )}
      </div>

      <button style={heroBlueButtonStyle} onClick={submit} disabled={loading}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 17l5-5-5-5M15 12H3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {loading ? "Signing in..." : "Sign In"}
      </button>

      <MessageBox message={message} />

      {role !== "Admin" && (
        <p style={heroSwitchModeRowStyle}>
          Don't have an account?{" "}
          <button type="button" style={heroBlueLinkStyle} onClick={() => onSwitchToSignUp?.()}>
            Register
          </button>
        </p>
      )}
    </div>
  );
}

// ============================================================
// RoleSelect — the dropdown on the Partner Login form (Manufacturer /
// Transporter / Distributor / Pharmacy / Admin), each option with a
// small icon like the reference design. Admin appears here for sign-in
// only; it is deliberately NOT offered on the Register form.
// ============================================================
const ROLE_OPTIONS = [
  { value: "Manufacturer", glyph: "M4 20V9l5 3V9l5 3V6h6v14H4Z" },
  { value: "Transporter", glyph: "M2 7h11v9H2zM13 10h4l4 3v3h-8" },
  { value: "Distributor", glyph: "M12 3 3 8v8l9 5 9-5V8l-9-5Zm0 0v18M3 8l9 5 9-5" },
  { value: "Pharmacy", glyph: "M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7V3Z" },
  { value: "Admin", glyph: "" },
];

function RoleGlyph({ value }) {
  const opt = ROLE_OPTIONS.find((o) => o.value === value);
  return (
    <span style={roleGlyphBoxStyle}>
      {value === "Admin" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b2fe0">
          <circle cx="12" cy="8" r="4.2" />
          <path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7H4Z" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b2fe0" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
          <path d={opt?.glyph} />
        </svg>
      )}
    </span>
  );
}

function RoleSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", marginBottom: "6px" }}>
      <button
        type="button"
        style={roleSelectButtonStyle}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value ? (
          <span style={{ display: "flex", alignItems: "center", gap: "10px", color: "#0f172a" }}>
            <RoleGlyph value={value} />
            {value}
          </span>
        ) : (
          <span style={{ color: "#0f172a" }}>Select your role</span>
        )}
        <span style={{ color: "#475569", transform: open ? "rotate(180deg)" : "none" }}>⌄</span>
      </button>
      {open && (
        <ul role="listbox" style={roleListStyle}>
          {ROLE_OPTIONS.map((o) => (
            <li key={o.value} role="option" aria-selected={value === o.value}>
              <button
                type="button"
                style={{ ...roleOptionStyle, backgroundColor: value === o.value ? "#f1efff" : "#fff" }}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <RoleGlyph value={o.value} />
                {o.value}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SignUpForm({ onSignedUp, onSwitchToSignIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState("");
  const [city, setCity] = useState("");
  const [sport, setSport] = useState("");
  const [food, setFood] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [importInfo, setImportInfo] = useState(null); // { walletAddress, privateKey } once signed up

  const submit = async () => {
    setMessage({ type: "", text: "" });

    if (!username.trim() || !password || !role || !city || !sport || !food) {
      setMessage({ type: "error", text: "Please fill in every field, including both security questions." });
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      setMessage({ type: "error", text: PASSWORD_HINT });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    if (!agreedToTerms) {
      setMessage({ type: "error", text: "Please agree to the Terms & Conditions and Privacy Policy." });
      return;
    }

    setLoading(true);
    try {
      setMessage({ type: "pending", text: "Creating your account and funding your wallet..." });
      const result = await signup({
        username: username.trim(),
        password,
        role,
        city,
        sport,
        food,
      });
      // NEW: show the MetaMask import step instead of going straight
      // back to Sign In — the account is useless for transactions until
      // it's imported.
      setImportInfo({ walletAddress: result.walletAddress, privateKey: result.privateKey });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ margin: 0, textAlign: "center", color: "#0f172a" }}>Register</h2>
      <p style={heroAuthSubtitleStyle}>Create your account to get started.</p>

      <label style={heroFieldLabelStyle}>Username</label>
      <IconInput icon={<PersonFieldIcon />} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" />

      <label style={heroFieldLabelStyle}>Password</label>
      <IconInput
        icon={<LockFieldIcon />}
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Create a password"
        rightToggle={{ open: showPassword, onClick: () => setShowPassword((v) => !v) }}
      />
      <p style={{ fontSize: "12px", color: "#64748b", marginTop: "-10px", marginBottom: "12px" }}>{PASSWORD_HINT}</p>

      <label style={heroFieldLabelStyle}>Confirm Password</label>
      <IconInput
        icon={<LockFieldIcon />}
        type={showConfirmPassword ? "text" : "password"}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm your password"
        rightToggle={{ open: showConfirmPassword, onClick: () => setShowConfirmPassword((v) => !v) }}
      />

      <label style={heroFieldLabelStyle}>Role</label>
      <select value={role} onChange={(e) => setRole(e.target.value)} style={heroSelectStyle}>
        <option value="">-- Select Role --</option>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <label style={heroFieldLabelStyle}>City</label>
      <select value={city} onChange={(e) => setCity(e.target.value)} style={heroSelectStyle}>
        <option value="">-- Select City --</option>
        {INDIAN_CITIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {/* NEW: two security questions, used later by Forgot Password
          instead of asking for an email you may not have registered. */}
      <label style={heroFieldLabelStyle}>Favourite Sport (used for password recovery)</label>
      <select value={sport} onChange={(e) => setSport(e.target.value)} style={heroSelectStyle}>
        <option value="">-- Select Sport --</option>
        {SPORTS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <label style={heroFieldLabelStyle}>Favourite Food (used for password recovery)</label>
      <select value={food} onChange={(e) => setFood(e.target.value)} style={heroSelectStyle}>
        <option value="">-- Select Food --</option>
        {INDIAN_FOODS.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      <p style={{ fontSize: "12px", color: "#64748b", marginTop: "-8px", marginBottom: "14px" }}>
        Remember these two - you'll be asked to pick them again (not shown to you) if you ever need to
        reset your password.
      </p>

      {/* Ticking the box opens the Terms & Conditions modal; it only
          becomes ticked by agreeing there. Unticking is always allowed. */}
      <label style={{ ...heroCheckboxRowStyle, marginBottom: "16px" }}>
        <input
          type="checkbox"
          checked={agreedToTerms}
          onChange={() => (agreedToTerms ? setAgreedToTerms(false) : setShowTerms(true))}
        />
        <span>
          I agree to the{" "}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setShowTerms(true);
            }}
            style={{ background: "none", border: "none", padding: 0, color: "#2563eb", fontWeight: "600", textDecoration: "underline", cursor: "pointer", fontSize: "inherit" }}
          >
            Terms &amp; Conditions
          </button>
        </span>
      </label>
      {showTerms && (
        <TermsAndConditionsModal
          context="registration"
          onCancel={() => setShowTerms(false)}
          onAgree={() => {
            setAgreedToTerms(true);
            setShowTerms(false);
          }}
        />
      )}

      <button
        style={{ ...heroBlueButtonStyle, ...(agreedToTerms ? null : { opacity: 0.55, cursor: "not-allowed" }) }}
        onClick={submit}
        disabled={loading || !agreedToTerms}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="8" r="4" stroke="white" strokeWidth="2" />
          <path d="M2 20c0-4.4 3.1-8 7-8s7 3.6 7 8" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <path d="M19 8v6M16 11h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {loading ? "Creating account..." : "Create Account"}
      </button>
      <MessageBox message={message} />

      <p style={heroSwitchModeRowStyle}>
        Already have an account?{" "}
        <button type="button" style={heroBlueLinkStyle} onClick={() => onSwitchToSignIn?.()}>
          Sign in
        </button>
      </p>

      {importInfo && (
        <ImportWalletModal
          walletAddress={importInfo.walletAddress}
          privateKey={importInfo.privateKey}
          username={username.trim()}
          onDone={() => {
            setImportInfo(null);
            setMessage({ type: "success", text: "Account created and imported. You can now sign in." });
            onSignedUp();
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// ForgotPasswordFlow — username -> re-pick security answers (never
// pre-filled) -> if correct, set a new password. 5 wrong attempts locks
// the account for 24 hours (enforced server-side; this UI just surfaces
// the resulting messages).
// ============================================================
function ForgotPasswordFlow({ onBack }) {
  const [step, setStep] = useState("answer"); // "answer" | "reset" | "done"
  const [username, setUsername] = useState("");
  const [sport, setSport] = useState("");
  const [food, setFood] = useState("");
  const [resetToken, setResetToken] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const submitAnswers = async () => {
    setMessage({ type: "", text: "" });
    if (!username.trim() || !sport || !food) {
      setMessage({ type: "error", text: "Please fill in your username and both security answers." });
      return;
    }
    setLoading(true);
    try {
      const result = await verifyForgotPasswordAnswers(username.trim(), sport, food);
      if (result.valid) {
        setResetToken(result.resetToken);
        setStep("reset");
        setMessage({ type: "success", text: "Verified. Choose a new password below." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async () => {
    setMessage({ type: "", text: "" });
    if (!PASSWORD_REGEX.test(newPassword)) {
      setMessage({ type: "error", text: PASSWORD_HINT });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    setLoading(true);
    try {
      await resetPasswordWithToken(username.trim(), resetToken, newPassword);
      setStep("done");
      setMessage({ type: "success", text: "Password reset. You can sign in with your new password now." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={heroFloatingDarkCardStyle}>
      <h2>Forgot Password</h2>

      {step === "answer" && (
        <>
          <label style={labelStyle}>Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} />

          <label style={labelStyle}>Favourite Sport</label>
          <select value={sport} onChange={(e) => setSport(e.target.value)} style={inputStyle}>
            <option value="">-- Select Sport --</option>
            {SPORTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <label style={labelStyle}>Favourite Food</label>
          <select value={food} onChange={(e) => setFood(e.target.value)} style={inputStyle}>
            <option value="">-- Select Food --</option>
            {INDIAN_FOODS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <button style={buttonStyle} onClick={submitAnswers} disabled={loading}>
            {loading ? "Checking..." : "Verify Answers"}
          </button>
        </>
      )}

      {step === "reset" && (
        <>
          <label style={labelStyle}>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={inputStyle}
          />
          <p style={{ fontSize: "12px", color: "#888", marginTop: "-8px", marginBottom: "12px" }}>{PASSWORD_HINT}</p>

          <label style={labelStyle}>Confirm New Password</label>
          <input
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            style={inputStyle}
          />

          <button style={buttonStyle} onClick={submitNewPassword} disabled={loading}>
            {loading ? "Saving..." : "Set New Password"}
          </button>
        </>
      )}

      {step === "done" && (
        <button style={buttonStyle} onClick={onBack}>
          Go to Sign In
        </button>
      )}

      <MessageBox message={message} />

      {step !== "done" && (
        <button style={{ ...buttonStyle, backgroundColor: "#333", marginTop: "12px" }} onClick={onBack}>
          Back
        </button>
      )}
    </div>
  );
}

// ============================================================
// NEW: RegisteredBatchesPanel — the manufacturer's own separate
// "Registered Batches" sidebar page, with sort controls (time /
// quantity / highest product rating / lowest product rating). Rendered
// as checkbox-styled toggles per the brief; only one is ever active at
// a time (checking one clears the others), functioning as a single
// sort choice rather than a compound multi-key sort.
// ============================================================
const SORT_OPTIONS = [
  { key: "time", label: "Time (newest first)" },
  { key: "quantity", label: "Quantity (highest first)" },
  { key: "ratingHigh", label: "Highest Rating" },
  { key: "ratingLow", label: "Lowest Rating" },
];

// NEW: works out the "Last Action" shown in the batch tables — the most
// recent on-chain event for each batch, in plain words (like the
// reference design's "Shipped From Manufacturer" / "Received By ...").
// One pass over the four event types for ALL batches, so the tables don't
// make a request per row.
async function loadLastActionMap(contract) {
  const [reg, xfer, deliv, rate] = await Promise.all([
    contract.queryFilter(contract.filters.BatchRegistered(), 0, "latest"),
    contract.queryFilter(contract.filters.OwnershipTransferred(), 0, "latest"),
    contract.queryFilter(contract.filters.DeliveryStatusUpdated(), 0, "latest"),
    contract.queryFilter(contract.filters.RatingSubmitted(), 0, "latest"),
  ]);
  const latest = new Map(); // id -> log
  for (const log of [...reg, ...xfer, ...deliv, ...rate]) {
    const id = log.args.id.toString();
    const prev = latest.get(id);
    if (!prev || log.blockNumber > prev.blockNumber || (log.blockNumber === prev.blockNumber && log.index > prev.index)) {
      latest.set(id, log);
    }
  }
  const roleCache = new Map();
  const roleOf = async (addr) => {
    if (!roleCache.has(addr)) roleCache.set(addr, (await getUserByAddress(addr))?.role || null);
    return roleCache.get(addr);
  };
  const out = {};
  for (const [id, log] of latest) {
    switch (log.eventName) {
      case "BatchRegistered":
        out[id] = "Registered by Manufacturer";
        break;
      case "OwnershipTransferred": {
        const [fromRole, toRole] = await Promise.all([roleOf(log.args.from), roleOf(log.args.to)]);
        out[id] = `${fromRole ? "Shipped from " + fromRole : "Shipped"} → ${toRole ? "Received by " + toRole : "Received"}`;
        break;
      }
      case "DeliveryStatusUpdated":
        out[id] = Number(log.args.status) === 1 ? "Delivered by Pharmacy" : "Marked Not Delivered";
        break;
      case "RatingSubmitted":
        out[id] = `Rated by Consumer (${Number(log.args.rating)}★)`;
        break;
      default:
        out[id] = "—";
    }
  }
  return out;
}

// Shared sort comparator — used by both RegisteredBatchesPanel (a
// Manufacturer's own batches) and AdminBatchesPanel (every batch, every
// manufacturer), so the two sort identically.
function sortBatches(batches, sortKey) {
  return [...batches].sort((a, b) => {
    switch (sortKey) {
      case "quantity":
        return b.quantity - a.quantity;
      case "ratingHigh":
        return (b.avgRating ?? -1) - (a.avgRating ?? -1);
      case "ratingLow":
        return (a.avgRating ?? 6) - (b.avgRating ?? 6);
      case "time":
      default:
        return b.timestamp - a.timestamp;
    }
  });
}

// NEW: the four sort checkboxes, shared between RegisteredBatchesPanel
// and AdminBatchesPanel.
function BatchSortControls({ sortKey, setSortKey }) {
  return (
    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "16px", textAlign: "left" }}>
      {SORT_OPTIONS.map((opt) => (
        <label
          key={opt.key}
          style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#334155", cursor: "pointer" }}
        >
          <input type="checkbox" checked={sortKey === opt.key} onChange={() => setSortKey(opt.key)} />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

// NEW: the purple-header table shared by RegisteredBatchesPanel and
// AdminBatchesPanel — Manufacturer | Manufacture Date | Batch Name &
// ID | Details | Expiry Date, per the brief. Each row's Details button
// opens BatchDetailsModal with the batch's full info.
function BatchTable({ rows, onViewDetails, emptyText }) {
  if (rows.length === 0) {
    return <p style={{ color: "#64748b" }}>{emptyText}</p>;
  }
  return (
    <div style={tableWrapStyle}>
      <table style={tableStyle}>
        <thead>
          <tr style={tableHeadRowStyle}>
            <th style={tableHeadCellStyle}>Manufacturer</th>
            <th style={tableHeadCellStyle}>Manufacture Date</th>
            <th style={tableHeadCellStyle}>Product Code</th>
            <th style={tableHeadCellStyle}>Expiry Date</th>
            <th style={tableHeadCellStyle}>Last Action</th>
            <th style={tableHeadCellStyle}>Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b, i) => (
            <tr key={b.id} style={i % 2 === 1 ? tableRowEvenStyle : undefined}>
              <td style={tableCellStyle}>{b.manufacturerName}</td>
              <td style={tableCellStyle}>{formatDateOnly(b.manufactureDate)}</td>
              <td style={tableCellStyle}>
                <strong>{b.batchCode}</strong>
              </td>
              <td style={tableCellStyle}>{formatDateOnly(b.expiryDate)}</td>
              <td style={tableCellStyle}>{b.lastAction || "—"}</td>
              <td style={tableCellStyle}>
                <button style={detailsButtonStyle} onClick={() => onViewDetails(b)}>
                  Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// NEW: the "Details" popup — a white card with a purple heading and
// label/value rows, matching the reference design (adapted to this
// project's actual batch fields rather than the mockup's unrelated
// ones like SKU/longitude/latitude, which don't exist in this contract).
function BatchDetailsModal({ batch, onClose }) {
  if (!batch) return null;
  const rows = [
    ["Product Code", batch.batchCode],
    ["Product Name", batch.productName],
    ["Quantity", batch.quantity],
    ["Manufacturer", batch.manufacturerName],
    ["Manufacturer Address", batch.manufacturer],
    ["Manufacture Date", formatDateOnly(batch.manufactureDate)],
    ["Expiry Date", formatDateOnly(batch.expiryDate)],
    ["Delivery Status", DELIVERY_STATUS_LABELS[batch.deliveryStatus]],
    ["Last Action", batch.lastAction || "—"],
    ["Current Owner", batch.currentOwnerName || shortenAddressFallback(batch.currentOwner)],
    ["Rating", batch.avgRating !== null ? `${batch.avgRating.toFixed(1)} / 5 (${batch.ratingCount})` : "No ratings yet"],
  ];
  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ textAlign: "center", color: "#1d4ed8", margin: "0 0 20px 0" }}>Details</h2>
        {rows.map(([label, value]) => (
          <div key={label} style={detailsRowStyle}>
            <strong style={{ color: "#1d4ed8" }}>{label}:</strong>
            <span style={{ color: "#1e293b", textAlign: "right", wordBreak: "break-word" }}>{value}</span>
          </div>
        ))}
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <ViewQRButton batchCode={batch.batchCode} label="QR CODE" style={{ flex: 1, padding: "12px", fontSize: "15px" }} />
          <button style={{ ...buttonStyle, flex: 1 }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const pageStyle = { padding: "40px", maxWidth: "700px", margin: "auto", fontFamily: "Arial" };
const titleStyle = { fontSize: "32px", marginBottom: "30px", color: "#1d4ed8" };

// ============================================================
// NEW: "Hero" styles — the light, full-bleed background + gradient
// header + white role-picker card used by Landing, and the background
// (only) reused behind the Admin pages. See HeroBackdrop and Landing
// above.
// ============================================================
const heroBackdropStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: -1,
  background: "linear-gradient(135deg, #eef2ff 0%, #f8fafc 45%, #eff6ff 100%)",
  overflow: "hidden",
};
const heroBlobTopLeftStyle = {
  position: "absolute",
  top: "-120px",
  left: "-120px",
  width: "340px",
  height: "340px",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(59,130,246,0.16), transparent 70%)",
};
const heroBlobBottomRightStyle = {
  position: "absolute",
  bottom: "-140px",
  right: "-140px",
  width: "400px",
  height: "400px",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(124,58,237,0.13), transparent 70%)",
};
const heroHexSvgStyle = {
  position: "fixed",
  top: "36px",
  right: "48px",
  width: "190px",
  height: "190px",
  overflow: "visible",
};
const heroVialCornerStyle = {
  position: "fixed",
  bottom: "-10px",
  left: "-10px",
  width: "220px",
  height: "260px",
  pointerEvents: "none",
};
const heroClipboardCornerStyle = {
  position: "fixed",
  bottom: "-10px",
  right: "-10px",
  width: "200px",
  height: "220px",
  pointerEvents: "none",
};
// A card that stays solidly dark regardless of what's behind it — used
// by AdminLogin/AdminDashboard so the new light HeroBackdrop only
// changes the page background around them, not their (unchanged)
// internal dark theme, text colors, or contrast.
const heroFloatingDarkCardStyle = {
  ...cardStyle,
  backgroundColor: "#161616",
  boxShadow: "0 20px 50px rgba(15,23,42,0.25)",
};
// A white card for pages that should look like the reference mockup
// (ConsumerVerify) rather than keep the app's dark theme — same idea as
// heroFloatingDarkCardStyle above, just the light variant.
const heroFloatingLightCardStyle = {
  ...cardStyle,
  backgroundColor: "#ffffff",
  color: "#0f172a",
  border: "1px solid #eef2f7",
  boxShadow: "0 20px 50px rgba(15,23,42,0.12)",
};
const heroIconCircleStyle = {
  width: "72px",
  height: "72px",
  borderRadius: "50%",
  backgroundColor: "#eef2ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 14px",
  boxShadow: "0 8px 20px rgba(29,78,216,0.15)",
};
const heroTitleStyle = { fontSize: "32px", fontWeight: "800", margin: "0 0 10px 0" };
const heroTaglineStyle = {
  color: "#64748b",
  fontSize: "15px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  margin: 0,
};
const heroDashStyle = { display: "inline-block", width: "28px", height: "1px", backgroundColor: "#cbd5e1" };
const heroButtonStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  color: "white",
  fontSize: "15px",
  fontWeight: "600",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
};
const heroFooterRowStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "28px",
  flexWrap: "wrap",
  marginTop: "22px",
  color: "#64748b",
  fontSize: "13px",
};
const heroFooterItemStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
};
// ============================================================
// NEW: Sign In / Register redesign — icon-prefixed inputs, checkbox
// rows, and the blue button/link styles used to match the reference
// mockup.
// ============================================================
const heroAuthHeaderStyle = { textAlign: "center", marginBottom: "18px" };
const heroAuthSubtitleStyle = { color: "#2563eb", fontSize: "13px", margin: "4px 0 22px", textAlign: "center" };
const heroFieldLabelStyle = { display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#0f172a", textAlign: "left" };
const heroInputWrapperStyle = { position: "relative", marginBottom: "15px" };
const heroInputIconStyle = {
  position: "absolute",
  left: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  display: "flex",
  pointerEvents: "none",
};
const heroInputRightToggleStyle = {
  position: "absolute",
  right: "10px",
  top: "50%",
  transform: "translateY(-50%)",
  display: "flex",
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
};
const heroCheckboxRowStyle = { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#334155" };
const heroBlueButtonStyle = {
  ...heroButtonStyle,
  backgroundColor: "#2563eb",
  marginBottom: "6px",
};
const heroSwitchModeRowStyle = { textAlign: "center", fontSize: "13px", color: "#64748b", margin: "14px 0" };
const heroBlueLinkStyle = { color: "#2563eb", fontWeight: "600", background: "none", border: "none", cursor: "pointer", fontSize: "13px", padding: 0, textDecoration: "none" };
const heroLightBackButtonStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  backgroundColor: "#ffffff",
  color: "#0f172a",
  fontSize: "15px",
  fontWeight: "600",
  cursor: "pointer",
  marginTop: "6px",
};

const heroSelectStyle = { ...inputStyle, textAlign: "left" };
const tabButtonStyle = { ...buttonStyle, backgroundColor: "#e2e8f0", color: "#334155", flex: 1 };
const tabActiveStyle = { backgroundColor: "#1d4ed8", color: "#ffffff" };



// NEW: purple-header table used for Registered Batches (and reusable
// anywhere else a tabular batch list fits better than stacked cards).
const tableWrapStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  overflow: "hidden",
  backgroundColor: "#ffffff",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
};
const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: "14px" };
const tableHeadRowStyle = { backgroundColor: "#1d4ed8", color: "#ffffff" };
const tableHeadCellStyle = { padding: "12px 14px", textAlign: "left", fontWeight: 700, whiteSpace: "nowrap" };
const tableCellStyle = { padding: "12px 14px", textAlign: "left", color: "#1e293b", verticalAlign: "top" };
const tableRowEvenStyle = { backgroundColor: "#f8fafc" };
const detailsButtonStyle = {
  padding: "7px 14px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: "#0f172a",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
// NEW: modal overlay + panel for the "Details" popup (matches the
// reference design's white card with purple heading + label/value rows).
const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15, 23, 42, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "20px",
};
const modalCardStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "14px",
  padding: "28px 30px",
  width: "min(520px, 100%)",
  maxHeight: "85vh",
  overflowY: "auto",
  boxShadow: "0 20px 60px rgba(15, 23, 42, 0.3)",
};
const detailsRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  padding: "10px 0",
  borderBottom: "1px solid #e2e8f0",
  fontSize: "14px",
};

const partnerAvatarStyle = {
  width: "56px",
  height: "56px",
  borderRadius: "14px",
  backgroundColor: "#eceafd",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
const roleGlyphBoxStyle = {
  width: "26px",
  height: "26px",
  borderRadius: "7px",
  backgroundColor: "#eceafd",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
const roleSelectButtonStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #d9d6f5",
  backgroundColor: "#fff",
  fontSize: "15px",
  fontWeight: 500,
  cursor: "pointer",
  textAlign: "left",
};
const roleListStyle = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  zIndex: 20,
  margin: 0,
  padding: "4px",
  listStyle: "none",
  backgroundColor: "#fff",
  border: "1px solid #d9d6f5",
  borderRadius: "10px",
  boxShadow: "0 12px 28px rgba(59, 47, 224, 0.15)",
};
const roleOptionStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "9px 10px",
  border: "none",
  borderRadius: "8px",
  fontSize: "15px",
  color: "#0f172a",
  cursor: "pointer",
  textAlign: "left",
};
