// Shared inline-style constants for the form-style cards (Register Batch,
// Transfer Ownership, Admin, auth). Colours follow the dashboard design
// system: navy text, blue primary, thin light borders.
export const PRIMARY = "#1d4ed8";
export const NAVY = "#0f172a";

export const cardStyle = {
  border: "1px solid #e2e8f0",
  padding: "22px",
  borderRadius: "12px",
  marginBottom: "24px",
  backgroundColor: "#ffffff",
  color: "#1e293b",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  textAlign: "left",
};
export const labelStyle = { display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#475569" };
export const inputStyle = {
  width: "100%",
  padding: "11px 12px",
  marginBottom: "15px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  fontSize: "15px",
  boxSizing: "border-box",
  // The page sets color-scheme: light dark; forcing light keeps native
  // inputs readable on every card.
  backgroundColor: "#ffffff",
  color: "#0f172a",
  colorScheme: "light",
};
export const readonlyBoxStyle = {
  width: "100%",
  padding: "11px 12px",
  marginBottom: "8px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  backgroundColor: "#f8fafc",
  color: "#1e293b",
  fontSize: "14px",
  boxSizing: "border-box",
};
export const buttonStyle = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: PRIMARY,
  color: "white",
  fontSize: "15px",
  fontWeight: 600,
  cursor: "pointer",
};
