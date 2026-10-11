import { useState } from "react";

// ============================================================
// MetaMaskConnectCard
// ============================================================
// Pure UI for the "Connect MetaMask" step shown after a successful
// username/password check. It owns NO wallet logic: SignInForm passes in
// the existing handlers (connect, cancel, show-the-key) and state, so
// the behaviour is exactly what it was before this redesign. The only
// thing handled here is the copy-to-clipboard button for the address.

function FoxIcon({ size = 54 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M8 6 29 22l-4 9L8 6Z" fill="#E2761B" stroke="#E2761B" strokeLinejoin="round" />
      <path d="M56 6 35 22l4 9L56 6Z" fill="#E4761B" stroke="#E4761B" strokeLinejoin="round" />
      <path d="m8 6 4 17-3 12 8 8-9 7 11 8 8-4h8l8 4 11-8-9-7 8-8-3-12 4-17-21 16h-6L8 6Z" fill="#F6851B" stroke="#F6851B" strokeLinejoin="round" />
      <path d="m25 31 4 9-6 5-5-9 7-5Zm14 0 7 5-5 9-6-5 4-9Z" fill="#D7C1B3" />
      <circle cx="26" cy="38" r="2.6" fill="#233447" />
      <circle cx="38" cy="38" r="2.6" fill="#233447" />
      <path d="m27 49 5 3 5-3-1 5h-8l-1-5Z" fill="#161616" />
      <path d="M28 46h8l-1 3h-6l-1-3Z" fill="#763D16" />
    </svg>
  );
}

function EthHexagon() {
  return (
    <svg width="120" height="84" viewBox="0 0 120 84" aria-hidden="true" style={{ opacity: 0.95 }}>
      <g fill="none" stroke="#c4b5fd" strokeWidth="1.2">
        <path d="M20 20 40 10l20 10v20L40 50 20 40V20Z" />
        <path d="M84 8 100 16v16l-16 8-16-8V16l16-8Z" opacity="0.7" />
        <path d="M56 54 70 61v14l-14 7-14-7V61l14-7Z" opacity="0.6" />
      </g>
      <path d="M78 22 98 46 78 58 58 46 78 22Z" fill="#6c2bd9" transform="translate(-2 -4)" opacity="0" />
      <polygon points="78,6 102,34 78,64 54,34" fill="#7c3aed" />
      <polygon points="78,6 78,64 54,34" fill="#a78bfa" />
      <polygon points="78,6 78,64 102,34" fill="#6c2bd9" />
      <polygon points="78,38 98,32 78,64 58,32" fill="#5b21b6" opacity="0.35" />
    </svg>
  );
}

const IconUser = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);
const IconCopy = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6c2bd9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);
const IconCheck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 13 4 4L19 7" />
  </svg>
);
const IconArrow = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e1b4b" strokeWidth="2.4" strokeLinecap="round">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
const IconKey = () => (
  <svg style={{ flexShrink: 0 }} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6c2bd9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="15" r="4" />
    <path d="m11 12 9-9M16 7l3 3M14 9l2 2" />
  </svg>
);
const IconWarn = () => (
  <span style={{ ...badgeStyle, backgroundColor: "#301805" }}>!</span>
);
const IconInfo = () => (
  <span style={{ ...badgeStyle, backgroundColor: "#210f42", fontFamily: "Georgia, serif", fontStyle: "italic" }}>i</span>
);

export default function MetaMaskConnectCard({
  username,
  walletAddress,
  connecting,
  onConnect,
  onCancel,
  showKeyVisible, // false once the key flow has already been opened
  onShowKey,
  children, // message box + password re-entry + import modal, supplied by SignInForm
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — fall back to a
      // temporary textarea so the button still works.
      const ta = document.createElement("textarea");
      ta.value = walletAddress;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div style={cardStyle} className="mm-card">
      <style>{responsiveCss}</style>

      {/* 1. Header */}
      <div style={headerStyle}>
        {/* <FoxIcon /> */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={headingStyle}>Connect MetaMask</h2>
          <p style={subheadingStyle}>Connect your MetaMask wallet to continue securely.</p>
        </div>
        <div className="mm-eth">
          {/* <EthHexagon /> */}
        </div>
      </div>

      <div style={{ padding: "16px 18px 20px" }}>
        {/* 2. Signed in as */}
        <div style={accountBoxStyle}>
          <span style={avatarStyle}>
            <IconUser />
          </span>
          <div>
            <div style={{ fontSize: "14px", color: "#475569" }}>Signed in as</div>
            <div style={{ fontSize: "26px", fontWeight: 800, color: "#6c2bd9", lineHeight: 1.15 }}>{username}</div>
          </div>
        </div>

        {/* 3. Expected account */}
        <div style={{ margin: "16px 0 8px", fontSize: "14px", color: "#334155", textAlign: "left" }}>
          Expected account(Wallet Address) for <strong style={{ color: "#0f172a" }}>{username}</strong>:
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
          <div style={addressBoxStyle}>{walletAddress}</div>
          <button type="button" style={copyButtonStyle} onClick={handleCopy} aria-label="Copy address" title={copied ? "Copied" : "Copy address"}>
            {copied ? <IconCheck /> : <IconCopy />}
          </button>
        </div>

        {/* 4. Connect + Cancel */}
        <div className="mm-actions" style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
          <button type="button" style={connectButtonStyle} onClick={onConnect} disabled={connecting}>
            {/* <span style={{ display: "flex", background: "#fff", borderRadius: "8px", padding: "2px" }}>
              <FoxIcon size={26} />
            </span> */}
            <span style={{ flex: 1, textAlign: "center" }}>{connecting ? "Connecting..." : "Connect to MetaMask"}</span>
            {/* <IconArrow /> */}
          </button>
          <button type="button" style={cancelButtonStyle} onClick={onCancel} disabled={connecting}>
            {/* <IconX /> */}
            Cancel
          </button>
        </div>

        {/* 5. Different account selected? */}
        <div style={warnBoxStyle}>
          <IconWarn />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 700, color: "#9a3412", marginBottom: "3px" }}>Different account selected?</div>
            <div style={{ fontSize: "13px", color: "#7c2d12", lineHeight: 1.5 }}>
              If MetaMask opens with a different account, use <strong>“Edit accounts”</strong> in the MetaMask
              popup, <strong>untick</strong> the currently connected account, select the account belonging to{" "}
              <strong>{username}</strong>, and then click <strong>Connect</strong>.
            </div>
          </div>
        </div>

        {/* 6. Account not available? */}
        <div style={infoBoxStyle}>
          <IconInfo />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 700, color: "#4c1d95", marginBottom: "3px" }}>Account not available?</div>
            <div style={{ fontSize: "13px", color: "#3b2a73", lineHeight: 1.5 }}>
              If the expected address does not appear in the popup - not even under <strong>“Edit accounts”</strong>{" "}
              - it means this account was never imported into MetaMask in this browser.
            </div>
          </div>
        </div>

        {/* 7. Show me the key */}
        {showKeyVisible && (
          <button type="button" style={keyButtonStyle} onClick={onShowKey}>
            {/* <IconKey /> */}
            This account isn't imported yet - show me the private key
          </button>
        )}

        {children}
      </div>
    </div>
  );
}

