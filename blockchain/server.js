// blockchain/server.js  (formerly faucet-server.js)
//
// ============================================================
// DEVELOPMENT-ONLY LOCAL BACKEND
// ============================================================
//
// This single Node.js server now does four jobs for your capstone demo:
//
// 1. SIGN UP  — create a participant account (username, password, role,
//    city). Behind the scenes it also generates a brand-new blockchain
//    wallet for that user and funds it with 10 test ETH, so they never
//    have to touch MetaMask or private keys manually.
//
// 2. LOG IN   — verify username + password, then hand back that user's
//    wallet private key so the FRONTEND can sign blockchain transactions
//    as them, for this session only.
//
// 3. USER DIRECTORY — lets the frontend search "who is this username?"
//    (for the Transfer Ownership recipient picker) and "who owns this
//    address?" (to show names instead of raw addresses in Fetch/History).
//
// 4. FAUCET   — unchanged from before: top up a wallet with 10 test ETH
//    when its balance runs low.
//
// ============================================================
// WHY A SERVER HOLDS PRIVATE KEYS AT ALL (READ THIS FOR YOUR VIVA)
// ============================================================
// On a REAL blockchain, a server never holds or transmits a user's
// private key — that key must stay only on the user's own device
// (that's the entire point of a wallet like MetaMask). Doing what this
// server does — generating keys and sending them to the browser on
// login — would be a serious security vulnerability in production.
//
// It is acceptable ONLY here because:
//   - This runs entirely on your own laptop (127.0.0.1), never on the
//     public internet.
//   - The blockchain itself is Hardhat's local throwaway network —
//     the "ETH" involved has no real value and resets every time you
//     restart `npx hardhat node`.
//   - The goal is to demonstrate supply-chain traceability concepts
//     without asking every classmate/examiner to install MetaMask and
//     manually import private keys — a genuine usability problem for a
//     live demo.
//
// A real deployment would instead have each user hold their own wallet
// (MetaMask, a mobile wallet, etc.) and only ever sign transactions
// locally on their device — the server would never see the key.
//
// ============================================================
// WHERE DATA LIVES
// ============================================================
// users.json (same folder) — a simple local JSON "database" of accounts.
// This file is git-ignored (see .gitignore) because it contains private
// keys, even though those keys are worthless outside your local chain.

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const app = express();
app.use(cors());
app.use(express.json());

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const FAUCET_PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY;
const FUNDING_AMOUNT_ETH = process.env.FUNDING_AMOUNT_ETH || "10";
const PORT = process.env.FAUCET_PORT || 4000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const USERS_FILE = path.join(__dirname, "users.json");
// NEW: same pattern as users.json, but for QR-code IPFS records.
const QRCODES_FILE = path.join(__dirname, "qrcodes.json");
// NEW: same pattern again, but for each batch's storage temperature
// range (set by the Manufacturer) and the log of temperature readings
// taken at each ownership transfer. See the big comment block near the
// /temperature routes below for why this lives off-chain.
const TEMPS_FILE = path.join(__dirname, "temperatures.json");
// NEW: local IPFS (Kubo) node config — see the big comment block near
// the /ipfs/upload-qr route below for why this exists and how to run it.
const IPFS_API_URL = process.env.IPFS_API_URL || "http://127.0.0.1:5001";
const IPFS_GATEWAY_URL = process.env.IPFS_GATEWAY_URL || "http://127.0.0.1:8080/ipfs/";

// NEW: the deployed contract address + ABI, so this server can send the
// assignRole() transaction after a signup. Same address the frontend
// uses (frontend/src/contract.js) — if you redeploy, update BOTH places,
// or override with CONTRACT_ADDRESS in .env.
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const contractArtifact = require("../frontend/src/SupplyChain.json");

// CHANGED: "Consumer" and "Wholesaler" are no longer sign-up roles.
// A consumer is just a member of the public checking a tablet — they
// never create an account (see the public /verify-batch-style flow,
// which is entirely on the frontend via the read-only contract, plus
// POST /rate-batch below). "Wholesaler" was replaced with "Transporter",
// which now sits right after the Manufacturer in the chain.
const VALID_ROLES = ["Manufacturer", "Transporter", "Distributor", "Pharmacy"];

// NEW: fixed option lists for the two security questions asked at
// signup and re-asked (not pre-filled) during Forgot Password. Kept as
// a whitelist here (not free text) so answers are unambiguous — no risk
// of "Biryani" vs "biryani " mismatches from typos.
const SPORTS = [
  "Cricket", "Football", "Badminton", "Hockey", "Tennis", "Kabaddi",
  "Chess", "Volleyball", "Basketball", "Table Tennis", "Wrestling", "Athletics",
];
const INDIAN_FOODS = [
  "Biryani", "Dosa", "Butter Chicken", "Paneer Tikka", "Chole Bhature",
  "Idli Sambar", "Rajma Chawal", "Pav Bhaji", "Rogan Josh", "Dhokla",
  "Vada Pav", "Gulab Jamun", "Samosa", "Momos", "Poha",
];

const MAX_RESET_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes to actually set the new password

