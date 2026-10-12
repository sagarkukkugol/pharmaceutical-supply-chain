import { batchDisplayId } from "../utils";

// Pure functions that turn the normalised chain data into what each role
// sees: its rows + derived status, KPI numbers, status overview segments
// and notification/activity feed. No fetching, no mock data.

export const LOW_STOCK_UNITS = 100; // pharmacy: in-stock batches at or below this are "Low Stock"

const eq = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

const place = (u) => (u ? [u.username, u.city].filter(Boolean).join(", ") : null);

function receivedTransfer(b, wallet) {
  return b.transfers.find((t) => eq(t.to, wallet)) || null;
}
function forwardedTransfer(b, wallet) {
  return b.transfers.find((t) => eq(t.from, wallet)) || null;
}

const STATUS_ORDER = {
  Manufacturer: ["Delivered", "In Transit", "Pending", "Not Delivered"],
  Transporter: ["Delivered", "In Transit", "Picked Up", "Pending Pickup"],
  Distributor: ["Dispatched", "In Inventory", "Expired"],
  Pharmacy: ["Dispensed", "In Stock", "Low Stock", "Not Delivered", "Expired"],
};

export const STATUS_TONE = {
  Delivered: "green",
  Dispensed: "green",
  Dispatched: "green",
  "In Transit": "blue",
  "Picked Up": "blue",
  "In Inventory": "blue",
  "In Stock": "blue",
  Pending: "amber",
  "Pending Pickup": "amber",
  "Low Stock": "amber",
  "Not Delivered": "red",
  Expired: "red",
};

export function buildRoleView({ role, wallet, batches, local, userOf }) {
  const rows = [];

  for (const b of batches) {
    if (role === "Manufacturer") {
      if (!eq(b.manufacturer, wallet)) continue;
      const mine = eq(b.currentOwner, wallet);
      let status;
      if (b.deliveryStatus === 1) status = "Delivered";
      else if (b.deliveryStatus === 2) status = "Not Delivered";
      else if (!mine) status = "In Transit";
      else status = "Pending";
      rows.push({
        ...b,
        status,
        owned: mine,
        primaryDate: b.createdAt,
        holderLabel: b.currentOwnerName || "—",
      });
      continue;
    }

    const rt = receivedTransfer(b, wallet);
    if (!rt) continue;
    const ft = forwardedTransfer(b, wallet);
    const owned = eq(b.currentOwner, wallet);
    const fromUser = userOf(rt.from);
    const toUser = ft ? userOf(ft.to) : null;
    const base = {
      ...b,
      owned,
      receivedAt: rt.timestamp,
      receivedFromName: fromUser?.username || null,
      receivedFromCity: fromUser?.city || null,
      forwardedAt: ft?.timestamp || null,
      forwardedToName: toUser?.username || null,
      primaryDate: rt.timestamp,
    };

    if (role === "Transporter") {
      const cp = local.shipments[b.id];
      let status;
      let nextAction = null;
      if (ft) status = "Delivered";
      else if (cp?.state === "transit") {
        status = "In Transit";
        nextAction = "deliver";
      } else if (cp?.state === "picked") {
        status = "Picked Up";
        nextAction = "transit";
      } else {
        status = "Pending Pickup";
        nextAction = "pickup";
      }
      rows.push({
        ...base,
        status,
        nextAction,
        pickupLocation: place(fromUser) || "—",
        deliveryLocation: ft ? place(toUser) || "Distributor" : "Awaiting distributor",
        checkpoint: cp || null,
      });
    } else if (role === "Distributor") {
      let status;
      if (ft) status = "Dispatched";
      else if (owned && b.isExpired) status = "Expired";
      else status = "In Inventory";
      rows.push({ ...base, status, availableQty: owned ? b.quantity : 0 });
    } else if (role === "Pharmacy") {
      let status;
      if (b.deliveryStatus === 1) status = "Dispensed";
      else if (b.deliveryStatus === 2) status = "Not Delivered";
      else if (owned && b.isExpired) status = "Expired";
      else if (owned && b.quantity <= LOW_STOCK_UNITS) status = "Low Stock";
      else status = "In Stock";
      rows.push({
        ...base,
        status,
        availableQty: b.deliveryStatus === 1 ? 0 : b.quantity,
        dispensedQty: b.deliveryStatus === 1 ? b.quantity : 0,
      });
    }
  }

  rows.sort((a, b) => b.primaryDate - a.primaryDate);
  rows.forEach((r) => {
    r.statusTone = STATUS_TONE[r.status] || "gray";
  });

  const count = (...names) => rows.filter((r) => names.includes(r.status)).length;
  let kpis;
  if (role === "Manufacturer") {
    kpis = [
      { key: "total", label: "Total Registered Batches", value: rows.length, icon: "package", hint: "Registered on-chain" },
      { key: "delivered", label: "Delivered", value: count("Delivered"), icon: "checkCircle", hint: "Dispensed by a pharmacy" },
      { key: "transit", label: "In Transit", value: count("In Transit"), icon: "truck", hint: "Moving through the chain" },
      { key: "pending", label: "Pending / Not Delivered", value: count("Pending", "Not Delivered"), icon: "alert", hint: "Awaiting dispatch or flagged" },
    ];
  } else if (role === "Transporter") {
    kpis = [
      { key: "total", label: "Total Assigned Batches", value: rows.length, icon: "package", hint: "Handed to you by manufacturers" },
      { key: "delivered", label: "Delivered", value: count("Delivered"), icon: "checkCircle", hint: "Handed to a distributor" },
      { key: "transit", label: "In Transit", value: count("In Transit", "Picked Up"), icon: "truck", hint: "Picked up, on the road" },
      { key: "pending", label: "Pending Pickup", value: count("Pending Pickup"), icon: "alert", hint: "Assigned, not yet collected" },
    ];
  } else if (role === "Distributor") {
    kpis = [
      { key: "total", label: "Total Received Batches", value: rows.length, icon: "package", hint: "Received from transporters" },
      { key: "dispatched", label: "Dispatched to Pharmacy", value: count("Dispatched"), icon: "send", hint: "Ownership moved to a pharmacy" },
      { key: "inventory", label: "In Inventory", value: rows.filter((r) => r.owned).length, icon: "archive", hint: "Currently in your custody" },
      { key: "pending", label: "Pending Dispatch", value: count("In Inventory"), icon: "alert", hint: "In date and ready to dispatch" },
    ];
  } else {
    kpis = [
      { key: "total", label: "Total Received Batches", value: rows.length, icon: "package", hint: "Received from distributors" },
      { key: "stock", label: "In Stock", value: count("In Stock", "Low Stock"), icon: "archive", hint: "Available to dispense" },
      { key: "dispensed", label: "Dispensed", value: count("Dispensed"), icon: "checkCircle", hint: "Marked delivered to patients" },
      { key: "low", label: "Low Stock", value: count("Low Stock"), icon: "alert", hint: `At or below ${LOW_STOCK_UNITS} units` },
    ];
  }

  const overview = (STATUS_ORDER[role] || []).map((label) => ({
    label,
    value: rows.filter((r) => r.status === label).length,
    tone: STATUS_TONE[label] || "gray",
  }));

  return { rows, kpis, overview };
}

