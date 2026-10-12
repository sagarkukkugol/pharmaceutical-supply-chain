import { useState } from "react";
import BatchesPage from "./BatchesPage";
import { PAGE_COLUMNS } from "./columnSets";
import Icon from "./icons";
import MessageBox from "../components/MessageBox";
import { getMetaMaskContract } from "../contract";
import { submitExpiryReport } from "../api";
import { Modal } from "./ui";
import { describeError } from "../utils";

// Pharmacy "Stock & Sales". Dispensing is the existing markDelivered()
// contract call (MetaMask confirmation), unchanged.
export default function StockPage({ session, rows, allBatches, loading, error, onDetails, onChainChange }) {
  const [actioningId, setActioningId] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  // Expired-batch report dialog: { row } while open.
  const [report, setReport] = useState(null);
  const [comment, setComment] = useState("");
  const [reportError, setReportError] = useState("");

  const mark = async (batch, delivered) => {
    setActioningId(batch.id);
    setMessage({ type: "", text: "" });
    try {
      const contract = await getMetaMaskContract(session.walletAddress);
      setMessage({ type: "pending", text: "Sending transaction..." });
      const tx = await contract.markDelivered(batch.id, delivered);
      setMessage({ type: "pending", text: "Waiting for confirmation..." });
      await tx.wait();
      setMessage({ type: "success", text: `${batch.displayId} marked as ${delivered ? "Dispensed" : "Not Delivered"}.` });
      onChainChange?.();
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: describeError(err) });
    } finally {
      setActioningId(null);
    }
  };

  // Reject an expired batch: existing markDelivered(id, false) through
  // MetaMask (permanent on-chain "Not Delivered"), then save the written
  // comment so the manufacturer (and earlier holders) are notified.
  const submitReport = async () => {
    const text = comment.trim();
    if (text.length < 5) {
      setReportError("Please write a short comment (at least 5 characters).");
      return;
    }
    const batch = report.row;
    setReportError("");
    setActioningId(batch.id);
    setMessage({ type: "", text: "" });
    try {
      // "Comment only" = the batch is already Not Delivered on-chain (e.g.
      // the comment could not be saved the first time) — no new transaction.
      if (!report.commentOnly) {
        const contract = await getMetaMaskContract(session.walletAddress);
        setMessage({ type: "pending", text: "Sending transaction..." });
        const tx = await contract.markDelivered(batch.id, false);
        setMessage({ type: "pending", text: "Waiting for confirmation..." });
        await tx.wait();
      }
      let note = "";
      let saved = true;
      try {
        await submitExpiryReport(batch.batchCode, session.username, text);
      } catch (saveErr) {
        saved = false;
        const why = saveErr?.message ? ` Reason: ${saveErr.message}.` : "";
        note =
          ` The comment could NOT be saved.${why} If it says "not found" or "Cannot POST", the backend (server.js) does not have the /expiry-report route yet: add the expiry-report code to server.js, restart it, then click "Add Expiry Comment" on this batch.`;
      }
      setMessage({
        type: saved ? "success" : "error",
        text: saved
          ? `${batch.displayId} reported as expired and marked Not Delivered. The manufacturer will be notified.`
          : `${batch.displayId} is marked Not Delivered on-chain.${note}`,
      });
      setReport(null);
      setComment("");
      onChainChange?.();
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: describeError(err) });
      setReport(null);
    } finally {
      setActioningId(null);
    }
  };

  // Only batches still in the pharmacy's hands and not yet resolved can
  // be dispensed; everything else is read-only.
  const canAct = (r) => r.owned && r.deliveryStatus === 0;
  // Expired batch already rejected (Not Delivered) but with no saved comment.
  const needsComment = (r) => r.owned && r.deliveryStatus === 2 && r.isExpired && !r.expiryReport;

  return (
    <>
      <BatchesPage
        title="Stock & Sales"
        subtitle="Available stock and what has been dispensed, per batch."
        rows={rows}
        allBatches={allBatches}
        columns={PAGE_COLUMNS.stock}
        loading={loading}
        error={error}
        onDetails={onDetails}
        statusOptions={["In Stock", "Low Stock", "Dispensed", "Not Delivered", "Expired"]}
        emptyTitle="No stock yet"
        emptyText="Batches a distributor dispatches to you will appear here."
        actionsLabel="Record sale"
        renderActions={(r) =>
          canAct(r) && r.status === "Expired" ? (
            <button
              type="button"
              className="sc-btn sc-btn--danger sc-btn--sm"
              disabled={actioningId === r.id}
              onClick={() => {
                setComment("");
                setReportError("");
                setReport({ row: r });
              }}
            >
              <Icon name="alert" size={14} /> Report Expired
            </button>
          ) : needsComment(r) ? (
            <button
              type="button"
              className="sc-btn sc-btn--sm"
              disabled={actioningId === r.id}
              onClick={() => {
                setComment("");
                setReportError("");
                setReport({ row: r, commentOnly: true });
              }}
            >
              Add Expiry Comment
            </button>
          ) : canAct(r) ? (
            <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
              <button type="button" className="sc-btn sc-btn--primary sc-btn--sm" disabled={actioningId === r.id} onClick={() => mark(r, true)}>
                <Icon name="check" size={14} /> {actioningId === r.id ? "Processing..." : "Mark Dispensed"}
              </button>
              <button type="button" className="sc-btn sc-btn--danger sc-btn--sm" disabled={actioningId === r.id} onClick={() => mark(r, false)}>
                Not Delivered
              </button>
            </span>
          ) : (
            <span style={{ color: "#94a3b8" }}>—</span>
          )
        }
      />
      <MessageBox message={message} />
      {report && (
        <Modal title={report.commentOnly ? "Add Expiry Comment" : "Report Expired Batch"} onClose={() => setReport(null)}>
          <p style={{ margin: "0 0 10px", fontSize: 14 }}>
            <strong>{report.row.displayId}</strong> — {report.row.productName} ({report.row.productCode ?? report.row.batchCode}) has passed its
            expiry date.{" "}
            {report.commentOnly ? (
              "It is already recorded as Not Delivered; this sends your comment to the manufacturer (no new transaction)."
            ) : (
              <>
                Reporting it records the batch as <strong>Not Delivered</strong> on the blockchain (MetaMask will ask you
                to confirm) and notifies the manufacturer with your comment.
              </>
            )}
          </p>
          <label htmlFor="sc-expiry-comment" style={{ display: "block", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
            Comment
          </label>
          <textarea
            id="sc-expiry-comment"
            className="sc-input"
            rows={4}
            maxLength={500}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g. Received after expiry date; quarantined and not dispensed."
            style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
          />
          {reportError && <div style={{ color: "#b91c1c", fontSize: 13, marginTop: 6 }}>{reportError}</div>}
          <div className="sc-modal-actions">
            <button type="button" className="sc-btn" onClick={() => setReport(null)}>Cancel</button>
            <button type="button" className="sc-btn sc-btn--danger" disabled={actioningId === report.row.id} onClick={submitReport}>
              {actioningId === report.row.id ? "Processing..." : report.commentOnly ? "Send Comment" : "Report & Mark Not Delivered"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