// Maps a role name to the Solidity Role enum value (see SupplyChain.sol):
// enum Role { None, Manufacturer, Transporter, Distributor, Pharmacy }
const ROLE_ENUM = {
  Manufacturer: 1,
  Transporter: 2,
  Distributor: 3,
  Pharmacy: 4,
};

// ============================================================
// NEW: Human-readable signup guide file.
// ============================================================
// users.json is the real "database" (it holds password hashes and
// private keys, so it's git-ignored). This file is a separate,
// plain-text/Markdown log meant to just be opened in VS Code to see,
// at a glance, who has signed up: name, role, and date — nothing
// sensitive. It's rebuilt/appended every signup.
const ACCOUNTS_GUIDE_FILE = path.join(__dirname, "ACCOUNTS_GUIDE.md");

function appendToAccountsGuide(user) {
  const fileExists = fs.existsSync(ACCOUNTS_GUIDE_FILE);
  if (!fileExists) {
    const header =
      "# Signed-Up Accounts\n\n" +
      "Auto-generated log of every account created through Sign Up. " +
      "Open this file in VS Code to see who has signed up, with what " +
      "role, and when — no passwords or keys are stored here (see " +
      "users.json, which is git-ignored, for that).\n\n" +
      "| Name | Role | Date |\n" +
      "|------|------|------|\n";
    fs.writeFileSync(ACCOUNTS_GUIDE_FILE, header);
  }
  const dateStr = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const row = `| ${user.username} | ${user.role} | ${dateStr} |\n`;
  fs.appendFileSync(ACCOUNTS_GUIDE_FILE, row);
}

// Password rule (matches what the frontend validates too):
// at least 8 characters, at least one digit, one lowercase letter, one
// UPPERCASE letter, and one of @ or $.
const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@$])[A-Za-z0-9@$]{8,}$/;

if (!FAUCET_PRIVATE_KEY) {
  console.error("FAUCET_PRIVATE_KEY is not set. Copy blockchain/.env.example to blockchain/.env and try again.");
  process.exit(1);
}
if (!ADMIN_PASSWORD) {
  console.error("ADMIN_PASSWORD is not set. Add it to blockchain/.env (see .env.example) and try again.");
  process.exit(1);
}

// ---------- tiny local "database" helpers ----------

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  const raw = fs.readFileSync(USERS_FILE, "utf8").trim();
  return raw ? JSON.parse(raw) : [];
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// NEW: same pattern as users.json, but for QR-code IPFS records.
function loadQRCodes() {
  if (!fs.existsSync(QRCODES_FILE)) return {};
  const raw = fs.readFileSync(QRCODES_FILE, "utf8").trim();
  return raw ? JSON.parse(raw) : {};
}
function saveQRCodes(qrcodes) {
  fs.writeFileSync(QRCODES_FILE, JSON.stringify(qrcodes, null, 2));
}

// NEW: same pattern again, for temperatures.json.
function loadTemps() {
  if (!fs.existsSync(TEMPS_FILE)) return {};
  const raw = fs.readFileSync(TEMPS_FILE, "utf8").trim();
  return raw ? JSON.parse(raw) : {};
}
function saveTemps(temps) {
  fs.writeFileSync(TEMPS_FILE, JSON.stringify(temps, null, 2));
}

// NEW: expired-batch reports from a Pharmacy (expiry-reports.json).
const EXPIRY_FILE = path.join(__dirname, "expiry-reports.json");
function loadExpiryReports() {
  if (!fs.existsSync(EXPIRY_FILE)) return {};
  const raw = fs.readFileSync(EXPIRY_FILE, "utf8").trim();
  return raw ? JSON.parse(raw) : {};
}
function saveExpiryReports(reports) {
  fs.writeFileSync(EXPIRY_FILE, JSON.stringify(reports, null, 2));
}

// NEW: Batch ID system — Product Code per Batch ID (batch-meta.json).
const BATCHMETA_FILE = path.join(__dirname, "batch-meta.json");
function loadBatchMeta() {
  if (!fs.existsSync(BATCHMETA_FILE)) return {};
  const raw = fs.readFileSync(BATCHMETA_FILE, "utf8").trim();
  return raw ? JSON.parse(raw) : {};
}
function saveBatchMeta(meta) {
  fs.writeFileSync(BATCHMETA_FILE, JSON.stringify(meta, null, 2));
}

// Passwords are hashed with Node's built-in scrypt (no extra dependency
// needed) — never stored in plain text, even locally.
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const check = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(check, "hex"));
}

// Strip password hash, private key, and security-answer hashes before
// ever sending a user object back to the frontend in a listing/search
// context.
function publicUser(u) {
  const status = accountStatus(u);
  return {
    username: u.username,
    role: u.role,
    city: u.city,
    walletAddress: u.walletAddress,
    disabled: status.disabled,
    disabledReason: status.reason, // "admin" | "lockout" | null
    disabledUntil: status.reason === "lockout" ? u.disabledUntil : null,
  };
}

// NEW: computes whether an account is currently disabled, and why.
// Two independent mechanisms can disable an account:
//   - disabledByAdmin: a manual admin toggle, stays disabled until an
//     admin explicitly re-enables it (time never un-locks this one).
//   - disabledUntil: an automatic 24-hour lock from failing the
//     Forgot Password security questions 5 times; expires on its own.
function accountStatus(user) {
  if (user.disabledByAdmin) {
    return { disabled: true, reason: "admin" };
  }
  if (user.disabledUntil && new Date(user.disabledUntil).getTime() > Date.now()) {
    return { disabled: true, reason: "lockout" };
  }
  return { disabled: false, reason: null };
}

