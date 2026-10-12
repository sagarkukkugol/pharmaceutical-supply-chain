import { useCallback, useEffect, useRef, useState } from "react";
import { getReadOnlyContract, getProvider } from "../contract";
import { getUserByAddress, getTemperatureInfo, listExpiryReports, listBatchMeta } from "../api";
import { batchDisplayId, makeBatchId, isBatchIdFormat, DELIVERY_STATUS_LABELS } from "../utils";

// ============================================================
// useChainData
// ============================================================
// One read-only pass over the deployed SupplyChain contract: every batch
// (getBatch), every event (BatchRegistered, OwnershipTransferred,
// DeliveryStatusUpdated, RatingSubmitted), the participant directory
// (existing /users/by-address API) and the off-chain temperature ranges
// (existing /temperature API). Nothing here writes anything — it only
// normalises the data the existing app already reads, so the dashboards,
// KPI cards, notifications and tables all share one source of truth.

const blockTimeCache = new Map(); // blockNumber -> unix seconds
const userCache = new Map(); // lower-case address -> user | null

async function blockTime(provider, blockNumber) {
  if (!blockTimeCache.has(blockNumber)) {
    const block = await provider.getBlock(blockNumber);
    blockTimeCache.set(blockNumber, block?.timestamp ?? 0);
  }
  return blockTimeCache.get(blockNumber);
}

async function lookupUser(address) {
  const k = (address || "").toLowerCase();
  if (!k) return null;
  if (!userCache.has(k)) {
    userCache.set(k, await getUserByAddress(address));
  }
  return userCache.get(k);
}

// Forget directory lookups that came back empty so a user who signs up
// later gets resolved on the next refresh.
function dropMissingUsers() {
  for (const [k, v] of userCache) if (v === null) userCache.delete(k);
}

const ZERO = "0x0000000000000000000000000000000000000000";

