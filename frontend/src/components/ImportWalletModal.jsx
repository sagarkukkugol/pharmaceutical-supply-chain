import { useState } from "react";

// ============================================================
// ImportWalletModal
// ============================================================
// Shown once, right after signup.
//
// The user must manually import the generated wallet into MetaMask.
// This component only displays the wallet information and provides
// copy/show/hide functionality.
//
// IMPORTANT:
// - Existing walletAddress/privateKey values are preserved.
// - Private key is hidden by default.
// - Show/Hide only changes visual display.
// - Nothing is stored or sent anywhere.
// - Existing onDone functionality is preserved.
// ============================================================

export default function ImportWalletModal({
  walletAddress,
  privateKey,
  username,
  onDone,
}) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  // ============================================================
  // COPY FUNCTION
  // ============================================================

  const copy = async (text, which) => {
    try {
      await navigator.clipboard.writeText(text);

      if (which === "key") {
        setCopiedKey(true);

        setTimeout(() => {
          setCopiedKey(false);
        }, 2000);
      } else {
        setCopiedAddr(true);

        setTimeout(() => {
          setCopiedAddr(false);
        }, 2000);
      }
    } catch {
      // Clipboard API can fail without HTTPS/permissions.
      // The value remains visible for manual copying.
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div style={overlayStyle}>
      <div style={boxStyle}>

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div style={headerRow}>

          {/* MetaMask-style icon */}
          {/* <div style={foxCircle}>
            <MetaMaskFoxIcon />
          </div> */}

          {/* Title */}
          <h3 style={titleStyle}>
            Import Your Account Into{" "}
            <span style={{ color: "#2563eb" }}>
              MetaMask
            </span>
          </h3>

          {/* Close */}
          <button
            type="button"
            style={closeButton}
            onClick={onDone}
            aria-label="Close"
            title="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1e293b"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </svg>
          </button>

        </div>


        {/* =====================================================
            INFORMATION BOX
        ====================================================== */}

        <div style={infoBox}>

          <span style={infoIcon}>
            i
          </span>

          <p style={infoText}>
            This is a one-time step. Your wallet was created and
            funded automatically, but MetaMask needs you to add it
            yourself - no website is allowed to do this for you
            (that's a MetaMask security rule, not a limitation of
            this app). After this, MetaMask will ask you to confirm
            every transaction you make.
          </p>

        </div>


        {/* =====================================================
            WALLET ADDRESS
        ====================================================== */}

        <label style={labelStyle}>

          <Svg
            d="M3 7a2 2 0 0 1 2-2h13v4
               M3 7v11a2 2 0 0 0 2 2h15V9H5
               a2 2 0 0 1-2-2Z
               M16 14.5h.01"
          />

          <span>
            Wallet Address
          </span>

        </label>


        <div style={fieldRow}>

          <code style={codeBoxStyle}>
            {walletAddress}
          </code>

          <button
            type="button"
            style={copyButtonStyle}
            onClick={() => copy(walletAddress, "addr")}
          >

            <Svg
              d="M9 9h11v11H9zM5 15V5h10"
            />

            {copiedAddr ? "Copied!" : "Copy"}

          </button>

        </div>


        {/* =====================================================
            PRIVATE KEY
        ====================================================== */}

        <label style={labelStyle}>

          <Svg
            d="M15 7a4 4 0 1 1-3.5 6L4 20.5V17H7v-3h3
               l1.5-1.5A4 4 0 0 1 15 7Z"
          />

          <span>
            Private Key
          </span>

        </label>


        <div style={fieldRow}>

          <code style={codeBoxStyle}>

            {showPrivateKey
              ? privateKey
              : "•".repeat(
                  Math.max(privateKey?.length || 32, 32)
                )}

          </code>


          {/* Show / Hide */}

          <button
            type="button"
            style={showButtonStyle}
            onClick={() =>
              setShowPrivateKey((previous) => !previous)
            }
          >

            {showPrivateKey ? (
              <>
                <Svg
                  d="M2 12s3.5-6 10-6
                     10 6 10 6-3.5 6-10 6
                     S2 12 2 12Z
                     M9 12a3 3 0 1 0 6 0
                     a3 3 0 0 0-6 0Z"
                />
                Hide
              </>
            ) : (
              <>
                <Svg
                  d="M2 12s3.5-6 10-6
                     10 6 10 6-3.5 6-10 6
                     S2 12 2 12Z
                     M9 12a3 3 0 1 0 6 0
                     a3 3 0 0 0-6 0Z"
                />
                Show
              </>
            )}

          </button>


          {/* Copy */}

          <button
            type="button"
            style={copyButtonStyle}
            onClick={() => copy(privateKey, "key")}
          >

            <Svg
              d="M9 9h11v11H9zM5 15V5h10"
            />

            {copiedKey ? "Copied!" : "Copy"}

          </button>

        </div>


        {/* =====================================================
            SECURITY WARNING
        ====================================================== */}

        <div style={warnBox}>

          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#111827"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ flexShrink: 0 }}
          >
            <path d="M12 3 2 20h20L12 3Z" />
            <path d="M12 10v4" />
            <path d="M12 17h.01" />
          </svg>

          <p style={{ margin: 0 }}>
            This is only shown once. Copy it now - you can get it
            again later on the sign-in screen if needed (it will ask
            for your password again).
          </p>

        </div>


        {/* =====================================================
            METAMASK INSTRUCTIONS
        ====================================================== */}

        <div style={stepsBox}>

          <div style={stepsHeader}>

            <svg
              width="27"
              height="27"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#111827"
              strokeWidth="1.9"
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              <path
                d="M12 6c-2-1.5-5-2-8-1.5v14
                   c3-.5 6 0 8 1.5
                   2-1.5 5-2 8-1.5v-14
                   C17 4 14 4.5 12 6Z"
              />

              <path d="M12 6v14" />
            </svg>

            <span>
              In MetaMask:
            </span>

          </div>


          <ol style={stepsList}>

            <Step n={1}>
              Open MetaMask → click the account icon
              (top right)
            </Step>


            <Step n={2}>
              Click{" "}
              <strong>
                "Add account or hardware wallet"
              </strong>{" "}
              →{" "}
              <strong>
                "Import account"
              </strong>
            </Step>


            <Step n={3}>
              Paste the private key above, click{" "}
              <strong>
                Import
              </strong>
            </Step>


            <Step n={4}>
              Make sure MetaMask's network is set to{" "}
              <strong>
                Localhost 8545
              </strong>{" "}
              (chain ID 31337)
            </Step>


            {username && (
              <Step n={5}>
                Rename this account to{" "}
                <strong>
                  "{username}"
                </strong>{" "}
                in MetaMask (click the account name at the
                top → Edit / rename) — so it's easy to
                recognize next time you switch accounts.
              </Step>
            )}

          </ol>

        </div>


        {/* =====================================================
            CONTINUE BUTTON
        ====================================================== */}

        <button
          type="button"
          style={buttonStyle}
          onClick={onDone}
        >
          I've imported it - Continue
          {/* <span style={arrowStyle}>
            →
          </span> */}
        </button>

      </div>
    </div>
  );
}