// ---------- blockchain connection ----------

let provider;
let faucetWallet;
let roleAdminContract; // contract instance signed by the deployer, used to call assignRole()

async function init() {
  provider = new ethers.providers.JsonRpcProvider(RPC_URL);

  const network = await provider.getNetwork();
  if (network.chainId !== 31337) {
    console.error(
      `Refusing to start: connected network chainId is ${network.chainId}, expected 31337 (Hardhat localhost). This server only runs against local Hardhat.`
    );
    process.exit(1);
  }

  faucetWallet = new ethers.Wallet(FAUCET_PRIVATE_KEY, provider);
  roleAdminContract = new ethers.Contract(CONTRACT_ADDRESS, contractArtifact.abi, faucetWallet);

  // Sanity check: the account we're using as "role admin" must actually
  // be the contract's on-chain owner, or assignRole() will revert for
  // every signup. This is true by default because scripts/deploy.js
  // deploys using the first Hardhat account, same as FAUCET_PRIVATE_KEY.
  const onChainOwner = await roleAdminContract.owner();
  if (onChainOwner.toLowerCase() !== faucetWallet.address.toLowerCase()) {
    console.error(
      `WARNING: FAUCET_PRIVATE_KEY's address (${faucetWallet.address}) is not the contract owner (${onChainOwner}). ` +
      `Signup will fail to assign roles. Make sure you deployed with the default first Hardhat account.`
    );
  }

  console.log("Faucet / role-admin wallet:", faucetWallet.address);
  console.log("Connected to Hardhat localhost, chainId 31337. Backend ready.");
}

async function fundWallet(address, amountEth) {
  const tx = await faucetWallet.sendTransaction({
    to: address,
    value: ethers.utils.parseEther(amountEth),
  });
  await tx.wait();
  return tx.hash;
}

// ============================================================
// ROUTES
// ============================================================

// ---------- Sign up ----------
app.post("/signup", async (req, res) => {
  try {
    const { username, password, role, city, sport, food } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: "Username is required." });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: "Role must be one of: " + VALID_ROLES.join(", ") });
    }
    if (!city || !city.trim()) {
      return res.status(400).json({ error: "City is required." });
    }
    if (!PASSWORD_REGEX.test(password || "")) {
      return res.status(400).json({
        error:
          "Password must be at least 8 characters and include a number, an uppercase letter, a lowercase letter, and @ or $.",
      });
    }
    // NEW: two security questions, used later by Forgot Password.
    // Validated against the fixed lists (SPORTS / INDIAN_FOODS) so there
    // is never a "did I spell that the same way" mismatch at reset time.
    if (!SPORTS.includes(sport)) {
      return res.status(400).json({ error: "Please choose a valid favourite sport from the list." });
    }
    if (!INDIAN_FOODS.includes(food)) {
      return res.status(400).json({ error: "Please choose a valid favourite food from the list." });
    }

    const users = loadUsers();
    const usernameLower = username.trim().toLowerCase();
    // "admin" is reserved for the Admin sign-in; nobody can register it.
    if (usernameLower === "admin") {
      return res.status(400).json({ error: "That username is reserved. Please choose another." });
    }
    if (users.some((u) => u.username.toLowerCase() === usernameLower)) {
      return res.status(409).json({ error: "That username is already taken." });
    }

    // NEW: generate a fresh blockchain wallet for this user — this is
    // what replaces "manually import a Hardhat private key into MetaMask".
    const wallet = ethers.Wallet.createRandom();

    // Fund it immediately so they can register/transfer batches right away.
    const fundTxHash = await fundWallet(wallet.address, FUNDING_AMOUNT_ETH);

    // NEW: register this wallet's role ON-CHAIN, so the smart contract
    // itself (not just this backend) knows and enforces who can do what.
    // This is what makes "Manufacturer can only transfer to a
    // Distributor" a real guarantee instead of a UI convention.
    const roleTx = await roleAdminContract.assignRole(wallet.address, ROLE_ENUM[role]);
    await roleTx.wait();

    const newUser = {
      username: username.trim(),
      passwordHash: hashPassword(password),
      role,
      city: city.trim(),
      walletAddress: wallet.address,
      privateKey: wallet.privateKey, // local dev only — see big comment at top of file
      createdAt: new Date().toISOString(),
      // NEW: security-question answers, hashed the same way as the
      // password (never stored in plain text, even locally).
      sportHash: hashPassword(sport),
      foodHash: hashPassword(food),
      // NEW: account lock state — see accountStatus() above.
      failedResetAttempts: 0,
      disabledUntil: null,
      disabledByAdmin: false,
      resetToken: null,
      resetTokenExpires: null,
    };

    users.push(newUser);
    saveUsers(users);

    // NEW: log this signup into the plain-text guide file (name, role,
    // date) so it can be opened straight in VS Code — see comment near
    // ACCOUNTS_GUIDE_FILE above.
    appendToAccountsGuide(newUser);

    console.log(`Signed up: ${newUser.username} (${role}, ${city}) -> ${wallet.address}, funded tx ${fundTxHash}`);

    // NEW: this is the ONE time the private key is sent to the frontend
    // for a brand-new signup — needed so ImportWalletModal.jsx can show
    // it once for the user to paste into MetaMask. It is not stored in
    // frontend state beyond that modal, and is never sent again except
    // via the explicit /reveal-private-key flow (which requires the
    // password again).
    return res.json({
      success: true,
      username: newUser.username,
      role,
      city,
      walletAddress: wallet.address,
      privateKey: wallet.privateKey,
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Signup failed. Is Hardhat node running?" });
  }
});

