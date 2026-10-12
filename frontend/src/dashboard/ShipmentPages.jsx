import { useState } from "react";
import { BatchToolbar, EmptyState, StatusBadge, Pager, Modal } from "./ui";
import { useRowFilter, useQrLookup, usePaged } from "./tableHelpers";
import BatchesPage from "./BatchesPage";
import { PAGE_COLUMNS } from "./columnSets";
import Icon from "./icons";
import TransferOwnershipCard from "../components/TransferOwnershipCard";
import { formatDateOnly } from "../utils";

const ACTIVE_STATUSES = ["Pending Pickup", "Picked Up", "In Transit"];

const ACTION_LABEL = { pickup: "Pick Up Batch", transit: "Start Transit", deliver: "Mark Delivered" };

// Active Shipments: batches currently in this transporter's custody.
// Only the action that is valid for the shipment's current status is
// offered. Pick Up / Start Transit are checkpoints recorded on this
// device (the contract has no such states); Mark Delivered is the REAL
// on-chain ownership transfer to a Distributor, using the existing
// transfer flow (MetaMask confirmation included).
export function ActiveShipmentsPage({ session, rows, allBatches, loading, error, onDetails, onCheckpoint, onChainChange }) {
  const active = rows.filter((r) => r.status !== "Delivered");
  const { query, setQuery, status, setStatus, range, setRange, filtered } = useRowFilter(active);
  const lookup = useQrLookup(active, allBatches, onDetails);
  const { page, setPage, pages, slice, total } = usePaged(filtered, 6);
  const [delivering, setDelivering] = useState(null);

  return (
    <>
      <div className="sc-card">
        <div className="sc-card-head">
          <div>
            <h2>Active Shipments</h2>
            <p className="sc-page-sub" style={{ margin: 0 }}>Batches currently assigned to you.</p>
          </div>
        </div>
        <BatchToolbar
          query={query}
          setQuery={(v) => {
            lookup.setNote("");
            setQuery(v);
          }}
          status={status}
          setStatus={setStatus}
          statusOptions={ACTIVE_STATUSES}
          range={range}
          setRange={setRange}
          onQrCode={lookup.handle}
        />
        {lookup.note && <p className="sc-qr-note sc-qr-note--warn">{lookup.note}</p>}
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
        {loading && active.length === 0 && <p className="sc-page-sub">Loading shipments from the chain...</p>}
        {!loading && filtered.length === 0 && (
          <EmptyState icon="truck" title={active.length === 0 ? "No active shipments" : "No matching shipments"}>
            {active.length === 0 ? "Batches a manufacturer transfers to you will appear here." : "Try a different search or filter."}
          </EmptyState>
        )}
        {slice.map((r) => (
          <div key={r.id} className="sc-ship">
            <div className="sc-ship-head">
              <div>
                <strong style={{ color: "#0f172a", fontSize: 15 }}>{r.displayId}</strong>{" "}
                <span style={{ color: "#64748b" }}>· {r.productName}</span>
              </div>
              <StatusBadge status={r.status} tone={r.statusTone} />
            </div>
            <dl className="sc-ship-grid" style={{ margin: 0 }}>
              <div><dt>Product Code</dt><dd>{r.productCode ?? r.batchCode}</dd></div>
              <div><dt>Quantity</dt><dd>{r.quantity.toLocaleString()}</dd></div>
              <div><dt>Pickup Location</dt><dd>{r.pickupLocation}</dd></div>
              <div><dt>Delivery Location</dt><dd>{r.deliveryLocation}</dd></div>
              <div><dt>Temperature Range</dt><dd>{r.tempText}</dd></div>
              <div><dt>Current Owner</dt><dd>{r.currentOwnerName || "—"}</dd></div>
              <div><dt>Assigned Date</dt><dd>{formatDateOnly(r.receivedAt)}</dd></div>
              <div><dt>Expiry Date</dt><dd>{formatDateOnly(r.expiryDate)}</dd></div>
            </dl>
            <div className="sc-ship-actions">
              {r.nextAction && r.nextAction !== "deliver" && (
                <button type="button" className="sc-btn sc-btn--primary sc-btn--sm" onClick={() => onCheckpoint(r, r.nextAction)}>
                  <Icon name={r.nextAction === "pickup" ? "check" : "truck"} size={15} /> {ACTION_LABEL[r.nextAction]}
                </button>
              )}
              {r.nextAction === "deliver" && (
                <button type="button" className="sc-btn sc-btn--primary sc-btn--sm" onClick={() => setDelivering(r)}>
                  <Icon name="send" size={15} /> {ACTION_LABEL.deliver}
                </button>
              )}
              <button type="button" className="sc-details-link" onClick={() => onDetails(r)} style={{ marginLeft: "auto" }}>
                Details <Icon name="arrowRight" size={14} />
              </button>
            </div>
            {r.nextAction && r.nextAction !== "deliver" && (
              <p className="sc-note">This checkpoint is recorded on this device only — it is not a blockchain transaction.</p>
            )}
          </div>
        ))}
        <Pager page={page} pages={pages} setPage={setPage} total={total} pageSize={6} />
      </div>

      {delivering && (
        <Modal title={`Mark Delivered — ${delivering.displayId}`} onClose={() => setDelivering(null)} wide>
          <p className="sc-qr-note">
            Delivering hands this batch to a Distributor. This is the existing ownership transfer: MetaMask will ask you to confirm it.
          </p>
          <TransferOwnershipCard
            session={session}
            initialCode={delivering.batchCode}
            hideLookup
            heading="Hand over to Distributor"
            submitLabel="Mark Delivered"
            onDone={onChainChange}
          />
        </Modal>
      )}
    </>
  );
}

export function ShipmentHistoryPage({ rows, allBatches, loading, error, onDetails }) {
  const done = rows.filter((r) => r.status === "Delivered");
  return (
    <BatchesPage
      title="Shipment History"
      subtitle="Completed transportation records."
      rows={done}
      allBatches={allBatches}
      columns={PAGE_COLUMNS.shipmentHistory}
      loading={loading}
      error={error}
      onDetails={onDetails}
      statusOptions={null}
      dateKey="forwardedAt"
      emptyTitle="No completed shipments yet"
      emptyText="Batches you have handed to a distributor will be listed here."
    />
  );
}