// ============================================================
// METAMASK FOX ICON
// ============================================================
// Self-contained icon so this component does NOT depend on
// FoxIcon being exported from MetaMaskConnectCard.jsx.
// ============================================================

function MetaMaskFoxIcon() {
  return (
    <svg
      width="43"
      height="43"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MetaMask"
    >

      {/* Left ear */}
      <path
        d="M8 7L28 20L23 31L8 7Z"
        fill="#E2761B"
      />

      {/* Right ear */}
      <path
        d="M56 7L36 20L41 31L56 7Z"
        fill="#E2761B"
      />

      {/* Face */}
      <path
        d="M10 25L20 18L32 22L44 18L54 25L49 47L32 57L15 47L10 25Z"
        fill="#F6851B"
      />

      {/* Left face */}
      <path
        d="M10 25L23 31L20 42L15 47L10 25Z"
        fill="#D96316"
      />

      {/* Right face */}
      <path
        d="M54 25L41 31L44 42L49 47L54 25Z"
        fill="#D96316"
      />

      {/* Forehead */}
      <path
        d="M20 18L32 22L44 18L41 31L32 36L23 31L20 18Z"
        fill="#FFB347"
      />

      {/* Left eye */}
      <path
        d="M20 29L28 31L23 35L19 32L20 29Z"
        fill="#111827"
      />

      {/* Right eye */}
      <path
        d="M44 29L36 31L41 35L45 32L44 29Z"
        fill="#111827"
      />

      {/* Nose */}
      <path
        d="M28 38L32 35L36 38L32 41L28 38Z"
        fill="#111827"
      />

      {/* Mouth */}
      <path
        d="M25 43C29 46 35 46 39 43"
        stroke="#111827"
        strokeWidth="2"
        strokeLinecap="round"
      />

    </svg>
  );
}


// ============================================================
// MONOCHROME SVG ICON
// ============================================================

function Svg({ d }) {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#111827"
      strokeWidth="1.9"
      strokeLinejoin="round"
      strokeLinecap="round"
      style={{ flexShrink: 0 }}
    >
      <path d={d} />
    </svg>
  );
}


// ============================================================
// STEP COMPONENT
// ============================================================

function Step({ n, children }) {
  return (
    <li style={stepItem}>

      <span style={stepNumber}>
        {n}
      </span>

      <span style={stepText}>
        {children}
      </span>

    </li>
  );
}


