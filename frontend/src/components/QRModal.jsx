import { useState } from "react";
import QRCodeBox from "./QRCodeBox";

// ============================================================
// ViewQRButton
// ============================================================
// A "View QR" button that opens a modal showing the QR for ONE batch,
// with a Download button. It simply reuses QRCodeBox — the same
// generator the Register Batch page uses — so the QR payload is always
// the plain batch code text that Verify / Ownership Transfer / Batch
// History already expect. Closing the modal only hides it; nothing in the
// page underneath is touched.
export default function ViewQRButton({ batchCode, style, label = "View QR", className }) {
  const [open, setOpen] = useState(false);
  if (!batchCode) return null;

  return (
    <>
      <button
        type="button"
        className={className}
        style={className ? style : { ...defaultButtonStyle, ...style }}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {label}
      </button>
      {open && (
        <div style={overlayStyle} onClick={() => setOpen(false)}>
          <div style={boxStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 4px", color: "#1d4ed8", textAlign: "center" }}>QR Code</h3>
            <p style={{ margin: "0 0 14px", textAlign: "center", color: "#334155", fontSize: "14px" }}>
              Batch: <strong>{batchCode}</strong>
            </p>
            <QRCodeBox batchCode={batchCode} />
            <button type="button" style={closeButtonStyle} onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const defaultButtonStyle = {
  padding: "8px 14px",
  borderRadius: "8px",
  border: "1px solid #1d4ed8",
  backgroundColor: "#ffffff",
  color: "#1d4ed8",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
const overlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15, 23, 42, 0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1300,
  padding: "16px",
};
const boxStyle = {
  backgroundColor: "#ffffff",
  color: "#1e293b",
  borderRadius: "14px",
  padding: "24px",
  width: "min(340px, 100%)",
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 20px 60px rgba(15, 23, 42, 0.3)",
};
const closeButtonStyle = {
  width: "100%",
  marginTop: "16px",
  padding: "10px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#475569",
  color: "#fff",
  fontSize: "14px",
  cursor: "pointer",
};
