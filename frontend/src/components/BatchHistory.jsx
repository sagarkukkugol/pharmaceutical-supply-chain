// frontend/src/components/BatchHistory.jsx
//
// The "Batch History" lookup: batch code / ID (typed, scanned, or read
// from an uploaded QR image) -> resolve to a numeric id -> full history.
// Fetching + rendering live in BatchTimeline.jsx / batchTimelineData.js;
// this file only handles the code/ID -> id resolution and the input UI.
import { useState } from "react";
import { getReadOnlyContract } from "../contract";
import { useBatchTimeline } from "./batchTimelineData";
import { BatchTimelineEvents } from "./BatchTimeline";
import BatchCodeInput from "./BatchCodeInput";
import ViewQRButton from "./QRModal";
import { resolveBatchId } from "../resolveBatch";

export default function BatchHistory({ bare = false }) {
  const [batchInput, setBatchInput] = useState("");
  const [resolvedId, setResolvedId] = useState(null);
  const [resolveError, setResolveError] = useState("");
  const [resolving, setResolving] = useState(false);

  const { loading, error, batchCodeLabel, batchMeta, events, resolved } = useBatchTimeline(resolvedId);

  // codeOverride: used by the QR scan/upload path, which has the code in
  // hand before the input's state has updated. The button click passes an
  // event object, which falls back to what's typed.
  const fetchHistory = async (codeOverride) => {
    const code = typeof codeOverride === "string" ? codeOverride : batchInput;
    if (!code.trim()) {
      setResolveError("Please enter a batch code.");
      return;
    }
    setResolveError("");
    setResolvedId(null);
    setResolving(true);
    try {
      const contract = getReadOnlyContract();
      const trimmed = code.trim();
      const id = await resolveBatchId(contract, trimmed);
      if (id.toString() === "0") {
        throw new Error("Batch not found.");
      }
      setResolvedId(id.toString());
    } catch (err) {
      console.error(err);
      setResolveError(err.message || "Failed to fetch history. Check the batch code/ID and try again.");
    } finally {
      setResolving(false);
    }
  };

  const busy = loading || resolving;
  const shownError = resolveError || error;

  return (
    <div className={bare ? undefined : "sc-card"}>
      <div className="sc-card-head">
        <h2>Look up any batch</h2>
      </div>
      <p className="sc-qr-note">Type a batch code, ID or BCH number - or scan / upload its QR code.</p>

      <BatchCodeInput
        value={batchInput}
        onChange={setBatchInput}
        onDecoded={fetchHistory}
        placeholder="Batch ID, product code or numeric ID"
        style={{
          width: "100%",
          padding: "11px 12px",
          marginBottom: "12px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          fontSize: "15px",
          boxSizing: "border-box",
          backgroundColor: "#fff",
          color: "#0f172a",
          colorScheme: "light",
        }}
        onKeyDown={(e) => e.key === "Enter" && fetchHistory()}
      />

      <button className="sc-btn sc-btn--primary" onClick={() => fetchHistory()} disabled={busy}>
        {busy ? "Loading..." : "View History"}
      </button>

      {shownError && <p style={{ marginTop: 12, color: "#b91c1c" }}>{shownError}</p>}

      {events.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <ViewQRButton batchCode={batchCodeLabel} className="sc-btn" label="View QR" />
          </div>
          <BatchTimelineEvents events={events} resolved={resolved} batchMeta={batchMeta} batchCodeLabel={batchCodeLabel} />
        </div>
      )}

      {!busy && events.length === 0 && !shownError && batchInput && (
        <p style={{ marginTop: 15, color: "#64748b" }}>No history yet - press "View History" after entering a code or ID.</p>
      )}
    </div>
  );
}
