import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import Icon from "../dashboard/icons";

// ============================================================
// BatchCodeInput
// ============================================================
// A text field for typing a batch code, plus two faster ways to fill
// it in: "Scan" opens a live camera view, "Upload" decodes a QR from
// an image file you already have (e.g. a saved screenshot, or the PNG
// downloaded from QRCodeBox.jsx). All three paths produce identical
// results — the QR only ever encodes the batch code text — so this is
// just three ways to fill in exactly what you'd otherwise type.
// ------------------------------------------------------------
// QRScanUpload — the one place the camera scanner + QR-image decoding
// live. It renders whatever UI you give it (render prop) and just hands
// back the decoded, trimmed batch code via onCode. BatchCodeInput (the
// typed-field version used across the dashboards) and the new public
// home page both use it, so there is exactly one scan/upload
// implementation.
// ------------------------------------------------------------
export function QRScanUpload({ onCode, children }) {
  const [scanning, setScanning] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [decoding, setDecoding] = useState(false);
  // html5-qrcode's file decoder needs a real DOM element to attach to,
  // even though we never show it — this id just gives it one.
  // useId keeps ids unique if more than one scanner is ever on a page.
  const uid = useId().replace(/:/g, "");
  const fileScanRegionId = `qr-file-scan-region-${uid}`;
  // The file picker is opened by id (rather than a ref) so the render-prop
  // callback below never touches a ref during render.
  const fileInputId = `qr-file-input-${uid}`;

  // Common path for scan + upload: trim, reject empty payloads, then
  // hand the code to the page.
  const acceptDecoded = (text) => {
    const code = (text || "").trim();
    if (!code) {
      setUploadError("Batch code could not be found in the QR.");
      return false;
    }
    setUploadError("");
    onCode(code);
    return true;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setUploadError("");
    setDecoding(true);
    const scanner = new Html5Qrcode(fileScanRegionId, /* verbose= */ false);
    try {
      const decodedText = await scanner.scanFile(file, /* showImage= */ false);
      acceptDecoded(decodedText);
    } catch {
      setUploadError("Invalid QR code. Couldn't find a QR code in that file — try a clearer image, or type the batch code instead.");
    } finally {
      // scanFile leaves nothing running (unlike the live camera), but
      // clear() tidies up the hidden region either way.
      setDecoding(false);
      try {
        // clear() may return nothing when no camera stream was started.
        scanner.clear()?.catch?.(() => {});
      } catch {
        // nothing to tidy up
      }
    }
  };

  return (
    <div>
      {children({
        openScanner: () => setScanning(true),
        openUpload: () => document.getElementById(fileInputId)?.click(),
        decoding,
      })}
      {/* Hidden — html5-qrcode's file decoder needs a mounted element, but
          we never display it; the visible UI is whatever the caller renders. */}
      <div id={fileScanRegionId} style={{ display: "none" }} />
      <input id={fileInputId} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />

      {uploadError && <p style={{ color: "#dc2626", fontSize: "13px", marginTop: "6px", marginBottom: 0 }}>{uploadError}</p>}

      {scanning && (
        <QRScannerModal
          onDetected={(text) => {
            setScanning(false);
            acceptDecoded(text);
          }}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  );
}

// onDecoded (optional): called with the cleaned batch code right after a
// successful scan/upload, so the page can load the batch immediately
// instead of making the user press a button. Pages that don't pass it
// behave exactly as before (the field is just filled in).
export default function BatchCodeInput({ value, onChange, onDecoded, placeholder, style, onKeyDown }) {
  return (
    <div style={{ marginBottom: style?.marginBottom ?? "15px" }}>
      <QRScanUpload
        onCode={(code) => {
          onChange(code);
          onDecoded?.(code);
        }}
      >
        {({ openScanner, openUpload, decoding }) => (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder={placeholder || "Batch Code (e.g. PARACETAMOL-001) or numeric ID"}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              style={{ ...style, flex: "1 1 220px", marginBottom: 0 }}
            />
            <button type="button" className="sc-btn" style={scanButtonStyle} onClick={openScanner}>
              <Icon name="qr" size={16} /> Scan QR
            </button>
            <button type="button" className="sc-btn" style={scanButtonStyle} onClick={openUpload} disabled={decoding}>
              <Icon name="upload" size={16} /> {decoding ? "Reading..." : "Upload QR"}
            </button>
          </div>
        )}
      </QRScanUpload>
    </div>
  );
}

// Set to true to print the camera/video state in the browser console while
// diagnosing a camera problem (permission result, camera used, stream and
// <video> state, frames received).
const DEBUG_SCANNER = false;
const dbg = (...args) => DEBUG_SCANNER && console.debug("[QR scanner]", ...args);
let scannerSeq = 0;
// html5-qrcode keeps one fixed, document-wide element id for its overlay, so
// two scanner instances must never exist at the same time. Each scanner waits
// for the previous one to be completely stopped before it starts.
let cameraQueue = Promise.resolve();

const isPermissionError = (err) => /NotAllowed|Permission|denied/i.test(`${err?.name || ""} ${err?.message || err}`);

function QRScannerModal({ onDetected, onClose }) {
  const hostRef = useRef(null);
  const [error, setError] = useState("");
  // Keep the latest callback in a ref so a parent re-render never tears
  // down and restarts the camera mid-scan.
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    // WHY A FRESH ELEMENT + SCANNER PER START: in development React
    // (StrictMode) mounts, immediately unmounts and re-mounts this effect.
    // html5-qrcode starts the camera asynchronously, and calling stop()
    // before it has finished starting throws "Cannot stop, scanner is not
    // running or paused" (which crashed this component) and leaves the
    // first stream running next to the second one — the black/blank video.
    // So every start gets its own element + scanner instance, and stop /
    // cleanup only ever happens AFTER that instance has finished starting.
    const ready = cameraQueue; // the previous scanner has fully stopped when this settles
    let done = () => {};
    cameraQueue = new Promise((resolve) => {
      done = resolve;
    });
    let current = null; // { scanner, region } of the instance holding the camera
    let cancelled = false; // effect was cleaned up (closed / unmounted)
    let finished = false; // a QR was already accepted
    let released = false;
    let frames = 0;
    let watchdog = null;

    const discard = (inst) => {
      try {
        inst.scanner.clear();
      } catch {
        // nothing to tidy up
      }
      inst.region.remove();
    };

    // Stops every camera track exactly once, then removes the element.
    const release = async () => {
      if (released) return;
      released = true;
      clearTimeout(watchdog);
      try {
        if (current) {
          try {
            const state = current.scanner.getState?.();
            if (state === 2 /* SCANNING */ || state === 3 /* PAUSED */) await current.scanner.stop();
          } catch (e) {
            console.error("QR scanner: stop failed", e);
          }
          discard(current);
          dbg("released camera");
        }
      } finally {
        done(); // let the next scanner (if any) start now
      }
    };

    const config = { fps: 10, qrbox: { width: 220, height: 220 } };
    const onScan = (decodedText) => {
      if (finished || cancelled) return;
      finished = true;
      dbg("QR detected:", decodedText);
      release().finally(() => onDetectedRef.current(decodedText));
    };
    // fires for every processed frame that holds no QR yet — not an error.
    const onFrame = () => {
      frames += 1;
    };

    // One attempt = one new element + scanner. A failed attempt is thrown
    // away completely (html5-qrcode can be left mid-transition after a
    // failed start, so it must not be reused).
    const startOn = async (cameraIdOrConfig) => {
      const region = document.createElement("div");
      region.id = `qr-scanner-region-${++scannerSeq}`;
      host.appendChild(region);
      const inst = { scanner: new Html5Qrcode(region.id, /* verbose= */ false), region };
      try {
        await inst.scanner.start(cameraIdOrConfig, config, onScan, onFrame);
      } catch (e) {
        discard(inst);
        throw e;
      }
      current = inst;
    };

    const startPromise = (async () => {
      await ready;
      if (cancelled) return; // closed/re-mounted before the camera was even asked for
      try {
        // Prefer the rear camera ("environment" is a preference, not a
        // requirement), but never fail just because there isn't one.
        await startOn({ facingMode: "environment" });
        dbg("started with facingMode=environment");
      } catch (firstErr) {
        if (cancelled || isPermissionError(firstErr)) throw firstErr;
        console.warn("QR scanner: environment camera unavailable, trying any camera", firstErr);
        const cameras = await Html5Qrcode.getCameras();
        dbg("available cameras:", cameras);
        if (!cameras.length) throw firstErr;
        await startOn(cameras[0].id);
      }
      if (cancelled) {
        await release();
        return;
      }
      const video = current.region.querySelector("video");
      dbg("permission granted; stream:", video?.srcObject, "active:", video?.srcObject?.active);
      // If the picture never arrives, say so instead of leaving a black box.
      watchdog = setTimeout(() => {
        if (cancelled || finished) return;
        const v = current?.region.querySelector("video");
        dbg("readyState", v?.readyState, "size", v?.videoWidth, "x", v?.videoHeight, "frames", frames);
        if (v && !v.videoWidth) v.play?.().catch(() => {});
        if (!v || !v.videoWidth) {
          setError("Unable to start the camera. Please close other apps using the camera and try again.");
        }
      }, 4000);
    })().catch(async (err) => {
      console.error("QR scanner: camera start failed", err);
      await release();
      if (cancelled) return;
      setError(
        isPermissionError(err)
          ? "Camera permission was denied. Allow camera access for this site in your browser settings, or use Upload QR / type the Batch ID instead."
          : "Unable to start the camera. Please close other apps using the camera and try again."
      );
    });

    return () => {
      cancelled = true;
      // Wait for a pending start to settle, then stop the stream.
      startPromise.finally(() => release());
    };
  }, []);

  return (
    <div style={overlayStyle}>
      <div style={boxStyle}>
        <h3 style={{ marginTop: 0, color: "#1d4ed8" }}>Scan QR Code</h3>
        <div ref={hostRef} style={{ width: "260px", margin: "0 auto" }} />
        {error && <p style={{ color: "#b91c1c", fontSize: "13px", marginTop: "10px" }}>{error}</p>}
        <button style={cancelButtonStyle} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const scanButtonStyle = {
  padding: "0 14px",
  minHeight: "44px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  backgroundColor: "#ffffff",
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1300,
  padding: "20px",
};

const boxStyle = {
  backgroundColor: "#ffffff",
  color: "#1e293b",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "24px",
  maxWidth: "340px",
  width: "100%",
  textAlign: "center",
};

const cancelButtonStyle = {
  width: "100%",
  marginTop: "16px",
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#0f172a",
  color: "white",
  fontSize: "16px",
  cursor: "pointer",
};