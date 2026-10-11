import { useEffect, useState } from "react";
import Icon from "../dashboard/icons";

// Frontend-only Terms & Conditions layer for Batch Registration.
// It never asks for, reads or stores any MetaMask credential.
const TERMS_SECTIONS = [
  {
    icon: "wallet",
    title: "MetaMask & Blockchain",
    items: [
      "Connect the correct MetaMask account that is linked to your registered role.",
      "Your connected wallet address identifies you and authorizes your blockchain actions.",
      "Blockchain transactions require your confirmation in MetaMask.",
      "Always verify the transaction details before confirming.",
      "Once a transaction is confirmed on the blockchain, the recorded information may not be directly modified or deleted.",
      "You are responsible for keeping your MetaMask wallet, private key and Secret Recovery Phrase secure.",
      "This application will never require you to share your MetaMask private key, Secret Recovery Phrase or MetaMask password.",
      "Never approve a transaction that you do not recognize.",
    ],
  },
  {
    icon: "package",
    title: "Batch Registration",
    items: [
      "Provide accurate and complete batch information.",
      "The batch information must correspond to the actual pharmaceutical product.",
      "Do not register false, misleading, duplicate or unauthorized information.",
      "Once registered, the batch becomes part of the traceability record.",
      "You are responsible for reviewing all details before submitting.",
      "Only authorized users and roles may register or manage batches.",
    ],
  },
  {
    icon: "transfer",
    title: "Supply Chain & Ownership",
    items: [
      "Ownership can be transferred only by authorized accounts.",
      "Verify the batch information before transferring ownership.",
      "A QR code must be used only for its corresponding batch.",
      "Do not intentionally provide incorrect ownership or shipment information.",
      "This application provides blockchain traceability records but does not replace pharmaceutical laws, regulations or compliance requirements.",
    ],
  },
  {
    icon: "shield",
    title: "Application Usage",
    items: [
      "This blockchain-based pharmaceutical supply-chain system is developed for academic / project purposes.",
      "Transactions on a local or test network are for demonstration and testing.",
      "Verify the transaction details before confirming in MetaMask.",
      "The application is not a substitute for official regulatory systems or legal compliance.",
      "Users are responsible for the information they submit.",
    ],
  },
];

export default function TermsModal({ onAgree, onCancel }) {
  const [understood, setUnderstood] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="sc-terms-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="sc-terms" role="dialog" aria-modal="true" aria-labelledby="sc-terms-title">
        <div className="sc-terms-head">
          <div>
            <h3 id="sc-terms-title">Terms &amp; Conditions</h3>
            <p>Please review the following conditions before registering a pharmaceutical batch.</p>
          </div>
          <button type="button" className="sc-terms-x" aria-label="Close" onClick={onCancel}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="sc-terms-body" tabIndex={0}>
          {TERMS_SECTIONS.map((sec) => (
            <section key={sec.title} className="sc-terms-sec">
              <h4>
                <span className="sc-terms-ic"><Icon name={sec.icon} size={15} /></span>
                {sec.title}
              </h4>
              <ol>
                {sec.items.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </section>
          ))}
        </div>

        <div className="sc-terms-foot">
          <label className="sc-terms-check">
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
            <span>I have read and understood the Terms &amp; Conditions.</span>
          </label>
          <div className="sc-terms-actions">
            <button type="button" className="sc-btn" onClick={onCancel}>Cancel</button>
            <button type="button" className="sc-btn sc-btn--primary" disabled={!understood} onClick={onAgree}>
              Agree &amp; Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