export async function fetchChainData() {
  const contract = getReadOnlyContract();
  const provider = getProvider();
  dropMissingUsers();

  const count = Number(await contract.batchCount());
  const ids = Array.from({ length: count }, (_, i) => i + 1);

  const [rawBatches, registered, transferred, delivered, rated] = await Promise.all([
    Promise.all(ids.map((id) => contract.getBatch(id))),
    contract.queryFilter(contract.filters.BatchRegistered(), 0, "latest"),
    contract.queryFilter(contract.filters.OwnershipTransferred(), 0, "latest"),
    contract.queryFilter(contract.filters.DeliveryStatusUpdated(), 0, "latest"),
    contract.queryFilter(contract.filters.RatingSubmitted(), 0, "latest"),
  ]);

  const logs = [...registered, ...transferred, ...delivered, ...rated];
  const blocks = [...new Set(logs.map((l) => l.blockNumber))];
  await Promise.all(blocks.map((b) => blockTime(provider, b)));

  const events = logs
    .map((log) => ({
      type: log.eventName,
      batchId: log.args.id.toString(),
      from: log.args.from ?? null,
      to: log.args.to ?? log.args.owner ?? log.args.pharmacy ?? null,
      status: log.args.status !== undefined ? Number(log.args.status) : null,
      rating: log.args.rating !== undefined ? Number(log.args.rating) : null,
      name: log.args.name ?? null,
      city: log.args.city ?? null,
      feedback: log.args.feedback ?? null,
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      logIndex: log.index,
      timestamp: blockTimeCache.get(log.blockNumber) || 0,
    }))
    .sort((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex);

  const addresses = new Set();
  rawBatches.forEach((b) => {
    addresses.add(b.manufacturer);
    addresses.add(b.currentOwner);
  });
  events.forEach((e) => {
    if (e.from) addresses.add(e.from);
    if (e.to) addresses.add(e.to);
  });
  await Promise.all([...addresses].map((a) => lookupUser(a)));
  const user = (a) => userCache.get((a || "").toLowerCase()) || null;

  const temps = await Promise.all(rawBatches.map((b) => getTemperatureInfo(b.batchCode)));
  const reportList = await listExpiryReports();
  const metaList = await listBatchMeta();
  const productCodeById = new Map((metaList || []).map((m) => [m.batchId, m.productCode]));
  const reportByCode = new Map((reportList || []).map((r) => [r.batchCode, r]));

  const now = Date.now() / 1000;
  const batches = rawBatches.map((b, i) => {
    const id = b.id.toString();
    const evs = events.filter((e) => e.batchId === id);
    const transfers = evs.filter((e) => e.type === "OwnershipTransferred");
    const registeredEv = evs.find((e) => e.type === "BatchRegistered");
    const ratingCount = Number(b.ratingCount);
    const temp = temps[i];
    const manufacturerUser = user(b.manufacturer);
    const ownerUser = user(b.currentOwner);
    const expiryDate = Number(b.expiryDate);
    const deliveryStatus = Number(b.deliveryStatus);
    return {
      id,
      // New batches: the on-chain batchCode IS the Batch ID and the Product
      // Code comes from /batch-meta. Older batches: batchCode is the Product
      // Code and the Batch ID is derived exactly as before.
      displayId: isBatchIdFormat(b.batchCode)
        ? b.batchCode
        : manufacturerUser?.username
          ? makeBatchId(manufacturerUser.username, b.batchCode, registeredEv?.timestamp || Number(b.createdAt))
          : batchDisplayId(id),
      productCode: isBatchIdFormat(b.batchCode) ? productCodeById.get(b.batchCode) || "—" : b.batchCode,
      batchCode: b.batchCode,
      productName: b.productName,
      quantity: Number(b.quantity),
      manufacturer: b.manufacturer,
      manufacturerName: manufacturerUser?.username || null,
      manufacturerCity: manufacturerUser?.city || null,
      currentOwner: b.currentOwner,
      currentOwnerName: ownerUser?.username || null,
      currentOwnerRole: ownerUser?.role || null,
      currentOwnerCity: ownerUser?.city || null,
      lastTransferFrom: b.lastTransferFrom === ZERO ? null : b.lastTransferFrom,
      createdAt: registeredEv?.timestamp || Number(b.createdAt),
      manufactureDate: Number(b.manufactureDate),
      expiryDate,
      isExpired: expiryDate > 0 && now > expiryDate,
      deliveryStatus,
      deliveryLabel: DELIVERY_STATUS_LABELS[deliveryStatus],
      ratingCount,
      avgRating: ratingCount > 0 ? Number(b.ratingSum) / ratingCount : null,
      temp: temp ? { min: temp.min, max: temp.max, readings: temp.readings || [] } : null,
      tempText: temp ? `${temp.min}°C – ${temp.max}°C` : "—",
      expiryReport: deliveryStatus === 2 ? reportByCode.get(b.batchCode) || null : null,
      events: evs,
      transfers,
      lastEvent: evs[evs.length - 1] || null,
    };
  });

  // "Last Action" in plain words, same wording as the original tables.
  for (const b of batches) {
    const e = b.lastEvent;
    if (!e) {
      b.lastAction = "—";
      continue;
    }
    if (e.type === "BatchRegistered") b.lastAction = "Registered by Manufacturer";
    else if (e.type === "OwnershipTransferred") {
      const f = user(e.from)?.role;
      const t = user(e.to)?.role;
      b.lastAction = `${f ? "Shipped from " + f : "Shipped"} → ${t ? "Received by " + t : "Received"}`;
    } else if (e.type === "DeliveryStatusUpdated") {
      b.lastAction = e.status === 1 ? "Delivered by Pharmacy" : "Marked Not Delivered";
    } else if (e.type === "RatingSubmitted") b.lastAction = `Rated by Consumer (${e.rating}★)`;
    else b.lastAction = "—";
  }

  const userOf = (a) => user(a);
  return { batches, events, userOf, fetchedAt: Date.now() };
}

export function useChainData({ pollMs = 20000 } = {}) {
  const [state, setState] = useState({
    batches: [],
    events: [],
    userOf: () => null,
    loading: true,
    error: "",
    fetchedAt: 0,
  });
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const rerun = useRef(false);

  const refresh = useCallback(async () => {
    // A refresh requested while one is running (e.g. right after a
    // transaction) is queued, so the newest chain state is never missed.
    if (inFlight.current) {
      rerun.current = true;
      return;
    }
    inFlight.current = true;
    try {
      do {
        rerun.current = false;
        try {
          const data = await fetchChainData();
          if (mounted.current) setState({ ...data, loading: false, error: "" });
        } catch (err) {
          console.error(err);
          if (mounted.current) {
            setState((s) => ({
              ...s,
              loading: false,
              error: "Could not read batches from the blockchain. Is the local node running?",
            }));
          }
        }
      } while (rerun.current && mounted.current);
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    Promise.resolve().then(refresh);
    const t = setInterval(refresh, pollMs);
    return () => {
      mounted.current = false;
      clearInterval(t);
    };
  }, [refresh, pollMs]);

  return { ...state, refresh };
}
