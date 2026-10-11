import { getUserByAddress } from "./api";
import { parseBatchIdInput, makeBatchId } from "./utils";

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
