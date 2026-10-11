import { COL } from "./tableHelpers";

const pickup = { key: "pickup", label: "Pickup Location", render: (r) => r.pickupLocation };
const delivery = { key: "delivery", label: "Delivery Location", render: (r) => r.deliveryLocation };
const distributor = { key: "dist", label: "Distributor", render: (r) => r.receivedFromName || "—" };
const dispensed = { key: "disp", label: "Dispensed Quantity", className: "sc-cell-nowrap", render: (r) => (r.dispensedQty ?? 0).toLocaleString() };
const lastAction = { key: "last", label: "Last Action", render: (r) => r.lastAction || "—" };
const assigned = { key: "assigned", label: "Assigned Date", className: "sc-cell-nowrap", render: (r) => COL.receivedDate.render(r) };
const handedOn = { key: "handed", label: "Delivered On", className: "sc-cell-nowrap", render: (r) => COL.receivedDate.render({ receivedAt: r.forwardedAt }) };
const deliveredTo = { key: "to", label: "Delivered To", render: (r) => r.forwardedToName || "—" };
const stockStatus = { ...COL.status, label: "Stock Status" };

export const PREVIEW_COLUMNS = {
  Manufacturer: [COL.batchId, COL.productCode, COL.productName, COL.quantity, COL.mfgDate, COL.expiry, COL.status],
  Transporter: [COL.batchId, COL.productCode, COL.productName, COL.quantity, pickup, delivery, COL.status],
  Distributor: [COL.batchId, COL.productCode, COL.productName, COL.quantity, COL.manufacturer, COL.receivedDate, COL.status],
  Pharmacy: [COL.batchId, COL.productCode, COL.productName, COL.quantity, distributor, COL.receivedDate, COL.status],
};

export const PAGE_COLUMNS = {
  registered: [COL.batchId, COL.productCode, COL.productName, COL.quantity, COL.mfgDate, COL.expiry, COL.temp, COL.owner, COL.status],
  distributorReceived: [COL.batchId, COL.productCode, COL.productName, COL.quantity, COL.manufacturer, COL.owner, COL.receivedDate, COL.expiry, COL.temp, COL.status],
  inventory: [COL.productName, COL.productCode, COL.batchId, COL.availableQty, COL.expiry, COL.temp, COL.status],
  pharmacyReceived: [COL.batchId, COL.productCode, COL.productName, COL.quantity, distributor, COL.receivedDate, COL.expiry, COL.temp, COL.status],
  stock: [COL.productName, COL.productCode, COL.batchId, COL.availableQty, dispensed, COL.expiry, stockStatus],
  shipmentHistory: [COL.batchId, COL.productCode, COL.productName, COL.quantity, pickup, deliveredTo, assigned, handedOn, COL.status],
  history: [COL.batchId, COL.productCode, COL.productName, COL.quantity, lastAction, COL.status],
  select: [COL.batchId, COL.productCode, COL.productName, COL.quantity, COL.expiry, COL.temp, COL.status],
};
