import { Modal } from "./ui";
import ViewQRButton from "../components/QRModal";
import { formatDateOnly, shortenAddressFallback } from "../utils";

// The "Details →" popup. Not mounted at all until a row's Details button
// sets `batch`, so it can never be visible by default. Every value comes
// from the selected on-chain batch.
export default function BatchDetailsModal({ batch, onClose }) {
  if (!batch) return null;
  const owner = batch.currentOwnerName
    ? `${batch.currentOwnerName}${batch.currentOwnerRole ? ` (${batch.currentOwnerRole})` : ""}`
    : shortenAddressFallback(batch.currentOwner);
  const rows = [
    ["Batch ID", batch.displayId],
    ["Product ID", batch.id],
    ["Product Code", batch.batchCode],
    ["Product Name", batch.productName],
    ["Quantity", batch.quantity.toLocaleString()],
    ["Manufacturer", batch.manufacturerName || "—"],
    ["Manufacturer Address", batch.manufacturer],
    ["Manufacture Date", formatDateOnly(batch.manufactureDate)],
    ["Expiry Date", formatDateOnly(batch.expiryDate)],
    ["Temperature Range", batch.tempText],
    ["Delivery Status", batch.deliveryLabel],
    ["Last Action", batch.lastAction || "—"],
    ["Current Owner", owner],
    ["Rating", batch.avgRating !== null ? `${batch.avgRating.toFixed(1)} / 5 (${batch.ratingCount})` : "No ratings yet"],
    ["QR Code", `Encodes ${batch.batchCode}`],
  ];
  return (
    <Modal title="Batch Details" onClose={onClose}>
      <div>
        {rows.map(([label, value]) => (
          <div key={label} className="sc-detail-row">
            <span>{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
      <div className="sc-modal-actions">
        <ViewQRButton batchCode={batch.batchCode} label="QR CODE" className="sc-btn sc-btn--primary" />
        <button type="button" className="sc-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
