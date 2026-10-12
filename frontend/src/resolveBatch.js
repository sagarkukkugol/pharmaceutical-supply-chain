import { getUserByAddress, listBatchMeta } from "./api";
import { parseBatchIdInput, makeBatchId, isBatchIdFormat, withSequence } from "./utils";

// Turns whatever a person types or scans into the numeric on-chain id.
// Accepts: numeric id ("5"), legacy "BCH005", product code ("dolo_450"),
// or the generated Batch ID ("cipdo101026").
export async function resolveBatchId(contract, input) {
  const trimmed = (input || "").trim();
  if (!trimmed) throw new Error("Please enter a batch ID or product code.");

  const numeric = parseBatchIdInput(trimmed);
  if (numeric) return numeric;

  const byCode = await contract.getIdByCode(trimmed);
  if (byCode.toString() !== "0") return byCode.toString();

  // New-style Batch IDs are stored upper-case; accept any casing.
  if (isBatchIdFormat(trimmed.toUpperCase()) && trimmed !== trimmed.toUpperCase()) {
    const upper = await contract.getIdByCode(trimmed.toUpperCase());
    if (upper.toString() !== "0") return upper.toString();
  }

  // A Product Code can be shared by several batches, so it can't pick ONE
  // batch — tell the person which Batch IDs exist instead of guessing.
  try {
    const metas = (await listBatchMeta()).filter((m) => (m.productCode || "").toLowerCase() === trimmed.toLowerCase());
    if (metas.length > 0) {
      const shown = metas.slice(0, 5).map((m) => m.batchId).join(", ");
      throw new Error(
        `"${trimmed}" is a Product Code used by ${metas.length} batch${metas.length === 1 ? "" : "es"}. Enter a specific Batch ID, e.g. ${shown}.`
      );
    }
  } catch (e) {
    if (String(e.message).includes("Product Code used by")) throw e;
  }

  // Not a product code — try the generated Batch ID (case-insensitive).
  const wanted = trimmed.toLowerCase();
  const count = Number(await contract.batchCount());
  const ids = Array.from({ length: count }, (_, i) => i + 1);
  const batches = await Promise.all(ids.map((id) => contract.getBatch(id)));
  const names = new Map();
  await Promise.all(
    [...new Set(batches.map((b) => b.manufacturer))].map(async (a) => {
      try {
        names.set(a, (await getUserByAddress(a))?.username || "");
      } catch {
        names.set(a, "");
      }
    })
  );
  const matches = batches.filter(
    (b) => makeBatchId(names.get(b.manufacturer), b.batchCode, Number(b.createdAt)) === wanted
  );
  if (matches.length === 0) throw new Error("Batch does not exist");
  if (matches.length > 1) {
    throw new Error("More than one batch shares this Batch ID. Please use the product code instead.");
  }
  return matches[0].id.toString();
}

// Next free Batch ID for a prefix such as "LUP-HY-12102026-": tries 01, 02,
// 03 ... and returns the first one that is not on the blockchain yet.
export async function nextFreeBatchId(contract, prefix) {
  for (let n = 1; n < 1000; n++) {
    const candidate = withSequence(prefix, n);
    const id = await contract.getIdByCode(candidate);
    if (id.toString() === "0") return candidate;
  }
  throw new Error("Could not find a free Batch ID.");
}
