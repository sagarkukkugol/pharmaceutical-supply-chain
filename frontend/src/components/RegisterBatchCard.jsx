import { useState } from "react";
import { getMetaMaskContract } from "../contract";
import { setTemperatureRange } from "../api";
import ConfirmAndSign from "./ConfirmAndSign";
import TermsModal from "./TermsModal";
import QRCodeBox from "./QRCodeBox";
import MessageBox from "./MessageBox";
import { dateStringToUnix, describeError, makeBatchId } from "../utils";
import { cardStyle, labelStyle, inputStyle, readonlyBoxStyle, buttonStyle } from "../styles";

// Register Batch form — logic unchanged from the original App.jsx; only
// moved into its own file so the new dashboard shell can render it.
export default function RegisterBatchCard({ session, onDone }) {
  const [productName, setProductName] = useState("");
  const [batchCode, setBatchCode] = useState("");
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

  // Generated Batch ID preview — same rule as everywhere else in the app
  // (manufacturer + product code + registration date), using today's date.
  const previewBatchId =
    batchCode.trim() && session.username ? makeBatchId(session.username, batchCode.trim()) : "";

  const validate = () => {
    if (!productName.trim() || !batchCode.trim() || !quantity || !manufactureDate || !expiryDate) {
      return "Please fill in every field, including manufacture and expiry dates.";
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

  const openConfirm = () => {
    if (!termsAccepted) return;
    setMessage({ type: "", text: "" });
    const validationError = validate();
    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }
    setConfirming(true);
  };

  const actuallyRegister = async () => {
    setConfirming(false);
    const newBatchId = makeBatchId(session.username, batchCode.trim());
    try {
      setLoading(true);
      const contract = await getMetaMaskContract(session.walletAddress);
      setMessage({ type: "pending", text: "Sending transaction..." });
      const tx = await contract.registerBatch(
        productName.trim(),
        batchCode.trim(),
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
        await setTemperatureRange(batchCode.trim(), Number(tempMin), Number(tempMax));
      } catch {
        tempWarning = " (Note: the temperature range could not be saved - you can ignore this if you don't need it.)";
      }

      setMessage({
        type: "success",
        text: `Batch "${newBatchId}" (product code ${batchCode.trim()}) registered successfully!${tempWarning}`,
      });
      setRegisteredCode(batchCode.trim());
      setProductName("");
      setBatchCode("");
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
      <input type="text" placeholder="e.g. dolo_450" value={batchCode} onChange={(e) => setBatchCode(e.target.value)} style={inputStyle} />

      <label style={labelStyle}>Batch ID (auto-generated)</label>
      <div style={readonlyBoxStyle}>{previewBatchId || "auto-generated"}</div>

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

      <label style={labelStyle}>Manufacturer</label>
      <div style={readonlyBoxStyle}>{session.username} - {session.role}</div>
      <p style={{ fontSize: "12px", color: "#64748b", marginTop: "-8px", marginBottom: "12px" }}>
        The manufacturer is always your signed-in account - it cannot be typed manually.
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
            QR code for <strong style={{ color: "#334155" }}>{registeredCode}</strong>
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
              {productName.trim()} — {batchCode.trim()} (qty {quantity})
              <br />
              Batch ID: {previewBatchId}
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