// ------------------------------------------------------------
// Notifications / recent activity — generated from the same chain
// events, plus the user's own local checkpoints and verification log.
// ------------------------------------------------------------
export function buildNotifications({ role, wallet, batches, events, local, userOf }) {
  const byId = new Map(batches.map((b) => [b.id, b]));
  const out = [];
  const listPage = role === "Manufacturer" ? "registered" : role === "Transporter" ? "shipments" : "received";

  const push = (n) => out.push({ ...n, batchCode: n.batch.batchCode, productCode: n.batch.productCode, productName: n.batch.productName, displayId: n.batch.displayId });
  const nameOf = (a) => userOf(a)?.username || "another participant";
  // Expired batch rejected by a pharmacy (Not Delivered + written comment).
  const expiredNote = (b, e) =>
    e.type === "DeliveryStatusUpdated" && e.status !== 1 && b.expiryReport
      ? { icon: "alert", title: "Expired Batch Reported", detail: `${b.expiryReport.reportedBy}: "${b.expiryReport.comment}"` }
      : null;

  for (const e of events) {
    const b = byId.get(e.batchId);
    if (!b) continue;
    const base = { id: `${e.type}-${e.batchId}-${e.txHash}`, ts: e.timestamp, batch: b, nav: listPage };

    if (role === "Manufacturer" && eq(b.manufacturer, wallet)) {
      if (e.type === "BatchRegistered") push({ ...base, icon: "document", title: "Batch Registered" });
      else if (e.type === "OwnershipTransferred" && eq(e.from, wallet))
        push({ ...base, icon: "transfer", title: "Ownership Transferred", detail: `To ${nameOf(e.to)}` });
      else if (e.type === "OwnershipTransferred")
        push({ ...base, icon: "package", title: "New Batch Activity", detail: `Now with ${nameOf(e.to)}` });
      else if (e.type === "DeliveryStatusUpdated" && expiredNote(b, e)) push({ ...base, ...expiredNote(b, e) });
      else if (e.type === "DeliveryStatusUpdated")
        push({
          ...base,
          icon: e.status === 1 ? "truck" : "alert",
          title: e.status === 1 ? "Batch Delivered" : "Marked Not Delivered",
          detail: `By ${nameOf(e.to)}`,
        });
      else if (e.type === "RatingSubmitted")
        push({ ...base, icon: "star", title: "New Batch Activity", detail: `Consumer rating ${e.rating}/5` });
    } else if (role === "Transporter") {
      if (e.type === "OwnershipTransferred" && eq(e.to, wallet))
        push({ ...base, icon: "package", title: "Batch Assigned", detail: `From ${nameOf(e.from)}` });
      else if (e.type === "OwnershipTransferred" && eq(e.from, wallet))
        push({ ...base, icon: "truck", title: "Batch Delivered", detail: `To ${nameOf(e.to)}`, nav: "shipment-history" });
      else if (e.type === "DeliveryStatusUpdated" && expiredNote(b, e) && b.transfers.some((t) => eq(t.from, wallet)))
        push({ ...base, ...expiredNote(b, e), nav: "shipment-history" });
    } else if (role === "Distributor") {
      if (e.type === "OwnershipTransferred" && eq(e.to, wallet))
        push({ ...base, icon: "package", title: "Batch Received", detail: `From ${nameOf(e.from)}` });
      else if (e.type === "OwnershipTransferred" && eq(e.from, wallet))
        push({ ...base, icon: "send", title: "Batch Dispatched", detail: `To ${nameOf(e.to)}` });
      else if (e.type === "DeliveryStatusUpdated" && expiredNote(b, e) && b.transfers.some((t) => eq(t.from, wallet)))
        push({ ...base, ...expiredNote(b, e) });
      else if (e.type === "DeliveryStatusUpdated" && b.transfers.some((t) => eq(t.from, wallet)))
        push({
          ...base,
          icon: "archive",
          title: "Inventory Activity",
          detail: e.status === 1 ? "Dispensed by pharmacy" : "Marked not delivered by pharmacy",
        });
    } else if (role === "Pharmacy") {
      if (e.type === "OwnershipTransferred" && eq(e.to, wallet))
        push({ ...base, icon: "package", title: "Batch Received", detail: `From ${nameOf(e.from)}` });
      else if (e.type === "DeliveryStatusUpdated" && eq(e.to, wallet) && expiredNote(b, e))
        push({ ...base, ...expiredNote(b, e), title: "Expired Batch Rejected", detail: `Your comment: "${b.expiryReport.comment}"` });
      else if (e.type === "DeliveryStatusUpdated" && eq(e.to, wallet))
        push({
          ...base,
          icon: e.status === 1 ? "checkCircle" : "alert",
          title: e.status === 1 ? "Batch Dispensed" : "Marked Not Delivered",
        });
    }
  }

  if (role === "Transporter") {
    for (const [batchId, cp] of Object.entries(local.shipments || {})) {
      const b = byId.get(batchId);
      if (!b) continue;
      if (cp.pickedAt)
        push({
          id: `ship-${batchId}-picked-${cp.pickedAt}`,
          ts: Math.floor(cp.pickedAt / 1000),
          batch: b,
          nav: "shipments",
          icon: "check",
          title: "Batch Picked Up",
          detail: "Recorded on this device",
        });
      if (cp.transitAt)
        push({
          id: `ship-${batchId}-transit-${cp.transitAt}`,
          ts: Math.floor(cp.transitAt / 1000),
          batch: b,
          nav: "shipments",
          icon: "truck",
          title: "Shipment In Transit",
          detail: "Recorded on this device",
        });
    }
  }

  if (role === "Pharmacy") {
    for (const b of batches) {
      if (!eq(b.currentOwner, wallet) || b.deliveryStatus !== 0 || b.isExpired) continue;
      if (b.quantity <= LOW_STOCK_UNITS) {
        const rt = b.transfers.find((t) => eq(t.to, wallet));
        push({
          id: `low-${b.id}`,
          ts: rt?.timestamp || b.createdAt,
          batch: b,
          nav: "stock",
          icon: "alert",
          title: "Low Stock",
          detail: `${b.quantity} units remaining`,
        });
      }
    }
    for (const v of local.verifications || []) {
      const b = byId.get(String(v.batchId));
      if (!b) continue;
      push({
        id: `ver-${v.at}-${v.batchId}`,
        ts: Math.floor(v.at / 1000),
        batch: b,
        nav: "verify",
        icon: "shield",
        title: "Batch Verified",
        detail: "Authenticity confirmed on-chain",
      });
    }
  }

  out.sort((a, b) => b.ts - a.ts);
  return out;
}

export { batchDisplayId };