// ============================================================
// OVERLAY
// ============================================================

const overlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15, 23, 42, 0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1200,
  padding: "20px",
  backdropFilter: "blur(3px)",
};


// ============================================================
// MAIN MODAL
// ============================================================

const boxStyle = {
  backgroundColor: "#ffffff",
  color: "#0f172a",
  borderRadius: "20px",
  padding: "28px 30px",
  maxWidth: "820px",
  width: "100%",
  maxHeight: "92vh",
  overflowY: "auto",
  boxShadow: "0 28px 80px rgba(15, 23, 42, 0.30)",
  textAlign: "left",
  border: "1px solid #e2e8f0",
  boxSizing: "border-box",
};


// ============================================================
// HEADER
// ============================================================

const headerRow = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  marginBottom: "22px",
};


const foxCircle = {
  width: "62px",
  height: "62px",
  borderRadius: "50%",
  backgroundColor: "#f1f5f9",
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.10)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};


const titleStyle = {
  margin: 0,
  flex: 1,
  fontSize: "28px",
  lineHeight: 1.2,
  color: "#0b1b4d",
  fontWeight: 800,
};


const closeButton = {
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  border: "none",
  backgroundColor: "#eef2f7",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};


// ============================================================
// INFORMATION BOX
// ============================================================

const infoBox = {
  display: "flex",
  gap: "14px",
  alignItems: "flex-start",
  padding: "17px 19px",
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "13px",
  fontSize: "15px",
  lineHeight: 1.55,
  color: "#1e293b",
};


const infoIcon = {
  width: "31px",
  height: "31px",
  borderRadius: "50%",
  backgroundColor: "#1e293b",
  color: "#ffffff",
  fontWeight: 700,
  fontFamily: "Georgia, serif",
  fontStyle: "italic",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};


const infoText = {
  margin: 0,
  flex: 1,
};


// ============================================================
// LABELS
// ============================================================

const labelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  marginTop: "20px",
  marginBottom: "8px",
  fontSize: "16px",
  fontWeight: 700,
  color: "#0b1b4d",
};


// ============================================================
// WALLET / PRIVATE KEY FIELD
// ============================================================

const fieldRow = {
  display: "flex",
  gap: "10px",
  alignItems: "stretch",
  padding: "9px",
  border: "1px solid #dbe3ef",
  borderRadius: "11px",
  backgroundColor: "#ffffff",
  boxSizing: "border-box",
};


const codeBoxStyle = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  padding: "10px 12px",
  borderRadius: "7px",
  backgroundColor: "#f8fafc",
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: "14px",
  lineHeight: 1.45,
  wordBreak: "break-all",
  overflowWrap: "anywhere",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
  boxSizing: "border-box",
};


// ============================================================
// COPY BUTTON
// ============================================================

const copyButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  padding: "10px 15px",
  minWidth: "95px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#eef2f7",
  color: "#0f172a",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "14px",
  whiteSpace: "nowrap",
};


const showButtonStyle = {
  ...copyButtonStyle,
  minWidth: "92px",
};


// ============================================================
// WARNING
// ============================================================

const warnBox = {
  display: "flex",
  gap: "14px",
  alignItems: "center",
  marginTop: "15px",
  padding: "15px 18px",
  backgroundColor: "#fff7e6",
  border: "1px solid #fcd34d",
  borderRadius: "12px",
  fontSize: "14px",
  fontWeight: 600,
  lineHeight: 1.5,
  color: "#1e293b",
};


// ============================================================
// METAMASK INSTRUCTIONS
// ============================================================

const stepsBox = {
  marginTop: "17px",
  borderRadius: "13px",
  backgroundColor: "#f8fbff",
  border: "1px solid #bfdbfe",
  overflow: "hidden",
  color: "#0f172a",
};


const stepsHeader = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "16px 19px",
  backgroundColor: "#eff6ff",
  borderBottom: "1px solid #dbeafe",
  fontSize: "21px",
  fontWeight: 800,
  color: "#0b1b4d",
};


const stepsList = {
  listStyle: "none",
  margin: 0,
  padding: "7px 19px 9px",
};


const stepItem = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  padding: "12px 0",
  borderBottom: "1px solid #e2e9f7",
  fontSize: "15px",
  lineHeight: 1.5,
};


const stepNumber = {
  width: "34px",
  height: "34px",
  borderRadius: "50%",
  backgroundColor: "#e0ecff",
  color: "#2563eb",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};


const stepText = {
  flex: 1,
};


// ============================================================
// CONTINUE BUTTON
// ============================================================

const buttonStyle = {
  width: "100%",
  marginTop: "20px",
  padding: "14px 18px",
  borderRadius: "10px",
  border: "none",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(37, 99, 235, 0.20)",
};


const arrowStyle = {
  marginLeft: "8px",
  fontSize: "18px",
};