// ---------- Log in ----------
app.post("/login", (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const users = loadUsers();
    const user = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    // NEW: the Partner Login form also asks for a role. If one was sent,
    // it must match the role this account registered with — otherwise a
    // Pharmacy account could sign in as a Manufacturer just by picking it.
    const { role: requestedRole } = req.body;
    if (requestedRole && requestedRole !== user.role) {
      return res.status(403).json({
        error: `This account is registered as ${user.role}, not ${requestedRole}.`,
      });
    }

    // NEW: block login if the account is disabled — either by an admin,
    // or automatically after 5 failed Forgot Password attempts.
    const status = accountStatus(user);
    if (status.disabled) {
      if (status.reason === "admin") {
        return res.status(403).json({ error: "This account has been disabled by an admin." });
      }
      const until = new Date(user.disabledUntil).toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
      return res.status(403).json({
        error: `Too many failed password-reset attempts. This account is locked until ${until}.`,
      });
    }

    // CHANGED: login no longer sends the private key at all. Real signing
    // now happens through MetaMask (imported once at signup — see
    // /signup and ImportWalletModal.jsx), so the frontend never needs
    // this account's key after the one-time import. This is strictly
    // more secure than the previous version: the key now exists in
    // exactly two places — this server's users.json, and MetaMask's own
    // encrypted storage on the user's device — and is never transmitted
    // on every login.
    return res.json({
      success: true,
      username: user.username,
      role: user.role,
      city: user.city,
      walletAddress: user.walletAddress,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Login failed." });
  }
});

// ---------- Admin login (separate, simple password gate) ----------
app.post("/admin-login", (req, res) => {
  const { password, username } = req.body;
  // The Admin identity is the fixed name "admin" (it is not a registered
  // account). Older clients that send only a password still work.
  if (username !== undefined && String(username).trim().toLowerCase() !== "admin") {
    return res.status(401).json({ error: "Invalid admin username or password." });
  }
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true });
  }
  return res.status(401).json({ error: "Invalid admin username or password." });
});

// ---------- Fixed option lists for signup / forgot-password dropdowns ----------
app.get("/security-question-options", (req, res) => {
  res.json({ sports: SPORTS, foods: INDIAN_FOODS });
});

// ---------- Forgot Password: step 1, verify security answers ----------
// The two answers are NOT pre-filled anywhere — the user must pick them
// again from the dropdowns, same as at signup. 5 wrong attempts across
// the account's lifetime (not just this session) locks it for 24 hours.
app.post("/forgot-password/verify", (req, res) => {
  try {
    const { username, sport, food } = req.body;
    const users = loadUsers();
    const user = users.find((u) => u.username.toLowerCase() === (username || "").trim().toLowerCase());

    if (!user) {
      return res.status(404).json({ error: "No account with that username." });
    }

    // NEW: accounts created before this update never had security
    // questions collected, so there's nothing to verify against. Report
    // this clearly instead of crashing or failing ambiguously.
    if (!user.sportHash || !user.foodHash) {
      return res.status(400).json({
        error:
          "This account was created before security questions were added and has no recovery answers on file. Ask an admin to re-enable it, or sign up again.",
      });
    }

    const status = accountStatus(user);
    if (status.disabled) {
      if (status.reason === "admin") {
        return res.status(403).json({ error: "This account has been disabled by an admin. Contact an admin to re-enable it." });
      }
      const until = new Date(user.disabledUntil).toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
      return res.status(403).json({ error: `This account is locked until ${until}.` });
    }

    const sportOk = verifyPassword(sport || "", user.sportHash);
    const foodOk = verifyPassword(food || "", user.foodHash);

    if (sportOk && foodOk) {
      // Correct — issue a short-lived token for the actual reset step,
      // and clear the failed-attempt counter.
      user.failedResetAttempts = 0;
      user.resetToken = crypto.randomBytes(24).toString("hex");
      user.resetTokenExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
      saveUsers(users);
      return res.json({ valid: true, resetToken: user.resetToken });
    }

    // Wrong — count it, and lock the account for 24 hours on the 5th miss.
    user.failedResetAttempts = (user.failedResetAttempts || 0) + 1;
    if (user.failedResetAttempts >= MAX_RESET_ATTEMPTS) {
      user.disabledUntil = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
      user.failedResetAttempts = 0;
      saveUsers(users);
      const until = new Date(user.disabledUntil).toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
      return res.status(403).json({
        error: `Incorrect answers. Maximum attempts reached — sorry, this account has been disabled. You can register a new account, or this one re-enables automatically on ${until}.`,
      });
    }

    saveUsers(users);
    const remaining = MAX_RESET_ATTEMPTS - user.failedResetAttempts;
    return res.status(401).json({
      error: `Incorrect answers. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before this account is locked for 24 hours.`,
    });
  } catch (err) {
    console.error("Forgot-password verify error:", err);
    return res.status(500).json({ error: "Could not verify security answers." });
  }
});

