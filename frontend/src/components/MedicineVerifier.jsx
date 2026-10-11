import { useEffect, useState } from "react";
import { getReadOnlyContract, getProvider } from "../contract";
import { getUserByAddress, getTemperatureInfo, rateBatch } from "../api";
import { INDIAN_CITIES } from "../cities";
import BatchCodeInput from "./BatchCodeInput";
import ViewQRButton from "./QRModal";
import MessageBox from "./MessageBox";
import { BatchTimelineEvents } from "./BatchTimeline";
import Icon, { IconCircle } from "../dashboard/icons";
import { resolveBatchId } from "../resolveBatch";
import { describeError, formatDateOnly, makeBatchId, batchDisplayId, DELIVERY_STATUS_LABELS } from "../utils";
import { inputStyle, labelStyle, buttonStyle } from "../styles";

// ============================================================
// MedicineVerifier — the ONE verification system.
// ============================================================
// This is the original ConsumerVerify logic (scan QR / upload QR / type a
// code -> read the batch + its full event history straight from the
// contract), moved here unchanged so it can be shown in two places:
//   - the public Consumer "Verify Medicine" page (allowRating = true)
//   - the Pharmacy "Batch Verification" page (allowRating = false)
// Reads never need MetaMask. The only write a consumer can trigger is the
// optional star rating, relayed by the backend (api.rateBatch).
const RATING_LABELS = { 1: "Poor", 2: "Fair", 3: "Good", 4: "Very Good", 5: "Excellent" };

