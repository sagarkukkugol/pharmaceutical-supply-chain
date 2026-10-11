import { useState } from "react";
import BatchHistory from "../components/BatchHistory";
import BatchTimelineView from "../components/BatchTimeline";
import ViewQRButton from "../components/QRModal";
import BatchesPage from "./BatchesPage";
import { Modal } from "./ui";
import { PAGE_COLUMNS } from "./columnSets";
import Icon from "./icons";

// Batch History = the existing lookup (any batch, by code / ID / QR) plus
// a searchable list of the role's own batches, each with its full
// on-chain timeline one click away.
export default function HistoryPage({ rows, allBatches, loading, error, statusOptions, onDetails }) {
  const [open, setOpen] = useState(null);
  return (
    <>
      <BatchHistory />
      <div style={{ marginTop: 20 }}>
        <BatchesPage
          title="Your batches"
          subtitle="Open a batch to see its complete history."
          rows={rows}
          allBatches={allBatches}
          columns={PAGE_COLUMNS.history}
          loading={loading}
          error={error}
          onDetails={onDetails}
          onQrHit={setOpen}
          statusOptions={statusOptions}
          actionsLabel="History"
          renderActions={(r) => (
            <button type="button" className="sc-btn sc-btn--sm" onClick={() => setOpen(r)}>
              <Icon name="history" size={14} /> View history
            </button>
          )}
        />
      </div>
      {open && (
        <Modal title={`History — ${open.displayId} · ${open.productName}`} onClose={() => setOpen(null)} wide>
          <div style={{ marginBottom: 12 }}>
            <ViewQRButton batchCode={open.batchCode} className="sc-btn sc-btn--sm" label="View QR" />
          </div>
          <BatchTimelineView batchId={open.id} />
        </Modal>
      )}
    </>
  );
}