// ---------- Forgot Password: step 2, actually set the new password ----------
app.post("/forgot-password/reset", (req, res) => {
  try {
    const { username, resetToken, newPassword } = req.body;
    const users = loadUsers();
    const user = users.find((u) => u.username.toLowerCase() === (username || "").trim().toLowerCase());

    if (!user || !user.resetToken || user.resetToken !== resetToken) {
      return res.status(401).json({ error: "Invalid or expired reset session. Start Forgot Password again." });
    }
    if (new Date(user.resetTokenExpires).getTime() < Date.now()) {
      user.resetToken = null;
      user.resetTokenExpires = null;
      saveUsers(users);
      return res.status(401).json({ error: "This reset session expired. Start Forgot Password again." });
    }
    if (!PASSWORD_REGEX.test(newPassword || "")) {
      return res.status(400).json({
        error: "Password must be at least 8 characters and include a number, an uppercase letter, a lowercase letter, and @ or $.",
      });
    }

    user.passwordHash = hashPassword(newPassword);
    user.resetToken = null;
    user.resetTokenExpires = null;
    saveUsers(users);

    return res.json({ success: true });
  } catch (err) {
    console.error("Forgot-password reset error:", err);
    return res.status(500).json({ error: "Could not reset password." });
  }
});

// ---------- Admin: enable / disable an account ----------
// Requires the admin password on every call (no persistent admin
// session token exists in this simple backend) — matches the pattern
// already used for /admin-login.
app.post("/admin/set-account-status", (req, res) => {
  try {
    const { adminPassword, username, disabled } = req.body;
    if (adminPassword !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Incorrect admin password." });
    }
    const users = loadUsers();
    const user = users.find((u) => u.username.toLowerCase() === (username || "").trim().toLowerCase());
    if (!user) {
      return res.status(404).json({ error: "No account with that username." });
    }

    user.disabledByAdmin = !!disabled;
    if (!disabled) {
      // Re-enabling always overrides a timed lockout too, and gives the
      // account a clean slate on failed attempts.
      user.disabledUntil = null;
      user.failedResetAttempts = 0;
    }
    saveUsers(users);

    return res.json({ success: true, username: user.username, status: accountStatus(user) });
  } catch (err) {
    console.error("Admin set-account-status error:", err);
    return res.status(500).json({ error: "Could not update account status." });
  }
});

// ---------- Search users by username substring (for the recipient picker) ----------
// NEW: supports ?role=Distributor to restrict results to a specific
// role, so e.g. a Manufacturer's "Transfer To" search only ever shows
// Distributors, matching the enforced on-chain transfer order.
app.get("/users/search", (req, res) => {
  const q = (req.query.q || "").trim().toLowerCase();
  const roleFilter = req.query.role;
  const users = loadUsers();
  let matches = q ? users.filter((u) => u.username.toLowerCase().includes(q)) : users;
  if (roleFilter) {
    matches = matches.filter((u) => u.role === roleFilter);
  }
  return res.json(matches.map(publicUser));
});

// ---------- Reveal private key (for re-importing into MetaMask) ----------
// NEW: signup already showed this once. This endpoint exists only so a
// user who lost/cleared their MetaMask import can get it again — it
// requires the correct password every time, same as login, and is
// never called automatically by the frontend.
app.post("/reveal-private-key", (req, res) => {
  try {
    const { username, password } = req.body;
    const users = loadUsers();
    const user = users.find((u) => u.username.toLowerCase() === (username || "").trim().toLowerCase());
    if (!user || !verifyPassword(password || "", user.passwordHash)) {
      return res.status(401).json({ error: "Invalid username or password." });
    }
    return res.json({ walletAddress: user.walletAddress, privateKey: user.privateKey });
  } catch (err) {
    console.error("Reveal-private-key error:", err);
    return res.status(500).json({ error: "Could not retrieve key." });
  }
});

// ---------- Verify password without starting a new session ----------
// NEW: used for the "Confirm & Sign" step before Register Batch,
// Transfer Ownership, and Mark Delivered — this mirrors the
// "Prompt: Approve Transaction / Confirm & Sign" step MetaMask used to
// show, re-implemented for the username/password login model.
app.post("/verify-password", (req, res) => {
  try {
    const { username, password } = req.body;
    const users = loadUsers();
    const user = users.find((u) => u.username.toLowerCase() === (username || "").trim().toLowerCase());
    if (!user || !verifyPassword(password || "", user.passwordHash)) {
      return res.status(401).json({ valid: false, error: "Incorrect password." });
    }
    return res.json({ valid: true });
  } catch (err) {
    console.error("Verify-password error:", err);
    return res.status(500).json({ valid: false, error: "Verification failed." });
  }
});

