export default function MessageBox({ message }) {
  if (!message || !message.text) return null;
  const colors = {
    success: { bg: "#f0fdf4", border: "#16a34a", text: "#15803d" },
    error: { bg: "#fef2f2", border: "#dc2626", text: "#b91c1c" },
    pending: { bg: "#eff6ff", border: "#1d4ed8", text: "#1d4ed8" },
  };
  const style = colors[message.type] || colors.pending;
  return (
    <div
      role="status"
      style={{
        marginTop: "12px",
        padding: "10px 14px",
        borderRadius: "8px",
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        color: style.text,
        fontSize: "14px",
      }}
    >
      {message.text}
    </div>
  );
}
