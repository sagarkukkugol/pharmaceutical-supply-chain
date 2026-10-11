import { useState } from "react";
import { BatchToolbar, BatchTable } from "./ui";
import { useRowFilter, useQrLookup } from "./tableHelpers";
import { PAGE_COLUMNS } from "./columnSets";
import Icon from "./icons";
import TransferOwnershipCard from "../components/TransferOwnershipCard";

// Ownership transfer / dispatch workspace:
//   1. pick a batch you currently own (search, filter, Scan QR, Upload QR)
//   2. pick the authorised recipient   } both done by the EXISTING
//   3. review the transfer             } TransferOwnershipCard, which also
//   4. confirm -> MetaMask transaction } runs the on-chain transfer.
// No new blockchain mechanism: the card calls transferOwnership exactly
// as before, then we refresh the shared chain data so owner, status,
// history, activity and notifications all update.
export default function TransferWorkspace({ session, owned, allBatches, loading, error, title, subtitle, recipientLabel, emptyText, onChainChange }) {
  const [selected, setSelected] = useState(null);
  const { query, setQuery, status, setStatus, range, setRange, filtered } = useRowFilter(owned);
  const lookup = useQrLookup(owned, allBatches, setSelected);

  return (
    <>
      <div className="sc-card">
        <div className="sc-card-head">
          <div>
            <h2>{title}</h2>
            <p className="sc-page-sub" style={{ margin: 0 }}>{subtitle}</p>
          </div>
        </div>
        <ol className="sc-steps">
          <li>Select batch</li>
          <li>Select {recipientLabel}</li>
          <li>Review transfer</li>
          <li>Confirm in MetaMask</li>
        </ol>
        <BatchToolbar
          query={query}
          setQuery={(v) => {
            lookup.setNote("");
            setQuery(v);
          }}
          status={status}
          setStatus={setStatus}
          statusOptions={[...new Set(owned.map((r) => r.status))]}
          range={range}
          setRange={setRange}
          onQrCode={(code) => lookup.handle(code, "upload")}
        />
        {lookup.note && <p className="sc-qr-note sc-qr-note--warn">{lookup.note}</p>}
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
        {loading && owned.length === 0 ? (
          <p className="sc-page-sub">Loading batches from the chain...</p>
        ) : (
          <BatchTable
            rows={filtered}
            columns={PAGE_COLUMNS.select}
            pageSize={6}
            emptyTitle={owned.length === 0 ? "Nothing to transfer" : "No matching batches"}
            emptyText={owned.length === 0 ? emptyText : "Try a different search or filter."}
            actionsLabel="Select"
            renderActions={(r) => (
              <button
                type="button"
                className={`sc-btn sc-btn--sm${selected?.id === r.id ? " sc-btn--primary" : ""}`}
                onClick={() => setSelected(r)}
              >
                {selected?.id === r.id ? (
                  <>
                    <Icon name="check" size={14} /> Selected
                  </>
                ) : (
                  "Select"
                )}
              </button>
            )}
          />
        )}
      </div>

      {selected && (
        <div style={{ marginTop: 20 }}>
          <TransferOwnershipCard
            key={selected.batchCode}
            session={session}
            initialCode={selected.batchCode}
            hideLookup
            heading={`${title} — ${selected.displayId} · ${selected.productName}`}
            submitLabel={`Confirm ${title}`}
            onDone={onChainChange}
          />
        </div>
      )}
    </>
  );
}
