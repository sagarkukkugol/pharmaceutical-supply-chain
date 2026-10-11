import { useState, useEffect } from "react";
import { getMetaMaskContract, getReadOnlyContract } from "../contract";
import { getUserByAddress, getTemperatureInfo, logTemperatureReading } from "../api";
import { formatUser } from "../participants";
import UserSearchSelect from "./UserSearchSelect";
import ConfirmAndSign from "./ConfirmAndSign";
import BatchCodeInput from "./BatchCodeInput";
import ViewQRButton from "./QRModal";
import MessageBox from "./MessageBox";
import { resolveBatchId } from "../resolveBatch";
import { describeError, NEXT_ROLE } from "../utils";
import { cardStyle, labelStyle, inputStyle, readonlyBoxStyle, buttonStyle } from "../styles";

// Transfer Ownership form — blockchain logic unchanged from App.jsx.
// Added (UI-only) props so other pages can drive it:
//   initialCode  load this batch automatically (e.g. picked from a table)
//   hideLookup   hide the code field + "Load Batch" button (batch is fixed)
//   heading      override the card title
//   onDone       called after any successful on-chain write
export default function TransferOwnershipCard({ session, onDone, initialCode = "", hideLookup = false, heading = "Transfer Ownership", submitLabel = "Transfer Ownership" }) {
  const [transferCode, setTransferCode] = useState("");
  const [transferBatch, setTransferBatch] = useState(null);
  const [ownerUser, setOwnerUser] = useState(null);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [confirming, setConfirming] = useState(false);
  // NEW: rate-the-previous-holder state (thumbs up/down), shown once
  // this participant has loaded a batch they currently hold.
  const [previousHolder, setPreviousHolder] = useState(null); // { address, user } | null
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingMessage, setRatingMessage] = useState({ type: "", text: "" });
  // NEW: cold-chain check. tempInfo is this batch's safe range (null if
  // the Manufacturer never set one — older batches, or the feature just
  // not used for this one). currentTemp is what this holder currently
  // observes — required before transferring, if a range exists.
  const [tempInfo, setTempInfo] = useState(null); // { min, max, readings } | null
  const [currentTemp, setCurrentTemp] = useState("");

  const resolveBatchIdFromInput = (contract, input) => resolveBatchId(contract, input);

  // codeOverride lets the QR scan/upload path load the batch straight away
  // (state from setTransferCode wouldn't be updated yet). The button click
  // passes an event object instead, which falls back to the typed code.
  const loadBatch = async (codeOverride) => {
    const code = typeof codeOverride === "string" ? codeOverride : transferCode;
    setMessage({ type: "", text: "" });
    setTransferBatch(null);
    setSelectedRecipient(null);
    setPreviousHolder(null);
    setAlreadyRated(false);
    setRatingMessage({ type: "", text: "" });
    setTempInfo(null);
    setCurrentTemp("");
    if (!code.trim()) {
      setMessage({ type: "error", text: "Please enter a batch code or blockchain ID." });
      return;
    }
    try {
      const contract = getReadOnlyContract();
      const id = await resolveBatchIdFromInput(contract, code);
      const data = await contract.getBatch(id);
      if (data.id.toString() === "0") {
        setMessage({ type: "error", text: "Batch not found." });
        return;
      }
      setTransferBatch({ id: data.id.toString(), batchCode: data.batchCode, currentOwner: data.currentOwner });
      setOwnerUser(await getUserByAddress(data.currentOwner));
      // NEW: look up this batch's safe temperature range, if one was
      // set at registration (404 -> null, not an error).
      setTempInfo(await getTemperatureInfo(data.batchCode));

      // NEW: if this participant is the current owner and someone
      // handed them this batch, offer to rate that handoff (once).
      if (data.currentOwner.toLowerCase() === session.walletAddress.toLowerCase() && data.lastTransferFrom !== "0x0000000000000000000000000000000000000000") {
        const rated = await contract.hasRatedTransferFrom(id, session.walletAddress);
        setAlreadyRated(rated);
        const holderUser = await getUserByAddress(data.lastTransferFrom);
        setPreviousHolder({ address: data.lastTransferFrom, user: holderUser });
      }
    } catch (err) {
      setMessage({ type: "error", text: describeError(err) });
    }
  };

  // Auto-load a batch handed in by another page (table row, QR search).
  useEffect(() => {
    if (!initialCode) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setTransferCode(initialCode);
      loadBatch(initialCode);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const submitRating = async (positive) => {
    if (!transferBatch) return;
    setRatingLoading(true);
    setRatingMessage({ type: "", text: "" });
    try {
      const contract = await getMetaMaskContract(session.walletAddress);
      const tx = await contract.rateParticipant(transferBatch.id, positive);
      await tx.wait();
      setAlreadyRated(true);
      setRatingMessage({ type: "success", text: `Rated ${formatUser(previousHolder.user, previousHolder.address)} ${positive ? "positively" : "negatively"}.` });
    } catch (err) {
      setRatingMessage({ type: "error", text: describeError(err) });
    } finally {
      setRatingLoading(false);
    }
  };

  const submit = async () => {
    if (!transferBatch || !selectedRecipient) {
      setMessage({ type: "error", text: "Load a batch and pick a recipient first." });
      return;
    }
    // NEW: if this batch has a safe range set, a current reading is
    // required before handing it off — that's the whole point of the
    // check.
    if (tempInfo && currentTemp === "") {
      setMessage({ type: "error", text: "Enter the current temperature before transferring this batch." });
      return;
    }
    setMessage({ type: "", text: "" });
    setConfirming(true);
  };

  const actuallyTransfer = async () => {
    setConfirming(false);
    try {
      setLoading(true);
      const contract = await getMetaMaskContract(session.walletAddress);
      setMessage({ type: "pending", text: "Sending transaction..." });
      const tx = await contract.transferOwnership(transferBatch.id, selectedRecipient.walletAddress);
      setMessage({ type: "pending", text: "Waiting for confirmation..." });
      await tx.wait();

      // NEW: best-effort, same reasoning as the temperature-range save
      // in RegisterBatchCard — the transfer already succeeded on-chain,
      // so a hiccup logging this reading isn't a failed transfer.
      let successText = `Ownership transferred to ${selectedRecipient.username}.`;
      if (tempInfo && currentTemp !== "") {
        try {
          await logTemperatureReading(transferBatch.batchCode, Number(currentTemp), session.username);
        } catch {
          successText += " (Note: the temperature reading could not be logged.)";
        }
      }
      setMessage({ type: "success", text: successText });
      setTransferBatch((prev) => (prev ? { ...prev, currentOwner: selectedRecipient.walletAddress } : prev));
      setOwnerUser(selectedRecipient);
      setSelectedRecipient(null);
      setCurrentTemp("");
      onDone?.();
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: describeError(err) });
    } finally {
      setLoading(false);
    }
  };

  const isCurrentOwner =
    transferBatch && transferBatch.currentOwner.toLowerCase() === session.walletAddress.toLowerCase();

  // NEW: the role this participant is allowed to transfer to, matching
  // the on-chain rule in SupplyChain.sol. Manufacturer -> Transporter,
  // Transporter -> Distributor, Distributor -> Pharmacy.
  const requiredRecipientRole = NEXT_ROLE[session.role];

  // NEW: live in-range check as soon as a temperature is typed in,
  // before the transfer is even submitted.
  const tempInRange =
    tempInfo && currentTemp !== "" ? Number(currentTemp) >= tempInfo.min && Number(currentTemp) <= tempInfo.max : null;

  return (
    <div style={cardStyle}>
      <h2>{heading}</h2>
      <p style={{ fontSize: "13px", color: "#64748b", marginTop: "6px", marginBottom: "14px" }}>
        As a {session.role}, you can only transfer to a {requiredRecipientRole}.
      </p>

      {!hideLookup && (
        <>
      <label style={labelStyle}>Batch Code or ID</label>
      <BatchCodeInput
        value={transferCode}
        onChange={setTransferCode}
        onDecoded={loadBatch}
        placeholder="Batch ID or product code, e.g. dolo_450"
        style={inputStyle}
        onKeyDown={(e) => e.key === "Enter" && loadBatch()}
      />
      <button onClick={() => loadBatch()} style={{ ...buttonStyle, marginBottom: "15px" }}>
        Load Batch
      </button>
        </>
      )}

      {transferBatch && (
        <>
          <p><strong>Batch:</strong> {transferBatch.batchCode}</p>
          <div style={{ marginBottom: "12px" }}>
            <ViewQRButton batchCode={transferBatch.batchCode} />
          </div>
          <p>
            <strong>Current Owner:</strong><br />
            {formatUser(ownerUser, transferBatch.currentOwner)}<br />
            <small style={{ color: "#94a3b8" }}>{transferBatch.currentOwner}</small>
          </p>

          {/* NEW: rate whoever handed this batch to you, once, before
              (or instead of) sending it onward. */}
          {previousHolder && !alreadyRated && (
            <div style={{ ...readonlyBoxStyle, textAlign: "left" }}>
              <p style={{ margin: "0 0 8px 0" }}>
                Rate <strong>{formatUser(previousHolder.user, previousHolder.address)}</strong>, who handed
                you this batch:
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button style={{ ...buttonStyle, backgroundColor: "#16a34a" }} onClick={() => submitRating(true)} disabled={ratingLoading}>
                  Positive
                </button>
                <button style={{ ...buttonStyle, backgroundColor: "#dc2626" }} onClick={() => submitRating(false)} disabled={ratingLoading}>
                  Negative
                </button>
              </div>
              <MessageBox message={ratingMessage} />
            </div>
          )}
          {previousHolder && alreadyRated && (
            <p style={{ color: "#15803d", fontSize: "13px" }}>You've already rated this handoff.</p>
          )}

          {!isCurrentOwner && (
            <p style={{ color: "#b45309", fontSize: "14px" }}>
              You ({session.username}) are not the current owner of this batch - the transaction will be
              rejected by the smart contract.
            </p>
          )}

          {/* NEW: cold-chain check — only shown for batches the
              Manufacturer actually set a range for. */}
          {tempInfo && (
            <div style={{ ...readonlyBoxStyle, textAlign: "left" }}>
              <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#64748b" }}>
                Safe storage range for this batch: <strong style={{ color: "#334155" }}>{tempInfo.min}°C – {tempInfo.max}°C</strong>
              </p>
              <label style={labelStyle}>Current Temperature (°C)</label>
              <input
                type="number"
                placeholder="e.g. 5"
                value={currentTemp}
                onChange={(e) => setCurrentTemp(e.target.value)}
                style={inputStyle}
              />
              {tempInRange !== null && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    backgroundColor: tempInRange ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${tempInRange ? "#16a34a" : "#dc2626"}`,
                    color: tempInRange ? "#15803d" : "#b91c1c",
                    fontSize: "14px",
                  }}
                >
                  {tempInRange ? (
                    <>{currentTemp}°C - within the safe range ({tempInfo.min}°C–{tempInfo.max}°C).</>
                  ) : (
                    <>
                      {currentTemp}°C - OUT OF RANGE. Keep this batch between {tempInfo.min}°C and{" "}
                      {tempInfo.max}°C.
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <label style={labelStyle}>Transfer To ({requiredRecipientRole} only)</label>
          <UserSearchSelect
            excludeUsername={session.username}
            roleFilter={requiredRecipientRole}
            onSelect={setSelectedRecipient}
          />

          <button
            onClick={submit}
            disabled={loading || !selectedRecipient || (tempInfo && currentTemp === "")}
            style={buttonStyle}
          >
            {loading ? "Processing..." : submitLabel}
          </button>
        </>
      )}

      <MessageBox message={message} />

      {confirming && (
        <ConfirmAndSign
          summary={
            <>
              <strong>Transfer Ownership</strong>
              <br />
              Batch: {transferBatch?.batchCode}
              <br />
              To: {selectedRecipient?.username} ({selectedRecipient?.role})
              {tempInfo && currentTemp !== "" && (
                <>
                  <br />
                  Temperature at handoff: {currentTemp}°C ({tempInRange ? "within range" : "OUT OF RANGE"})
                </>
              )}
            </>
          }
          onConfirmed={actuallyTransfer}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
