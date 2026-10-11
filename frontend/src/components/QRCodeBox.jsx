import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { uploadQRCodeToIPFS, getQRCodeFromIPFS } from "../api";

// ============================================================
// QRCodeBox
// ============================================================
// Renders a QR code encoding a batch code, with a Download button
// (fully client-side, no network needed) and an optional "Save to
// IPFS" button. The QR's payload is JUST the batch code text — scanning
// it and typing the code manually produce identical results, by design
// (see BatchCodeInput.jsx).
export default function QRCodeBox({ batchCode, compact = false }) {
  const canvasRef = useRef(null);
  const [dataUrl, setDataUrl] = useState(null);
  const [ipfsRecord, setIpfsRecord] = useState(null); // { cid, url } once saved (or previously saved)
  const [ipfsLoading, setIpfsLoading] = useState(false);
  const [ipfsMessage, setIpfsMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!batchCode) return;
    QRCode.toCanvas(canvasRef.current, batchCode, { width: compact ? 120 : 220, margin: 1 }, () => {
      if (cancelled || !canvasRef.current) return;
      setDataUrl(canvasRef.current.toDataURL("image/png"));
    });
    // Check if this batch already has a QR saved to IPFS from before.
    getQRCodeFromIPFS(batchCode).then((record) => {
      if (!cancelled && record) setIpfsRecord(record);
    });
    return () => {
      cancelled = true;
    };
  }, [batchCode, compact]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${batchCode}-qrcode.png`;
    a.click();
  };

  const handleSaveToIPFS = async () => {
    if (!dataUrl) return;
    setIpfsLoading(true);
    setIpfsMessage("");
    try {
      const result = await uploadQRCodeToIPFS(batchCode, dataUrl);
      setIpfsRecord(result);
      setIpfsMessage("Saved to IPFS.");
    } catch (err) {
      setIpfsMessage(err.message);
    } finally {
      setIpfsLoading(false);
    }
  };

  if (!batchCode) return null;

  return (
    <div style={{ textAlign: "center" }}>
      <canvas ref={canvasRef} style={{ borderRadius: "8px", background: "#fff", padding: "8px" }} />
      <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "10px", flexWrap: "wrap" }}>
        <button style={qrButtonStyle} onClick={handleDownload} disabled={!dataUrl}>
          Download QR
        </button>
        {!ipfsRecord && (
          <button style={{ ...qrButtonStyle, backgroundColor: "#475569" }} onClick={handleSaveToIPFS} disabled={ipfsLoading || !dataUrl}>
            {ipfsLoading ? "Saving..." : "Save to IPFS"}
          </button>
        )}
      </div>
      {ipfsRecord && (
        <p style={{ fontSize: "12px", color: "#15803d", marginTop: "8px", wordBreak: "break-all" }}>
          On IPFS:{" "}
          <a href={ipfsRecord.url} target="_blank" rel="noreferrer" style={{ color: "#6c2bd9" }}>
            {ipfsRecord.cid}
          </a>
        </p>
      )}
      {ipfsMessage && <p style={{ fontSize: "12px", color: "#f59e0b", marginTop: "6px" }}>{ipfsMessage}</p>}
    </div>
  );
}

const qrButtonStyle = {
  padding: "10px 14px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#6c2bd9",
  color: "white",
  fontSize: "13px",
  cursor: "pointer",
};
