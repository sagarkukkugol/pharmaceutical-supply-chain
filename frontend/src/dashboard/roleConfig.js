// Per-role configuration: sidebar, copy, where notifications deep-link.
// The existing role/auth system (session.role) stays the source of truth;
// this only decides what each role's UI shows.

export const ROLE_CONFIG = {
  Manufacturer: {
    nav: [
      { key: "dashboard", label: "Dashboard", icon: "dashboard" },
      { key: "register", label: "Register Batch", icon: "documentPlus" },
      { key: "registered", label: "Registered Batches", icon: "package" },
      { key: "transfer", label: "Ownership Transfer", icon: "transfer" },
      { key: "history", label: "Batch History", icon: "history" },
    ],
    blurb:
      "Register new pharmaceutical batches on the blockchain, hand them to a transporter, and follow every batch until it reaches a patient.",
    tags: ["Batch registration", "Cold-chain ranges", "QR labelling"],
    art: "factory",
    previewTitle: "Recent Batches",
    listPage: "registered",
  },
  Transporter: {
    nav: [
      { key: "dashboard", label: "Dashboard", icon: "dashboard" },
      { key: "shipments", label: "Active Shipments", icon: "truck" },
      { key: "shipment-history", label: "Shipment History", icon: "history" },
    ],
    blurb:
      "Collect batches from manufacturers, keep them within their safe temperature range in transit, and hand them to a distributor.",
    tags: ["Pickup & transit", "Temperature log", "Hand-off to distributor"],
    art: "truck",
    previewTitle: "Assigned Batches",
    listPage: "shipments",
  },
  Distributor: {
    nav: [
      { key: "dashboard", label: "Dashboard", icon: "dashboard" },
      { key: "received", label: "Received Batches", icon: "package" },
      { key: "inventory", label: "Inventory", icon: "archive" },
      { key: "dispatch", label: "Dispatch to Pharmacy", icon: "send" },
      { key: "history", label: "Batch History", icon: "history" },
    ],
    blurb:
      "Receive batches from transporters, manage inventory, and dispatch stock to authorised pharmacies with a verifiable chain of custody.",
    tags: ["Inventory", "Pharmacy dispatch", "Chain of custody"],
    art: "warehouse",
    previewTitle: "Received Batches",
    listPage: "received",
  },
  Pharmacy: {
    nav: [
      { key: "dashboard", label: "Dashboard", icon: "dashboard" },
      { key: "received", label: "Received Batches", icon: "package" },
      { key: "stock", label: "Stock & Sales", icon: "chart" },
      { key: "verify", label: "Batch Verification", icon: "shield" },
      { key: "history", label: "Batch History", icon: "history" },
    ],
    blurb:
      "Receive batches from distributors, verify authenticity before dispensing, and record dispensing against each batch.",
    tags: ["Stock & sales", "Batch verification", "Dispensing record"],
    art: "pharmacy",
    previewTitle: "Received Batches",
    listPage: "received",
  },
};

export const CONSUMER_NAV = [{ key: "verify", label: "Verify Medicine", icon: "shield" }];

export const DATE_PRESETS = [
  { key: "all", label: "All time", days: null },
  { key: "7", label: "Last 7 days", days: 7 },
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
];
