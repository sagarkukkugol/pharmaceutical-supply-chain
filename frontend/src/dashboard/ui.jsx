import { useEffect, useRef } from "react";
import Icon, { IconCircle } from "./icons";
import { QRScanUpload } from "../components/BatchCodeInput";
import { DATE_PRESETS } from "./roleConfig";
import { usePaged } from "./tableHelpers";

// ============================================================
// Shared presentational pieces — every role page is assembled from
// these, so header/cards/tables/search/modals look identical everywhere.
// ============================================================

export function StatusBadge({ status, tone }) {
  return <span className={`sc-status sc-status--${tone || "gray"}`}>{status}</span>;
}

export function KpiCard({ label, value, icon, hint }) {
  return (
    <div className="sc-card sc-kpi">
      <IconCircle name={icon} size="lg" />
      <div>
        <div className="sc-kpi-label">{label}</div>
        <div className="sc-kpi-value">{value}</div>
        {hint && <div className="sc-kpi-hint">{hint}</div>}
      </div>
    </div>
  );
}

export function PageHead({ title, subtitle, children }) {
  return (
    <div className="sc-page-head" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="sc-page-sub">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ icon = "package", title, children }) {
  return (
    <div className="sc-empty">
      <IconCircle name={icon} size="lg" />
      <strong>{title}</strong>
      {children && <div>{children}</div>}
    </div>
  );
}

// ---------- modal ----------
export function Modal({ title, onClose, children, wide = false, labelledBy = "sc-modal-title" }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="sc-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sc-modal${wide ? " sc-modal--wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <div className="sc-modal-head">
          <h2 id={labelledBy}>{title}</h2>
          <button type="button" className="sc-icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------- donut ----------
const TONE_COLOR = { green: "#15803d", blue: "#1d4ed8", amber: "#d97706", red: "#dc2626", gray: "#94a3b8" };

export function StatusDonut({ segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="sc-status-wrap">
      <svg width="148" height="148" viewBox="0 0 148 148" role="img" aria-label={`${total} batches by status`}>
        <circle cx="74" cy="74" r={r} fill="none" stroke="#eef2f7" strokeWidth="16" />
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => {
              const len = (s.value / total) * c;
              const el = (
                <circle
                  key={s.label}
                  cx="74"
                  cy="74"
                  r={r}
                  fill="none"
                  stroke={TONE_COLOR[s.tone] || TONE_COLOR.gray}
                  strokeWidth="16"
                  strokeDasharray={`${Math.max(len - 2, 0.5)} ${c}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 74 74)"
                />
              );
              offset += len;
              return el;
            })}
        <text x="74" y="72" textAnchor="middle" fontSize="26" fontWeight="700" fill="#0f172a">
          {total}
        </text>
        <text x="74" y="92" textAnchor="middle" fontSize="11" fill="#64748b">
          batches
        </text>
      </svg>
      <ul className="sc-legend">
        {segments.map((s) => (
          <li key={s.label}>
            <span className="sc-swatch" style={{ background: TONE_COLOR[s.tone] || TONE_COLOR.gray }} />
            {s.label}
            <span className="sc-legend-val">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- activity list ----------
export function ActivityList({ items, onOpen, timeAgoFn, empty = "No activity yet." }) {
  if (!items.length) return <EmptyState icon="history" title={empty} />;
  return (
    <ul className="sc-activity">
      {items.map((n) => (
        <li key={n.id}>
          <IconCircle name={n.icon} size="sm" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="sc-activity-title">{n.title}</div>
            <div className="sc-activity-meta">
              {n.displayId} · {n.productName} · Code: {n.batchCode}
            </div>
            {n.detail && <div className="sc-activity-meta">{n.detail}</div>}
            <div className="sc-activity-time">{timeAgoFn(n.ts)}</div>
          </div>
          {onOpen && (
            <button type="button" className="sc-details-link" onClick={() => onOpen(n)} aria-label={`Open ${n.displayId}`}>
              <Icon name="chevronRight" size={16} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

// ============================================================
// Search + QR toolbar
// ============================================================
// The search box filters by Batch ID / Product ID / Product Code /
// Product Name (partial matches). "Scan QR" and "Upload QR" are the
// EXISTING QRScanUpload scanner + image decoder (the same one the
// Customer Verification page uses): the decoded batch code is simply
// dropped into the search box and the page filters to it. The QR data
// format is unchanged.
export function BatchToolbar({
  query,
  setQuery,
  status,
  setStatus,
  statusOptions,
  range,
  setRange,
  placeholder = "Search by batch ID, product name, or product code...",
  onQrCode,
  qr = true,
}) {
  const source = useRef("scan");
  const inner = (qrApi) => (
    <div className="sc-toolbar">
      <label className="sc-search">
        <Icon name="search" size={16} />
        <input
          className="sc-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label="Search batches"
        />
      </label>
      {statusOptions && (
        <select className="sc-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}
      {range !== undefined && (
        <select className="sc-select" value={range} onChange={(e) => setRange(e.target.value)} aria-label="Filter by date">
          {DATE_PRESETS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      )}
      {qrApi && (
        <>
          <button
            type="button"
            className="sc-btn"
            onClick={() => {
              source.current = "scan";
              qrApi.openScanner();
            }}
          >
            <Icon name="qr" size={16} /> Scan QR
          </button>
          <button
            type="button"
            className="sc-btn"
            disabled={qrApi.decoding}
            onClick={() => {
              source.current = "upload";
              qrApi.openUpload();
            }}
          >
            <Icon name="upload" size={16} /> {qrApi.decoding ? "Reading..." : "Upload QR"}
          </button>
        </>
      )}
    </div>
  );
  if (!qr) return inner(null);
  return (
    <QRScanUpload
      onCode={(code) => {
        setQuery(code);
        onQrCode?.(code, source.current);
      }}
    >
      {(api) => inner(api)}
    </QRScanUpload>
  );
}

export function Pager({ page, pages, setPage, total, pageSize }) {
  if (total <= pageSize) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="sc-pager">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <span style={{ display: "flex", gap: 8 }}>
        <button type="button" className="sc-btn sc-btn--sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <button type="button" className="sc-btn sc-btn--sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
          Next
        </button>
      </span>
    </div>
  );
}


// ============================================================
// Table
// ============================================================
export function BatchTable({ rows, columns, onDetails, emptyTitle = "No batches found", emptyText, pageSize = 10, renderActions, actionsLabel = "Actions" }) {
  const { page, setPage, pages, slice, total } = usePaged(rows, pageSize);
  if (!rows.length) return <EmptyState icon="package" title={emptyTitle}>{emptyText}</EmptyState>;
  return (
    <>
      <div className="sc-table-wrap">
        <table className="sc-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              {renderActions && <th>{actionsLabel}</th>}
              {onDetails && <th>Details</th>}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr key={r.id}>
                {columns.map((c) => (
                  <td key={c.key} className={c.className}>
                    {c.render(r)}
                  </td>
                ))}
                {renderActions && <td>{renderActions(r)}</td>}
                {onDetails && (
                  <td>
                    <button type="button" className="sc-details-link" onClick={() => onDetails(r)}>
                      Details <Icon name="arrowRight" size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={pages} setPage={setPage} total={total} pageSize={pageSize} />
    </>
  );
}

export function SelectField({ label, value, onChange, options }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748b" }}>
      {label}
      <select className="sc-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
