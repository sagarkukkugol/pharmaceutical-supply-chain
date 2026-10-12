// Small formatting + error helpers shared by App.jsx and the dashboard.
// (Moved out of App.jsx unchanged so new files can import them without
// a circular dependency on App.jsx.)

export const DELIVERY_STATUS_LABELS = ["Pending", "Delivered", "Not Delivered"];

// Enforces the real supply-chain order in the UI, matching SupplyChain.sol
// (Manufacturer -> Transporter -> Distributor -> Pharmacy).
export const NEXT_ROLE = {
  Manufacturer: "Transporter",
  Transporter: "Distributor",
  Distributor: "Pharmacy",
};

export function formatBlockchainTime(unixSeconds) {
  if (!unixSeconds) return "—";
  const d = new Date(Number(unixSeconds) * 1000);
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

export function describeError(err) {
  const raw = (
    err?.reason ||
    err?.shortMessage ||
    err?.info?.error?.message ||
    err?.message ||
    ""
  ).toLowerCase();
  if (raw.includes("user rejected") || err?.code === 4001 || err?.code === "ACTION_REJECTED") {
    return "Transaction cancelled in MetaMask.";
  }
  if (raw.includes("metamask is not installed")) return err.message;
  if (raw.includes("only the current owner")) return "Only the current owner can transfer this batch.";
  if (raw.includes("only a manufacturer")) return "Only a Manufacturer can register a batch.";
  if (raw.includes("can only transfer to a transporter")) return "A Manufacturer can only transfer ownership to a Transporter.";
  if (raw.includes("can only transfer to a distributor")) return "A Transporter can only transfer ownership to a Distributor.";
  if (raw.includes("can only transfer to a pharmacy")) return "A Distributor can only transfer ownership to a Pharmacy.";
  if (raw.includes("not permitted to transfer")) return "This role is not permitted to transfer ownership. Use Mark Delivered instead.";
  if (raw.includes("only a pharmacy can update delivery")) return "Only a Pharmacy can update delivery status.";
  if (raw.includes("expiry date must be after")) return "Expiry date must be after the manufacture date.";
  if (raw.includes("batch code already exists")) return "That Batch ID was just taken by another registration. Please try again to get the next free Batch ID.";
  if (raw.includes("batch code cannot be empty")) return "Batch code cannot be empty.";
  if (raw.includes("batch does not exist")) return "That batch code / ID does not exist.";
  if (raw.includes("rating must be between")) return "Rating must be a whole number from 1 to 5.";
  if (raw.includes("insufficient funds")) return 'Insufficient local ETH for gas. Use "Add 10 Test ETH" in your profile menu.';
  if (raw.includes("invalid new owner")) return "Invalid recipient wallet address.";
  if (raw.includes("cannot reach")) return err.message;
  return err?.reason || err?.shortMessage || err?.message || "Something went wrong.";
}

// Convert an <input type="date"> value ("YYYY-MM-DD") to a Unix
// timestamp (seconds), the same representation the contract stores.
export function dateStringToUnix(dateStr) {
  if (!dateStr) return 0;
  return Math.floor(new Date(dateStr + "T00:00:00").getTime() / 1000);
}

export function formatDateOnly(unixSeconds) {
  if (!unixSeconds || Number(unixSeconds) === 0) return "—";
  const d = new Date(Number(unixSeconds) * 1000);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function shortenAddressFallback(address) {
  if (!address || address.length < 10) return address || "—";
  return `${address.slice(0, 10)}...${address.slice(-6)}`;
}

// "Batch ID" shown in the UI: BCH + the on-chain numeric id, e.g. BCH005.
// It is derived from the real on-chain id, never stored separately.
export function batchDisplayId(id) {
  const n = Number(id);
  return `BCH${String(Number.isFinite(n) ? n : 0).padStart(3, "0")}`;
}

// Generated Batch ID shown in the UI:
//   first 3 letters of manufacturer name
// + first 2 letters of product code
// + registration day (DD) + month (MM) + last two digits of year (YY)
// e.g. manufacturer "Cipla", product code "dolo_450", registered 10 Oct 2026
//      -> "cipdo101026".
// Derived from the on-chain registration timestamp (Asia/Kolkata), so every
// screen shows the same value and nothing extra is stored on-chain.
const BATCH_ID_TZ = "Asia/Kolkata";
export function makeBatchId(manufacturerName, productCode, registeredUnix) {
  const letters = (s, n) =>
    String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, n);
  const ts = registeredUnix ? new Date(Number(registeredUnix) * 1000) : new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BATCH_ID_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).formatToParts(ts);
  const get = (t) => parts.find((p) => p.type === t)?.value || "";
  return `${letters(manufacturerName, 3)}${letters(productCode, 2)}${get("day")}${get("month")}${get("year")}`;
}

// ------------------------------------------------------------
// Batch ID  (MMM-PP-DDMMYYYY-XX)   e.g. LUP-HY-12102026-01
// ------------------------------------------------------------
// MMM = first 3 letters of the manufacturer name, PP = first 2 letters of
// the Product Code, DDMMYYYY = manufacture date, XX = running number.
// For NEW batches this value is stored on-chain in the contract's existing
// unique `batchCode` field (that is what makes it impossible to duplicate),
// while the Product Code is kept separately (see server.js /batch-meta).
// Batches registered before this system keep using the Product Code in
// that field and are recognised by NOT matching this pattern.
const BATCH_ID_RE = /^[A-Z0-9]{1,3}-[A-Z0-9]{1,2}-\d{8}-\d{2,}$/;
export const isBatchIdFormat = (code) => BATCH_ID_RE.test(String(code || "").trim());

const cleanLetters = (s, n) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, n);

// "LUP-HY-12102026-" — everything except the running number. Returns ""
// until the manufacturer, product code and manufacture date are known.
export function batchIdPrefix(manufacturerName, productCode, manufactureDate /* "YYYY-MM-DD" */) {
  const m = cleanLetters(manufacturerName, 3);
  const p = cleanLetters(productCode, 2);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(manufactureDate || "")
    ? `${manufactureDate.slice(8, 10)}${manufactureDate.slice(5, 7)}${manufactureDate.slice(0, 4)}`
    : "";
  if (!m || !p || !d) return "";
  return `${m}-${p}-${d}-`;
}

export const withSequence = (prefix, n) => `${prefix}${String(n).padStart(2, "0")}`;

export function timeAgo(unixSeconds, now = Date.now()) {
  const diff = Math.max(0, Math.floor(now / 1000 - Number(unixSeconds)));
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  if (diff < 86400 * 7) {
    const d = Math.floor(diff / 86400);
    return `${d} day${d === 1 ? "" : "s"} ago`;
  }
  return formatDateOnly(unixSeconds);
}

// Accepts what people actually type or scan: a numeric on-chain id ("5"),
// a display id ("BCH005") or a batch code ("PARACETAMOL-001").
// Returns the numeric id as a string when the input is an id, else null.
export function parseBatchIdInput(input) {
  const t = (input || "").trim();
  if (/^\d+$/.test(t)) return t;
  const m = t.replace(/\s+/g, "").match(/^bch0*(\d+)$/i);
  return m ? m[1] : null;
}
