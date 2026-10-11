import { useState } from "react";
import BatchesPage from "./BatchesPage";
import { PAGE_COLUMNS } from "./columnSets";
import Icon from "./icons";
import MessageBox from "../components/MessageBox";
import { getMetaMaskContract } from "../contract";
import { describeError } from "../utils";

// Pharmacy "Stock & Sales". Dispensing is the existing markDelivered()
// contract call (MetaMask confirmation), unchanged.
export default function StockPage({ session, rows, allBatches, loading, error, onDetails, onChainChange }) {
  const [actioningId, setActioningId] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

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

  // Only batches still in the pharmacy's hands and not yet resolved can
  // be dispensed; everything else is read-only.
  const canAct = (r) => r.owned && r.deliveryStatus === 0;

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
          canAct(r) ? (
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
    </>
  );
}
