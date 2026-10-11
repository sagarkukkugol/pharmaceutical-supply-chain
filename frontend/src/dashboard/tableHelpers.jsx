import { useMemo, useState } from "react";
import { DATE_PRESETS } from "./roleConfig";
import { StatusBadge } from "./ui";
import { formatDateOnly } from "../utils";

// ============================================================
// Filtering + paging
// ============================================================
export function matchesQuery(row, q) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [row.displayId, row.id, row.batchCode, row.productName, row.manufacturerName]
    .filter((x) => x !== undefined && x !== null)
    .map((x) => String(x).toLowerCase());
  if (hay.some((h) => h.includes(needle))) return true;
  // "BCH5" / "bch 005" -> numeric id 5
  const m = needle.replace(/\s+/g, "").match(/^bch0*(\d+)$/);
  return !!m && String(row.id) === m[1];
}

export function useRowFilter(rows, { dateKey = "primaryDate", withStatus = true, withRange = true } = {}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [range, setRange] = useState("all");
  const [nowSec] = useState(() => Date.now() / 1000);
  const filtered = useMemo(() => {
    const preset = DATE_PRESETS.find((p) => p.key === range);
    const cutoff = preset?.days ? nowSec - preset.days * 86400 : null;
    return rows.filter(
      (r) =>
        matchesQuery(r, query) &&
        (!withStatus || status === "all" || r.status === status) &&
        (!withRange || cutoff === null || Number(r[dateKey]) >= cutoff)
    );
  }, [rows, query, status, range, dateKey, withStatus, withRange, nowSec]);
  return { query, setQuery, status, setStatus, range, setRange, filtered };
}

export function usePaged(rows, pageSize) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safe = Math.min(page, pages - 1);
  const slice = rows.slice(safe * pageSize, safe * pageSize + pageSize);
  return { page: safe, setPage, pages, slice, total: rows.length };
}

// ---------- reusable column builders ----------
const date = (v) => formatDateOnly(v);
export const COL = {
  batchId: { key: "batchId", label: "Batch ID", className: "sc-cell-strong", render: (r) => r.displayId },
  productCode: { key: "code", label: "Product Code", className: "sc-cell-nowrap", render: (r) => r.batchCode },
  productName: { key: "name", label: "Product Name", render: (r) => r.productName },
  quantity: { key: "qty", label: "Quantity", className: "sc-cell-nowrap", render: (r) => r.quantity.toLocaleString() },
  availableQty: { key: "avail", label: "Available Quantity", className: "sc-cell-nowrap", render: (r) => (r.availableQty ?? 0).toLocaleString() },
  mfgDate: { key: "mfg", label: "Manufacture Date", className: "sc-cell-nowrap", render: (r) => date(r.manufactureDate) },
  expiry: { key: "exp", label: "Expiry Date", className: "sc-cell-nowrap", render: (r) => date(r.expiryDate) },
  temp: { key: "temp", label: "Temperature Range", className: "sc-cell-nowrap", render: (r) => r.tempText },
  manufacturer: { key: "mfr", label: "Manufacturer", render: (r) => r.manufacturerName || "—" },
  owner: { key: "owner", label: "Current Owner", render: (r) => r.currentOwnerName || "—" },
  receivedDate: { key: "recv", label: "Received Date", className: "sc-cell-nowrap", render: (r) => date(r.receivedAt) },
  registeredDate: { key: "reg", label: "Registered", className: "sc-cell-nowrap", render: (r) => date(r.createdAt) },
  receivedFrom: { key: "from", label: "Received From", render: (r) => r.receivedFromName || "—" },
  status: { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} tone={r.statusTone} /> },
};

export function useQrLookup(rows, allBatches, open) {
  const [note, setNote] = useState("");
  const handle = (code, source) => {
    const needle = code.trim().toLowerCase();
    const hit = rows.find((r) => r.batchCode.toLowerCase() === needle || r.displayId.toLowerCase() === needle || r.id === needle);
    if (hit) {
      setNote("");
      if (source === "upload") open(hit);
    } else {
      const known = allBatches.find((b) => b.batchCode.toLowerCase() === needle);
      setNote(
        known
          ? `Batch ${known.batchCode} exists on the blockchain but is not in your records on this page.`
          : `No batch matching "${code}" was found on the blockchain.`
      );
    }
  };
  return { note, setNote, handle };
}
