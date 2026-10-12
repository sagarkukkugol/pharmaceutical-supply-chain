import { useEffect, useState } from "react";
import { getMetaMaskContract, getReadOnlyContract } from "../contract";
import { setTemperatureRange, saveBatchMeta } from "../api";
import ConfirmAndSign from "./ConfirmAndSign";
import TermsModal from "./TermsModal";
import QRCodeBox from "./QRCodeBox";
import MessageBox from "./MessageBox";
import { dateStringToUnix, describeError, batchIdPrefix } from "../utils";
import { nextFreeBatchId } from "../resolveBatch";
import { cardStyle, labelStyle, inputStyle, readonlyBoxStyle, buttonStyle } from "../styles";

// Register Batch form — logic unchanged from the original App.jsx; only
// moved into its own file so the new dashboard shell can render it.
export default function RegisterBatchCard({ session, onDone }) {
  const [productName, setProductName] = useState("");
  // Product Code: identifies the product and MAY repeat across batches.
  const [productCode, setProductCode] = useState("");
  const [quantity, setQuantity] = useState("");
  const [manufactureDate, setManufactureDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [confirming, setConfirming] = useState(false);
  // NEW: kept around after the form clears, so the QR code (which
  // encodes this batch's code) still has something to render.
  const [registeredCode, setRegisteredCode] = useState(null);
  // NEW: the safe storage temperature range for this batch (°C). Saved
  // off-chain right after registration — see server.js for why.
  const [tempMin, setTempMin] = useState("");
  const [tempMax, setTempMax] = useState("");
  // Terms & Conditions (frontend-only gate in front of Register Batch).
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Batch ID (auto-generated, never typed): MMM-PP-DDMMYYYY-XX. It is the
  // unique identifier of THIS batch; the next free running number XX is
  // looked up on the blockchain, so two batches never share a Batch ID.
  const [previewBatchId, setPreviewBatchId] = useState("");
  const [finalBatchId, setFinalBatchId] = useState("");
  const idPrefix = batchIdPrefix(session.username, productCode.trim(), manufactureDate);

  useEffect(() => {
    let cancelled = false;
    if (!idPrefix) {
      Promise.resolve().then(() => !cancelled && setPreviewBatchId(""));
      return () => {
        cancelled = true;
      };
    }
    const t = setTimeout(async () => {
      try {
        const next = await nextFreeBatchId(getReadOnlyContract(), idPrefix);
        if (!cancelled) setPreviewBatchId(next);
      } catch {
        if (!cancelled) setPreviewBatchId("");
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [idPrefix, registeredCode]);

  const validate = () => {
    if (!productName.trim() || !productCode.trim() || !quantity || !manufactureDate || !expiryDate) {
      return "Please fill in every field, including manufacture and expiry dates.";
    }
    if (!idPrefix) {
      return "Product Code and Manufacture Date are needed to generate the Batch ID (the Product Code must contain letters or numbers).";
    }
    if (Number(quantity) <= 0) {
      return "Quantity must be greater than zero.";
    }
    if (dateStringToUnix(expiryDate) <= dateStringToUnix(manufactureDate)) {
      return "Expiry date must be after the manufacture date.";
    }
    if (tempMin === "" || tempMax === "") {
      return "Please enter the safe storage temperature range.";
    }
    if (Number(tempMin) >= Number(tempMax)) {
      return "Minimum temperature must be less than maximum temperature.";
    }
    return null;
  };

  const openConfirm = async () => {
    if (!termsAccepted) return;
    setMessage({ type: "", text: "" });
    const validationError = validate();
    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }
    // Re-check the blockchain right now so the Batch ID shown in the review
    // step is the first one that is really free.
    try {
      setFinalBatchId(await nextFreeBatchId(getReadOnlyContract(), idPrefix));
    } catch (err) {
      setMessage({ type: "error", text: describeError(err) });
      return;
    }
    setConfirming(true);
  };

  const actuallyRegister = async () => {
    setConfirming(false);
    const newBatchId = finalBatchId;
    try {
      setLoading(true);
      // Save the Product Code for this Batch ID first, so a registered batch
      // can never end up without its Product Code (e.g. backend not running).
      await saveBatchMeta(newBatchId, productCode.trim(), session.username);
      const contract = await getMetaMaskContract(session.walletAddress);
      setMessage({ type: "pending", text: "Sending transaction..." });
      const tx = await contract.registerBatch(
        productName.trim(),
        newBatchId, // on-chain unique `batchCode` field = the Batch ID
        quantity,
        dateStringToUnix(manufactureDate),
        dateStringToUnix(expiryDate)
      );
      setMessage({ type: "pending", text: "Waiting for confirmation..." });
      await tx.wait();
      // NEW: best-effort — the batch is already safely registered
      // on-chain at this point, so a hiccup saving the (off-chain)
      // temperature range shouldn't be reported as a failed
      // registration. It's just appended to the success message.
      let tempWarning = "";
      try {
        await setTemperatureRange(newBatchId, Number(tempMin), Number(tempMax));
      } catch {
        tempWarning = " (Note: the temperature range could not be saved — you can ignore this if you don't need it.)";
      }

      setMessage({
        type: "success",
        text: `Batch ID "${newBatchId}" (Product Code ${productCode.trim()}) registered successfully!${tempWarning}`,
      });
      setRegisteredCode(newBatchId);
      setProductName("");
      setProductCode("");
      setQuantity("");
      setManufactureDate("");
      setExpiryDate("");
      setTempMin("");
      setTempMax("");
      setTermsAccepted(false);
      onDone?.();
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: describeError(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={cardStyle}>
      <h2 style={{ marginBottom: "14px" }}>Register Pharmaceutical Batch</h2>

      <label style={labelStyle}>Product Name</label>
      <input type="text" placeholder="e.g. Paracetamol" value={productName} onChange={(e) => setProductName(e.target.value)} style={inputStyle} />

      <label style={labelStyle}>Product Code</label>
      <input type="text" placeholder="e.g. dolo_450" value={productCode} onChange={(e) => setProductCode(e.target.value)} style={inputStyle} />

      <label style={labelStyle}>Batch ID (Auto-generated)</label>
      <div style={readonlyBoxStyle}>{previewBatchId || "Auto-Generated"}</div>
      {/* <p style={{ fontSize: "12px", color: "#64748b", marginTop: "-8px", marginBottom: "12px" }}>
        Format MMM-PP-DDMMYYYY-XX: first 3 letters of the manufacturer, first 2 letters of the Product Code,
        manufacture date and a running number. The Product Code can repeat across batches; the Batch ID never does.
      </p> */}

      <label style={labelStyle}>Quantity</label>
      <input type="number" placeholder="e.g. 100" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={inputStyle} />

      <label style={labelStyle}>Manufacture Date</label>
      <input type="date" value={manufactureDate} onChange={(e) => setManufactureDate(e.target.value)} style={inputStyle} />

      <label style={labelStyle}>Expiry Date</label>
      <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} style={inputStyle} />

      {/* NEW: the safe storage temperature range for this batch, shown
          to every later holder and to the consumer who verifies it. */}
      <label style={labelStyle}>Safe Storage Temperature Range (°C)</label>
      <div style={{ display: "flex", gap: "10px", marginBottom: "4px" }}>
        <input
          type="number"
          placeholder="Min, e.g. 2"
          value={tempMin}
          onChange={(e) => setTempMin(e.target.value)}
          style={{ ...inputStyle, marginBottom: 0 }}
        />
        <input
          type="number"
          placeholder="Max, e.g. 8"
          value={tempMax}
          onChange={(e) => setTempMax(e.target.value)}
          style={{ ...inputStyle, marginBottom: 0 }}
        />
      </div>
      <p style={{ fontSize: "12px", color: "#64748b", marginTop: 0, marginBottom: "12px" }}>
        Every transporter, distributor, and pharmacy that handles this batch will log the temperature
        they observe against this range.
      </p>

      <label style={labelStyle}>Manufacturer</label>
      <div style={readonlyBoxStyle}>{session.username} - {session.role}</div>
      <p style={{ fontSize: "12px", color: "#64748b", marginTop: "-8px", marginBottom: "12px" }}>
        The manufacturer is always your signed-in account — it cannot be typed manually.
      </p>

      <label className="sc-terms-inline">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => (e.target.checked ? setShowTerms(true) : setTermsAccepted(false))}
        />
        <span>
          I have read and agree to the{" "}
          <button type="button" className="sc-terms-link" onClick={() => setShowTerms(true)}>
            Terms &amp; Conditions
          </button>
        </span>
      </label>

      <button onClick={openConfirm} disabled={loading || !termsAccepted} style={{ ...buttonStyle, ...(!termsAccepted ? { opacity: 0.55, cursor: "not-allowed" } : {}) }}>
        {loading ? "Processing..." : "Register Batch"}
      </button>
      <MessageBox message={message} />

      {/* NEW: every batch, once registered, gets a QR code encoding its
          batch code — download it now to print on the box, or save a
          canonical copy to IPFS. */}
      {registeredCode && (
        <div style={{ marginTop: "16px", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <p style={{ marginTop: 0, marginBottom: "12px", color: "#64748b", fontSize: "13px" }}>
            QR code for Batch ID <strong style={{ color: "#334155" }}>{registeredCode}</strong>
          </p>
          <QRCodeBox batchCode={registeredCode} />
        </div>
      )}

      {showTerms && (
        <TermsModal
          onCancel={() => setShowTerms(false)}
          onAgree={() => {
            setTermsAccepted(true);
            setShowTerms(false);
          }}
        />
      )}

      {confirming && (
        <ConfirmAndSign
          summary={
            <>
              <strong>Register Batch</strong>
              <br />
              {productName.trim()} — Product Code {productCode.trim()} (qty {quantity})
              <br />
              Batch ID: {finalBatchId}
              <br />
              Manufacture: {manufactureDate} · Expiry: {expiryDate}
              <br />
              Storage range: {tempMin}°C – {tempMax}°C
            </>
          }
          onConfirmed={actuallyRegister}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