// ---------- Reverse lookup: address -> user (for Fetch/History display) ----------
app.get("/users/by-address/:address", (req, res) => {
  const users = loadUsers();
  const user = users.find(
    (u) => u.walletAddress.toLowerCase() === req.params.address.toLowerCase()
  );
  if (!user) return res.status(404).json({ error: "Not found" });
  return res.json(publicUser(user));
});

// ---------- Admin: list all users ----------
app.get("/users", (req, res) => {
  const users = loadUsers();
  return res.json(users.map(publicUser));
});

// ---------- NEW: Consumer rating + feedback relay ----------
// A consumer has no account and no wallet in this app (see the big
// comment in SupplyChain.sol, item 5) so they can never sign a
// transaction themselves. This endpoint is the workaround: it takes a
// batch code, a 1-5 rating, and optional name/feedback plus a required
// city from the (unauthenticated, public) consumer verify page,
// resolves the batch id, and submits it ON THEIR BEHALF using this
// server's own funded wallet as the transaction sender. No MetaMask
// popup, no login required.
//
// The contract itself enforces "only after the pharmacy delivered it"
// (see submitRating's require in SupplyChain.sol) — this route just
// passes the revert reason back through as a normal error message
// instead of a generic 500, so the frontend can show something useful.
app.post("/rate-batch", async (req, res) => {
  try {
    const { batchCode, rating, name, city, feedback } = req.body;
    const trimmedCode = (batchCode || "").trim();
    const ratingNum = Number(rating);
    const trimmedCity = (city || "").trim();
    const trimmedName = (name || "").trim();
    const trimmedFeedback = (feedback || "").trim();

    if (!trimmedCode) {
      return res.status(400).json({ error: "Batch code is required." });
    }
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: "Rating must be a whole number from 1 to 5." });
    }
    if (!trimmedCity) {
      return res.status(400).json({ error: "City is required." });
    }

    const id = await roleAdminContract.getIdByCode(trimmedCode);
    if (id.toString() === "0") {
      return res.status(404).json({ error: "That batch code does not exist." });
    }

    const tx = await roleAdminContract.submitRating(
      id,
      ratingNum,
      trimmedName,
      trimmedCity,
      trimmedFeedback
    );
    await tx.wait();

    const batch = await roleAdminContract.getBatch(id);
    const ratingCount = batch.ratingCount.toNumber();
    const averageRating = ratingCount > 0 ? batch.ratingSum.toNumber() / ratingCount : 0;

    return res.json({
      success: true,
      batchCode: trimmedCode,
      rating: ratingNum,
      ratingCount,
      averageRating,
      txHash: tx.hash,
    });
  } catch (err) {
    console.error("Rate-batch error:", err);
    // Surface the contract's require() reason (e.g. "only available
    // after the pharmacy marks this batch as delivered") instead of a
    // generic message, when ethers gives us one.
    const reason = err?.reason || err?.error?.reason || err?.error?.message;
    if (reason) {
      return res.status(400).json({ error: reason.replace(/^execution reverted: /i, "") });
    }
    return res.status(500).json({ error: "Could not submit rating. Is Hardhat node running?" });
  }
});

