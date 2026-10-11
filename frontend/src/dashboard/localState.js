// Small per-wallet, per-browser conveniences kept in localStorage:
//  - shipment checkpoints a Transporter records (Picked Up / In Transit).
//    The smart contract has no pickup or transit state — ownership
//    transfer to the Transporter is the assignment, and transfer to the
//    Distributor is the delivery — so these two steps are logged on this
//    device only and are never presented as blockchain transactions.
//  - which notifications the user has already read
//  - pharmacy verification log (verification is a read, so there is no
//    on-chain event to derive it from)
// Every access is wrapped: storage can be empty, blocked or throw.

const key = (name, wallet) => `sc.${name}.${(wallet || "").toLowerCase()}`;

function read(k, fallback) {
  try {
    const raw = window.localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write(k, value) {
  try {
    window.localStorage.setItem(k, JSON.stringify(value));
  } catch {
    // ignore — the UI still works for this session via React state
  }
}

export function loadLocalState(wallet) {
  let firstSeen = read(key("firstSeen", wallet), null);
  if (!firstSeen) {
    firstSeen = Date.now();
    write(key("firstSeen", wallet), firstSeen);
  }
  return {
    shipments: read(key("shipments", wallet), {}), // { [batchId]: { state, pickedAt, transitAt } }
    verifications: read(key("verifications", wallet), []), // [{ batchId, batchCode, productName, at }]
    readIds: read(key("readIds", wallet), []),
    firstSeen,
  };
}

export function saveShipments(wallet, shipments) {
  write(key("shipments", wallet), shipments);
}
export function saveVerifications(wallet, list) {
  write(key("verifications", wallet), list.slice(-100));
}
export function saveReadIds(wallet, ids) {
  write(key("readIds", wallet), ids.slice(-500));
}
