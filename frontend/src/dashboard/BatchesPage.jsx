import { useState } from "react";
import { BatchToolbar, BatchTable, SelectField } from "./ui";
import { useRowFilter, useQrLookup } from "./tableHelpers";

const SORT_OPTIONS = [
  { key: "time", label: "Newest first" },
  { key: "quantity", label: "Quantity (highest)" },
  { key: "ratingHigh", label: "Highest rating" },
  { key: "ratingLow", label: "Lowest rating" },
];

function sortRows(rows, key) {
  return [...rows].sort((a, b) => {
    switch (key) {
      case "quantity":
        return b.quantity - a.quantity;
      case "ratingHigh":
        return (b.avgRating ?? -1) - (a.avgRating ?? -1);
      case "ratingLow":
        return (a.avgRating ?? 6) - (b.avgRating ?? 6);
      default:
        return b.primaryDate - a.primaryDate;
    }
  });
}

// A searchable, filterable, paged batch table inside a card. Used by
// every list page; dashboards use it in "preview" mode (few rows, no
// pager, no sort).
export default function BatchesPage({
  title,
  subtitle,
  rows,
  allBatches,
  columns,
  loading,
  error,
  onDetails,
  statusOptions,
  qr = true,
  sortable = false,
  renderActions,
  actionsLabel,
  pageSize = 10,
  preview = false,
  emptyTitle,
  emptyText,
  headRight,
  onQrHit,
  dateKey,
}) {
  const { query, setQuery, status, setStatus, range, setRange, filtered } = useRowFilter(rows, { dateKey });
  const [sortKey, setSortKey] = useState("time");
  const lookup = useQrLookup(rows, allBatches, onQrHit || onDetails);
  const ordered = sortable ? sortRows(filtered, sortKey) : filtered;
  const shown = preview ? ordered.slice(0, pageSize) : ordered;

  return (
    <div className="sc-card">
      <div className="sc-card-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="sc-page-sub" style={{ margin: 0 }}>{subtitle}</p>}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {sortable && <SelectField label="Sort by" value={sortKey} onChange={setSortKey} options={SORT_OPTIONS} />}
          {headRight}
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
        statusOptions={statusOptions}
        range={range}
        setRange={setRange}
        qr={qr}
        onQrCode={lookup.handle}
      />
      {lookup.note && <p className="sc-qr-note sc-qr-note--warn">{lookup.note}</p>}

      {loading && rows.length === 0 && <p className="sc-page-sub">Loading batches from the chain...</p>}
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
      {!(loading && rows.length === 0) && (
        <BatchTable
          rows={shown}
          columns={columns}
          onDetails={onDetails}
          pageSize={preview ? 999 : pageSize}
          renderActions={renderActions}
          actionsLabel={actionsLabel}
          emptyTitle={rows.length === 0 ? emptyTitle || "No batches yet" : "No matching batches"}
          emptyText={rows.length === 0 ? emptyText : "Try a different search, status or date range."}
        />
      )}
    </div>
  );
}