// ---------- Faucet (unchanged behaviour, now shares the same server) ----------
app.post("/faucet", async (req, res) => {
  try {
    const { address } = req.body;
    if (!address || !ethers.utils.isAddress(address)) {
      return res.status(400).json({ error: "A valid wallet address is required." });
    }

    const tx = await faucetWallet.sendTransaction({
      to: address,
      value: ethers.utils.parseEther(FUNDING_AMOUNT_ETH),
    });
    await tx.wait();

    const newBalanceWei = await provider.getBalance(address);
    const newBalanceEth = ethers.utils.formatEther(newBalanceWei);

    return res.json({ success: true, amount: FUNDING_AMOUNT_ETH, txHash: tx.hash, newBalance: newBalanceEth });
  } catch (err) {
    console.error("Faucet error:", err.message);
    return res.status(500).json({ error: "Faucet transaction failed. Is Hardhat node running?" });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", network: "hardhat-localhost", faucet: faucetWallet?.address });
});

// ============================================================
// Cold-chain temperature tracking (off-chain, same reasoning as the QR
// code's IPFS record above)
// ============================================================
// WHY THIS IS OFF-CHAIN, NOT A CONTRACT FIELD: adding tempMin/tempMax
// to the Solidity struct would mean editing SupplyChain.sol, redeploying,
// and — since this is a fresh local Hardhat chain — losing every batch
// registered under the previous deployment. The temperature range and
// its readings aren't part of the ownership/authenticity guarantee the
// contract exists to provide (that's still 100% on-chain and untouched
// by this); they're supplementary shipping-condition metadata, so they
// follow the exact same "off-chain JSON, keyed by batch code, best-effort"
// pattern already used for the QR code's IPFS record. If you later want
// this to be tamper-proof too, the natural next step is adding it to the
// contract and redeploying — this file is written so that's a drop-in
// replacement for these three routes without touching the frontend much.
//
// WHAT'S STORED: temperatures.json (git-ignored, same as users.json and
// qrcodes.json) maps batchCode -> { min, max, setAt, readings: [...] },
// where each reading is { temp, inRange, by, at }, newest last, capped
// at the most recent 50 so this file can't grow unbounded.

const MAX_TEMP_READINGS = 50;

// ---------- Manufacturer sets the safe storage range, right after registering ----------
app.post("/temperature/set", (req, res) => {
  try {
    const { batchCode, min, max } = req.body;
    if (!batchCode || !batchCode.trim()) {
      return res.status(400).json({ error: "batchCode is required." });
    }
    const minNum = Number(min);
    const maxNum = Number(max);
    if (!Number.isFinite(minNum) || !Number.isFinite(maxNum)) {
      return res.status(400).json({ error: "min and max must both be numbers." });
    }
    if (minNum >= maxNum) {
      return res.status(400).json({ error: "min must be less than max." });
    }

    const temps = loadTemps();
    temps[batchCode.trim()] = {
      min: minNum,
      max: maxNum,
      unit: "C",
      setAt: new Date().toISOString(),
      readings: temps[batchCode.trim()]?.readings || [],
    };
    saveTemps(temps);

    return res.json({ success: true, min: minNum, max: maxNum });
  } catch (err) {
    console.error("Temperature set error:", err);
    return res.status(500).json({ error: "Could not save the temperature range." });
  }
});

// ---------- Look up a batch's range + reading history ----------
app.get("/temperature/:batchCode", (req, res) => {
  const temps = loadTemps();
  const record = temps[req.params.batchCode];
  if (!record) return res.status(404).json({ error: "No temperature range set for that batch code." });
  return res.json(record);
});

// ---------- Log a reading taken at an ownership transfer ----------
app.post("/temperature/reading", (req, res) => {
  try {
    const { batchCode, temp, by } = req.body;
    if (!batchCode || !batchCode.trim()) {
      return res.status(400).json({ error: "batchCode is required." });
    }
    const tempNum = Number(temp);
    if (!Number.isFinite(tempNum)) {
      return res.status(400).json({ error: "temp must be a number." });
    }

    const temps = loadTemps();
    const record = temps[batchCode.trim()];
    if (!record) {
      return res.status(404).json({ error: "No temperature range set for that batch code." });
    }

    const inRange = tempNum >= record.min && tempNum <= record.max;
    record.readings.push({ temp: tempNum, inRange, by: by || "unknown", at: new Date().toISOString() });
    if (record.readings.length > MAX_TEMP_READINGS) {
      record.readings = record.readings.slice(-MAX_TEMP_READINGS);
    }
    saveTemps(temps);

    return res.json({ success: true, inRange, min: record.min, max: record.max, temp: tempNum });
  } catch (err) {
    console.error("Temperature reading error:", err);
    return res.status(500).json({ error: "Could not log the temperature reading." });
  }
});

// ============================================================
// Batch ID system: Product Code per Batch ID (off-chain)
// ============================================================
// For a NEW batch the contract's unique `batchCode` field holds the
// generated Batch ID (MMM-PP-DDMMYYYY-XX), so the blockchain itself
// guarantees no two batches share a Batch ID. The contract has no separate
// field for the Product Code (which is allowed to repeat), so it is kept
// here: batch-meta.json maps batchId -> { batchId, productCode, manufacturer,
// savedAt }. Batches registered before this system are simply absent from
// this file and keep working with their Product Code as before.
app.post("/batch-meta", (req, res) => {
  try {
    const { batchId, productCode, manufacturer } = req.body;
    const id = String(batchId || "").trim();
    const code = String(productCode || "").trim();
    if (!id) return res.status(400).json({ error: "batchId is required." });
    if (!code) return res.status(400).json({ error: "productCode is required." });
    const meta = loadBatchMeta();
    meta[id] = {
      batchId: id,
      productCode: code.slice(0, 80),
      manufacturer: String(manufacturer || "").slice(0, 80),
      savedAt: new Date().toISOString(),
    };
    saveBatchMeta(meta);
    return res.json({ success: true });
  } catch (err) {
    console.error("Batch meta error:", err);
    return res.status(500).json({ error: "Could not save the product code." });
  }
});

app.get("/batch-meta/:batchId", (req, res) => {
  const record = loadBatchMeta()[req.params.batchId];
  if (!record) return res.status(404).json({ error: "No product code on file for that Batch ID." });
  return res.json(record);
});

app.get("/batch-metas", (req, res) => {
  try {
    return res.json(Object.values(loadBatchMeta()));
  } catch {
    return res.json([]);
  }
});

// ============================================================
// Expired-batch reports (off-chain comment, on-chain "Not Delivered")
// ============================================================
// When an expired batch reaches a Pharmacy, the Pharmacy rejects it:
// the frontend calls the EXISTING contract function markDelivered(id,
// false) through MetaMask (so the rejection is a permanent on-chain
// "Not Delivered" record, no contract change) and then posts the
// pharmacy's written comment here. The comment is off-chain for the same
// reason the temperature range is (see above): free text doesn't belong
// in contract storage. expiry-reports.json maps batchCode ->
// { batchCode, reportedBy, role, comment, reportedAt }.
app.post("/expiry-report", (req, res) => {
  try {
    const { batchCode, reportedBy, comment } = req.body;
    if (!batchCode || !String(batchCode).trim()) {
      return res.status(400).json({ error: "batchCode is required." });
    }
    const text = String(comment || "").trim();
    if (text.length < 5) {
      return res.status(400).json({ error: "Please write a short comment (at least 5 characters)." });
    }
    if (text.length > 500) {
      return res.status(400).json({ error: "Comment is too long (500 characters max)." });
    }
    const reports = loadExpiryReports();
    reports[String(batchCode).trim()] = {
      batchCode: String(batchCode).trim(),
      reportedBy: String(reportedBy || "Pharmacy").slice(0, 80),
      role: "Pharmacy",
      comment: text,
      reportedAt: new Date().toISOString(),
    };
    saveExpiryReports(reports);
    return res.json({ success: true });
  } catch (err) {
    console.error("Expiry report error:", err);
    return res.status(500).json({ error: "Could not save the expiry report." });
  }
});

app.get("/expiry-reports", (req, res) => {
  try {
    return res.json(Object.values(loadExpiryReports()));
  } catch {
    return res.json([]);
  }
});

// ============================================================
// IPFS — decentralized storage for each batch's QR code image
// ============================================================
// WHY THIS EXISTS: the QR code itself only needs to encode the batch
// code as text (a few bytes) — decoding it is exactly the same as
// typing the batch code into the "Enter Batch Code" field, and that
// alone needs no IPFS, no backend call, nothing but the QR library
// running in the browser. IPFS is used here for a different job:
// keeping ONE canonical, shareable image file per batch — e.g. so it
// can be reprinted onto packaging, or looked up by CID from any device,
// without regenerating it locally. This matches "IPFS (Optional
// Storage)" in the architecture diagram in your report.
//
// HOW THIS TALKS TO IPFS: rather than pull in the (now deprecated)
// ipfs-http-client SDK, this calls a locally running Kubo (go-ipfs)
// node's own HTTP API directly with a multipart POST — the same API
// IPFS Desktop exposes by default at 127.0.0.1:5001. No extra library
// needed; Node's built-in fetch/FormData/Blob do the whole job.
//
// HOW TO RUN IT: install IPFS Desktop (https://docs.ipfs.tech/install/ipfs-desktop/)
// or run `ipfs daemon` from Kubo directly, then leave it running
// alongside Hardhat and this server. If it's not running, QR download
// still works perfectly (that part is 100% client-side) — only the
// "Save to IPFS" button will show a clear error instead of a CID.
//
// WHERE THE RESULT IS STORED: blockchain/qrcodes.json (git-ignored,
// same pattern as users.json) maps batchCode -> { cid, url,
// uploadedAt }. This is NOT written on-chain — it's just a convenience
// index so the app can show "this batch's QR is already on IPFS at
// <link>" without re-uploading it every time.

app.post("/ipfs/upload-qr", async (req, res) => {
  try {
    const { batchCode, imageBase64 } = req.body;
    if (!batchCode || !batchCode.trim()) {
      return res.status(400).json({ error: "batchCode is required." });
    }
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({ error: "imageBase64 (a data URL or raw base64 PNG) is required." });
    }

    // Accept either a raw base64 string or a full "data:image/png;base64,...." URL.
    const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    const bytes = Buffer.from(base64Data, "base64");

    const form = new FormData();
    form.append("file", new Blob([bytes], { type: "image/png" }), `${batchCode.trim()}.png`);

    let ipfsRes;
    try {
      ipfsRes = await fetch(`${IPFS_API_URL}/api/v0/add?pin=true`, {
        method: "POST",
        body: form,
      });
    } catch {
      return res.status(503).json({
        error: `Cannot reach a local IPFS node at ${IPFS_API_URL}. Install and run IPFS Desktop (or 'ipfs daemon'), then try again. QR download still works without it.`,
      });
    }

    if (!ipfsRes.ok) {
      const text = await ipfsRes.text().catch(() => "");
      return res.status(502).json({ error: `IPFS node rejected the upload: ${text || ipfsRes.statusText}` });
    }

    const result = await ipfsRes.json(); // Kubo returns { Name, Hash, Size }
    const cid = result.Hash;
    const url = `${IPFS_GATEWAY_URL}${cid}`;

    const qrcodes = loadQRCodes();
    qrcodes[batchCode.trim()] = { cid, url, uploadedAt: new Date().toISOString() };
    saveQRCodes(qrcodes);

    return res.json({ success: true, cid, url });
  } catch (err) {
    console.error("IPFS upload error:", err);
    return res.status(500).json({ error: "Could not upload QR code to IPFS." });
  }
});

// ---------- Look up a previously-uploaded QR code's IPFS record ----------
app.get("/ipfs/qrcode/:batchCode", (req, res) => {
  const qrcodes = loadQRCodes();
  const record = qrcodes[req.params.batchCode];
  if (!record) return res.status(404).json({ error: "No IPFS record for that batch code yet." });
  return res.json(record);
});

// ---------- Quick check: is a local IPFS node reachable? ----------
app.get("/ipfs/status", async (req, res) => {
  try {
    const r = await fetch(`${IPFS_API_URL}/api/v0/version`, { method: "POST" });
    if (!r.ok) throw new Error("bad response");
    const data = await r.json();
    return res.json({ connected: true, version: data.Version });
  } catch {
    return res.json({ connected: false });
  }
});

init().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend running at http://127.0.0.1:${PORT}`);
    console.log("DEVELOPMENT ONLY — do not deploy this server anywhere public.");
  });
});