const responsiveCss = `
@media (max-width: 640px) {
  .mm-card .mm-actions { flex-direction: column; }
  .mm-card .mm-eth { display: none; }
}
`;

const badgeStyle = {
  width: "26px",
  height: "26px",
  borderRadius: "50%",
  color: "#fff",
  fontWeight: 800,
  fontSize: "15px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  marginTop: "1px",
};
const cardStyle = {
  width: "min(900px, 100%)",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  border: "1px solid #e4e0f5",
  borderRadius: "16px",
  boxShadow: "0 18px 50px rgba(76, 29, 149, 0.14)",
  overflow: "hidden",
  color: "#0f172a",
  textAlign: "left",
};
const headerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "16px 22px",
  background: "linear-gradient(100deg, #ece8fb 0%, #f4f1ff 55%, #e9e4fb 100%)",
  borderBottom: "1px solid #e4e0f5",
};
const headingStyle = { margin: 0, fontSize: "26px", fontWeight: 800, color: "#2e1065" };
const subheadingStyle = { margin: "3px 0 0", fontSize: "14px", color: "#5b5680" };
const accountBoxStyle = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  padding: "12px 16px",
  backgroundColor: "#eef0ff",
  border: "1px solid #dcdffb",
  borderRadius: "12px",
};
const avatarStyle = {
  width: "52px",
  height: "52px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #8b5cf6, #6c2bd9)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
const addressBoxStyle = {
  flex: 1,
  minWidth: 0,
  padding: "13px 16px",
  backgroundColor: "#f4f5fb",
  border: "1px solid #e0e3f3",
  borderRadius: "10px",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: "15px",
  color: "#1e1b4b",
  wordBreak: "break-all",
};
const copyButtonStyle = {
  width: "52px",
  flexShrink: 0,
  border: "1px solid #d9d2f5",
  borderRadius: "10px",
  backgroundColor: "#f1edff",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const connectButtonStyle = {
  flex: 1.6,
  minHeight: "56px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "0 18px",
  border: "none",
  borderRadius: "10px",
  background: "linear-gradient(90deg, #6c2bd9, #5b21b6)",
  color: "#fff",
  fontSize: "16px",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 6px 16px rgba(108, 43, 217, 0.3)",
};
const cancelButtonStyle = {
  flex: 1,
  minHeight: "56px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  border: "1.5px solid #d9d2f5",
  borderRadius: "10px",
  backgroundColor: "#ffffff",
  color: "#1e1b4b",
  fontSize: "16px",
  fontWeight: 700,
  cursor: "pointer",
};
const warnBoxStyle = {
  display: "flex",
  gap: "12px",
  marginTop: "14px",
  padding: "13px 16px",
  backgroundColor: "#fff1e6",
  border: "1px solid #fdc9a0",
  borderRadius: "10px",
};
const infoBoxStyle = {
  display: "flex",
  gap: "12px",
  marginTop: "10px",
  padding: "13px 16px",
  backgroundColor: "#f1edff",
  border: "1px solid #d9d2f5",
  borderRadius: "10px",
};
const keyButtonStyle = {
  width: "100%",
  marginTop: "10px",
  minHeight: "48px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  border: "1.5px solid #6c2bd9",
  borderRadius: "10px",
  backgroundColor: "#ffffff",
  color: "#5b21b6",
  fontSize: "15px",
  fontWeight: 600,
  cursor: "pointer",
};