export default function MedicineVerifier({ initialCode = "", allowRating = true, onVerified, title = "Verify Medicine", intro }) {
  const [batchCode, setBatchCode] = useState(initialCode);
  const [batch, setBatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [resolved, setResolved] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [selectedStars, setSelectedStars] = useState(0);
  const [consumerName, setConsumerName] = useState("");
  const [consumerCity, setConsumerCity] = useState("");
  const [consumerFeedback, setConsumerFeedback] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingMessage, setRatingMessage] = useState({ type: "", text: "" });
  const [hasRated, setHasRated] = useState(false);
  const [tempInfo, setTempInfo] = useState(null);

  const resolveId = (contract, input) => resolveBatchId(contract, input);

  // Shared by the initial verify AND by "refresh after rating", so the
  // new RatingSubmitted event shows up in the timeline right away.
  const loadEverything = async (codeToLoad) => {
    const contract = getReadOnlyContract();
    const provider = getProvider();

    const id = await resolveId(contract, codeToLoad);
    const data = await contract.getBatch(id);
    if (data.id.toString() === "0") {
      throw new Error("That batch code does not exist. Double-check the code on the box.");
    }

    const nowSeconds = Date.now() / 1000;
    const expiry = Number(data.expiryDate);
    const isExpired = expiry > 0 && nowSeconds > expiry;
    const daysRemaining = expiry > 0 ? Math.floor((expiry - nowSeconds) / 86400) : null;
    const ratingCount = Number(data.ratingCount);
    const ratingSum = Number(data.ratingSum);

    const [manufacturerUser, ownerUser] = await Promise.all([
      getUserByAddress(data.manufacturer),
      getUserByAddress(data.currentOwner),
    ]);

    const verified = {
      id: data.id.toString(),
      displayId: manufacturerUser?.username
        ? makeBatchId(manufacturerUser.username, data.batchCode, Number(data.createdAt))
        : batchDisplayId(data.id),
      batchCode: data.batchCode,
      productName: data.productName,
      quantity: Number(data.quantity),
      manufacturerName: manufacturerUser?.username || null,
      manufacturerCity: manufacturerUser?.city || null,
      manufacturerAddress: data.manufacturer,
      currentOwnerName: ownerUser?.username || null,
      currentOwnerRole: ownerUser?.role || null,
      manufactureDate: data.manufactureDate.toString(),
      expiryDate: data.expiryDate.toString(),
      deliveryStatus: Number(data.deliveryStatus),
      isExpired,
      daysRemaining,
      ratingCount,
      averageRating: ratingCount > 0 ? ratingSum / ratingCount : null,
    };
    setBatch(verified);

    // Full history timeline (registration, transfers, delivery, ratings).
    const [registeredLogs, transferredLogs, deliveryLogs, ratingLogs] = await Promise.all([
      contract.queryFilter(contract.filters.BatchRegistered(), 0, "latest"),
      contract.queryFilter(contract.filters.OwnershipTransferred(), 0, "latest"),
      contract.queryFilter(contract.filters.DeliveryStatusUpdated(), 0, "latest"),
      contract.queryFilter(contract.filters.RatingSubmitted(), 0, "latest"),
    ]);
    const relevant = [...registeredLogs, ...transferredLogs, ...deliveryLogs, ...ratingLogs].filter(
      (log) => log.args.id.toString() === id.toString()
    );
    const withBlocks = await Promise.all(
      relevant.map(async (log) => {
        const block = await provider.getBlock(log.blockNumber);
        return {
          type: log.eventName,
          from: log.args.from ?? null,
          to: log.args.to ?? log.args.owner ?? log.args.pharmacy ?? null,
          status: log.args.status !== undefined ? Number(log.args.status) : null,
          rating: log.args.rating !== undefined ? Number(log.args.rating) : null,
          name: log.args.name ?? null,
          city: log.args.city ?? null,
          feedback: log.args.feedback ?? null,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          timestamp: block.timestamp,
        };
      })
    );
    withBlocks.sort((a, b) => a.blockNumber - b.blockNumber);
    setEvents(withBlocks);

    const uniqueAddresses = [...new Set(withBlocks.flatMap((e) => [e.from, e.to]).filter(Boolean))];
    const lookups = await Promise.all(uniqueAddresses.map(async (addr) => [addr.toLowerCase(), await getUserByAddress(addr)]));
    setResolved(Object.fromEntries(lookups.filter(([, u]) => u !== null)));

    // Safe storage range + reading history, if one was set (404 -> null).
    setTempInfo(await getTemperatureInfo(data.batchCode));
    return verified;
  };

  // codeOverride: a code that arrives from a QR scan / upload / the home
  // page. The button click passes an event object, which falls back to
  // the typed field.
  const verify = async (codeOverride) => {
    const code = typeof codeOverride === "string" ? codeOverride : batchCode;
    setBatchCode(code);
    setMessage({ type: "", text: "" });
    setBatch(null);
    setEvents([]);
    setHasRated(false);
    setSelectedStars(0);
    setConsumerName("");
    setConsumerCity("");
    setConsumerFeedback("");
    setRatingMessage({ type: "", text: "" });
    setTempInfo(null);

    if (!code.trim()) {
      setMessage({ type: "error", text: "Please enter the batch code printed on the back of the box." });
      return;
    }
    try {
      setLoading(true);
      const verified = await loadEverything(code);
      onVerified?.(verified);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: describeError(err) });
    } finally {
      setLoading(false);
    }
  };

  // Arriving with a code already in hand (e.g. from the home page):
  // verify it straight away.
  useEffect(() => {
    if (!initialCode) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) verify(initialCode);
    });
    return () => {
      cancelled = true;
    };
    // Runs once on mount for the code that was handed in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitStarRating = async () => {
    if (!batch || !selectedStars) return;
    if (!consumerCity.trim()) {
      setRatingMessage({ type: "error", text: "Please select your city — it's required." });
      return;
    }
    setRatingLoading(true);
    setRatingMessage({ type: "pending", text: "Submitting your rating..." });
    try {
      await rateBatch(batch.batchCode, {
        rating: selectedStars,
        name: consumerName.trim(),
        city: consumerCity.trim(),
        feedback: consumerFeedback.trim(),
      });
      setRatingMessage({ type: "success", text: "Thanks - your rating and feedback have been recorded." });
      setHasRated(true);
      await loadEverything(batch.batchCode);
    } catch (err) {
      setRatingMessage({ type: "error", text: err.message || "Could not submit rating." });
    } finally {
      setRatingLoading(false);
    }
  };

  const latestReading = tempInfo?.readings?.length ? tempInfo.readings[tempInfo.readings.length - 1] : null;
  const ownerText = batch
    ? batch.currentOwnerName
      ? `${batch.currentOwnerName}${batch.currentOwnerRole ? ` (${batch.currentOwnerRole})` : ""}`
      : "—"
    : "";

  return (
    <div>
      <div className="sc-card">
        <div className="sc-card-head">
          <h2>{title}</h2>
        </div>
        <p className="sc-qr-note">
          {intro || "No account needed. Scan the QR code on the box, upload a photo of it, or type the batch code printed on the pack."}
        </p>

        <label style={labelStyle}>Batch code</label>
        <BatchCodeInput
          value={batchCode}
          onChange={setBatchCode}
          onDecoded={verify}
          placeholder="Batch code, BCH number or numeric ID"
          style={inputStyle}
          onKeyDown={(e) => e.key === "Enter" && verify()}
        />
        <button onClick={verify} disabled={loading} style={{ ...buttonStyle, width: "auto", padding: "11px 28px" }}>
          {loading ? "Checking..." : "Verify"}
        </button>
        <MessageBox message={message} />
      </div>

      {batch && (
        <>
          <div className={`sc-verdict ${batch.isExpired ? "sc-verdict--bad" : "sc-verdict--ok"}`} role="status">
            <Icon name={batch.isExpired ? "alert" : "shield"} size={30} />
            <div>
              <strong>{batch.isExpired ? "Authentic batch — but EXPIRED" : "Authentic - verified on the blockchain"}</strong>
              {batch.isExpired
                ? `This batch expired on ${formatDateOnly(batch.expiryDate)}. Do not use - return it to where you bought it.`
                : `Safe to use - valid for ${batch.daysRemaining} more day${batch.daysRemaining === 1 ? "" : "s"}, until ${formatDateOnly(batch.expiryDate)}.`}
            </div>
          </div>

          <div className="sc-card" style={{ marginTop: 20 }}>
            <div className="sc-card-head">
              <h2>Medicine details</h2>
              <ViewQRButton batchCode={batch.batchCode} className="sc-btn sc-btn--sm" label="View QR" />
            </div>
            <dl className="sc-info-grid" style={{ margin: 0 }}>
              <div><dt>Product Name</dt><dd>{batch.productName}</dd></div>
              <div><dt>Product Code</dt><dd>{batch.batchCode}</dd></div>
              <div><dt>Batch ID</dt><dd>{batch.displayId}</dd></div>
              <div><dt>Manufacturer</dt><dd>{batch.manufacturerName ? `${batch.manufacturerName}${batch.manufacturerCity ? `, ${batch.manufacturerCity}` : ""}` : "—"}</dd></div>
              <div><dt>Manufacture Date</dt><dd>{formatDateOnly(batch.manufactureDate)}</dd></div>
              <div><dt>Expiry Date</dt><dd>{formatDateOnly(batch.expiryDate)}</dd></div>
              <div><dt>Temperature Range</dt><dd>{tempInfo ? `${tempInfo.min}°C – ${tempInfo.max}°C` : "—"}</dd></div>
              <div><dt>Current Owner</dt><dd>{ownerText}</dd></div>
              <div><dt>Delivery Status</dt><dd>{DELIVERY_STATUS_LABELS[batch.deliveryStatus]}</dd></div>
              <div>
                <dt>Consumer Rating</dt>
                <dd>
                  {batch.ratingCount > 0
                    ? `${batch.averageRating.toFixed(1)} / 5 (${batch.ratingCount} rating${batch.ratingCount === 1 ? "" : "s"})`
                    : "No ratings yet"}
                </dd>
              </div>
            </dl>
          </div>

          {tempInfo && (
            <div className="sc-card" style={{ marginTop: 20 }}>
              <div className="sc-card-head">
                <h2>Storage temperature</h2>
              </div>
              <p style={{ marginBottom: 10 }}>
                <strong>Safe range:</strong> {tempInfo.min}°C – {tempInfo.max}°C
              </p>
              {!latestReading ? (
                <p style={{ color: "#64748b" }}>No temperature readings logged for this batch yet.</p>
              ) : (
                <>
                  <div className={`sc-verdict ${latestReading.inRange ? "sc-verdict--ok" : "sc-verdict--bad"}`} style={{ marginTop: 0 }}>
                    <Icon name="thermometer" size={22} />
                    <div>
                      {latestReading.inRange
                        ? `Last recorded: ${latestReading.temp}°C — within the safe range.`
                        : `Last recorded: ${latestReading.temp}°C — OUT OF RANGE at last handoff.`}
                    </div>
                  </div>
                  <p className="sc-note">
                    {tempInfo.readings.length} reading{tempInfo.readings.length === 1 ? "" : "s"} logged across this batch's journey.
                  </p>
                </>
              )}
            </div>
          )}

          {allowRating && (
            <div className="sc-card" style={{ marginTop: 20 }}>
              <div className="sc-card-head">
                <h2>Rate &amp; give feedback</h2>
              </div>
              {batch.deliveryStatus !== 1 ? (
                <p style={{ color: "#b45309" }}>
                  Rating and feedback aren't available yet - they open up once the pharmacy marks this batch as delivered.
                </p>
              ) : (
                <>
                  <p className="sc-qr-note">Your rating and feedback help the manufacturer know how this batch performed.</p>
                  <div className="sc-stars" style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSelectedStars(n)}
                        disabled={ratingLoading}
                        style={{ color: n <= selectedStars ? "#d97706" : "#cbd5e1" }}
                        aria-label={`${n} star${n === 1 ? "" : "s"}`}
                      >
                        ★
                      </button>
                    ))}
                    {selectedStars > 0 && <span style={{ marginLeft: 8, color: "#475569" }}>{RATING_LABELS[selectedStars]}</span>}
                  </div>

                  <label style={labelStyle}>Your name (optional)</label>
                  <input type="text" placeholder="Leave blank to stay anonymous" value={consumerName} onChange={(e) => setConsumerName(e.target.value)} disabled={ratingLoading} style={inputStyle} />

                  <label style={labelStyle}>Your city (required)</label>
                  <select value={consumerCity} onChange={(e) => setConsumerCity(e.target.value)} disabled={ratingLoading} style={inputStyle}>
                    <option value="">-- Select City --</option>
                    {INDIAN_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <label style={labelStyle}>Feedback (optional)</label>
                  <textarea
                    placeholder="Anything you'd like the manufacturer to know?"
                    value={consumerFeedback}
                    onChange={(e) => setConsumerFeedback(e.target.value)}
                    disabled={ratingLoading}
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                  />

                  <button onClick={submitStarRating} disabled={!selectedStars || !consumerCity.trim() || ratingLoading} style={{ ...buttonStyle, width: "auto", padding: "11px 28px" }}>
                    {ratingLoading ? "Submitting..." : hasRated ? "Update Rating" : "Submit Rating"}
                  </button>
                </>
              )}
              <MessageBox message={ratingMessage} />
            </div>
          )}

          {events.length > 0 && (
            <div className="sc-card" style={{ marginTop: 20 }}>
              <div className="sc-card-head" style={{ marginBottom: 6 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <IconCircle name="history" size="sm" />
                  <h2>Complete traceability</h2>
                </span>
              </div>
              <BatchTimelineEvents events={events} resolved={resolved} batchMeta={null} batchCodeLabel={batch.batchCode} showTitle={false} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
