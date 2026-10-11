import { useEffect, useState } from "react";
import { getReadOnlyContract, getProvider } from "../contract";
import Icon from "./icons";
import { formatBlockchainTime } from "../utils";

// The original Welcome screen's Positive / Negative rating totals (given
// by the next participant in the chain) and the list behind each total —
// same contract reads, restyled.
export default function PartnerRatings({ walletAddress }) {
  const [stats, setStats] = useState(null);
  const [list, setList] = useState(null); // { kind, entries }
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const contract = getReadOnlyContract();
        const [positive, negative] = await Promise.all([
          contract.positiveRatingsReceived(walletAddress),
          contract.negativeRatingsReceived(walletAddress),
        ]);
        if (!cancelled) setStats({ positive: Number(positive), negative: Number(negative) });
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  const show = async (kind) => {
    setLoading(true);
    setList(null);
    try {
      const contract = getReadOnlyContract();
      const provider = getProvider();
      const logs = await contract.queryFilter(contract.filters.ParticipantRated(null, null, walletAddress), 0, "latest");
      const filtered = logs.filter((l) => l.args.positive === (kind === "positive"));
      const entries = await Promise.all(
        filtered.map(async (l) => {
          const [block, batch] = await Promise.all([provider.getBlock(l.blockNumber), contract.getBatch(l.args.id)]);
          return { rater: l.args.rater, batchCode: batch.batchCode, timestamp: block.timestamp };
        })
      );
      entries.sort((a, b) => b.timestamp - a.timestamp);
      setList({ kind, entries });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!stats) return null;
  return (
    <div className="sc-card">
      <div className="sc-card-head">
        <h2>Partner ratings</h2>
        <span className="sc-page-sub" style={{ margin: 0 }}>Given by the next participant who received your batches</span>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="sc-btn" onClick={() => show("positive")}>
          <Icon name="thumbUp" size={16} /> Positive ({stats.positive})
        </button>
        <button type="button" className="sc-btn" onClick={() => show("negative")}>
          <Icon name="thumbDown" size={16} /> Negative ({stats.negative})
        </button>
      </div>
      {loading && <p className="sc-note">Loading...</p>}
      {list && !loading && (
        <div style={{ marginTop: 14 }}>
          <h3 style={{ marginBottom: 8 }}>{list.kind === "positive" ? "Positive" : "Negative"} ratings received</h3>
          {list.entries.length === 0 && <p className="sc-page-sub">No {list.kind} ratings yet.</p>}
          {list.entries.map((e, i) => (
            <div key={i} className="sc-detail-row">
              <span>{e.batchCode}</span>
              <span>
                {formatBlockchainTime(e.timestamp)}
                <small style={{ display: "block", color: "#94a3b8", fontWeight: 400 }}>{e.rater}</small>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
