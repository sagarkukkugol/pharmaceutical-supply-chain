import { useState } from "react";

// ============================================================
// TermsAndConditionsModal — the ONE Terms & Conditions modal.
// ============================================================
// Used by:
//   context="batch-registration"  → Register Batch page
//   context="registration"        → Manufacturer / Transporter /
//                                   Distributor / Pharmacy sign-up form
// The look, scrolling, acceptance checkbox and Agree & Continue behaviour
// are identical; only the wording differs per context.
//
// Pure frontend: it only reports "agreed" or "cancelled" to the page, which
// decides what to do with that. Nothing here touches MetaMask or the
// contract, and the user is never asked for a private key, recovery phrase
// or MetaMask password.

const BATCH_SECTIONS = [
  {
    title: "MetaMask & Blockchain",
    items: [
      "The user must connect the correct MetaMask account associated with their registered role.",
      "The connected wallet address is used to identify and authorize blockchain actions within the application.",
      "Blockchain transactions require confirmation through MetaMask.",
      "The user should carefully verify the transaction details before confirming a transaction in MetaMask.",
      "Once a transaction is confirmed on the blockchain, the recorded information may not be directly modified or deleted.",
      "The user is responsible for keeping their MetaMask wallet, private key, and Secret Recovery Phrase secure.",
      "The application will never require the user to share their MetaMask private key, Secret Recovery Phrase, or MetaMask password.",
      "Users should never approve a transaction they do not recognize.",
    ],
  },
  {
    title: "Batch Registration",
    items: [
      "The user must provide accurate and complete information when registering a pharmaceutical batch.",
      "Batch information should correspond to the actual pharmaceutical product.",
      "Users must not intentionally register false, misleading, duplicate, or unauthorized batch information.",
      "Once a batch is registered on the blockchain, its registration becomes part of the supply-chain traceability record.",
      "The user is responsible for reviewing all batch details before submitting the registration transaction.",
      "Only authorized users/roles may register or manage pharmaceutical batches.",
    ],
  },
  {
    title: "Supply Chain & Ownership",
    items: [
      "Ownership transfers must be performed only by authorized accounts.",
      "Users should verify the batch information before transferring ownership.",
      "A batch's QR code should only be used for the corresponding pharmaceutical batch.",
      "Users should not intentionally provide incorrect ownership or shipment information.",
      "The application provides blockchain-based traceability records but does not replace applicable pharmaceutical laws, regulations, or professional compliance requirements.",
    ],
  },
  {
    title: "Application Usage",
    items: [
      "This application is a blockchain-based pharmaceutical supply-chain management system developed for academic/project purposes.",
      "Transactions performed on a local blockchain or test network are for demonstration/testing purposes.",
      "Users should verify transaction details before confirming them through MetaMask.",
      "The application should not be used as a substitute for official pharmaceutical regulatory systems or legal compliance processes.",
      "Users are responsible for the information they submit through the application.",
    ],
  },
];

const REGISTRATION_SECTIONS = [
  {
    title: "Account & Role Registration",
    items: [
      "You are registering as an authorized participant in the Pharmaceutical Supply Chain Platform.",
      "You are responsible for providing accurate information. Depending on your role, this may include your name or organization, role, location, contact information, wallet address and any other details the application asks for.",
      "You must not register using false or misleading information.",
      "You should only register for a role you are authorized to perform.",
    ],
  },
  {
    title: "MetaMask & Wallet Usage",
    items: [
      "The platform may use MetaMask to connect your blockchain wallet.",
      "The connected wallet address may be used to identify you as a participant on the blockchain.",
      "Blockchain transactions may require you to approve them through MetaMask.",
      "You are responsible for reviewing every transaction before confirming it.",
      "Transaction or network fees may apply, depending on the blockchain network that is configured.",
      "The platform does not control MetaMask or your external wallet.",
      "The platform will never ask you for your MetaMask password, Secret Recovery Phrase or private key. Never share them with anyone, including administrators or application staff.",
    ],
  },
  {
    title: "Blockchain Records",
    items: [
      "Information recorded through blockchain transactions may be difficult or impractical to modify or delete directly after it has been recorded.",
      "Verify information before you submit it or confirm a blockchain transaction.",
      "The platform's blockchain records are intended to support traceability, transparency, ownership tracking, batch history and data integrity.",
    ],
  },
  {
    title: "Role Responsibilities",
    items: [
      "Manufacturer: register accurate pharmaceutical batch information, provide correct product and manufacturing details, and check them before submitting.",
      "Transporter: handle assigned batches responsibly, record appropriate transportation and ownership events, and maintain traceability during transportation.",
      "Distributor: record receiving and dispatch or ownership-transfer events accurately, and transfer batches only to authorized participants.",
      "Pharmacy: verify received batches where applicable, keep receiving and inventory information accurate, and make medicines available according to applicable procedures.",
      "Only perform actions that are authorized for your role.",
    ],
  },
  {
    title: "QR Code & Verification",
    items: [
      "QR codes may be used to locate or verify batch information. You may be able to scan a QR code, upload a QR image or enter a batch code.",
      "QR verification is intended to help you reach the corresponding batch information and traceability records.",
      "A QR code is not a replacement for applicable regulatory, medical or professional verification.",
    ],
  },
  {
    title: "Batch Information",
    items: [
      "You are responsible for checking information before submitting it. Batch information may include batch ID, product code, product name, quantity, manufacturer, manufacture date, expiry date, temperature range, ownership and delivery status.",
      "Incorrect information may affect the accuracy of the supply-chain record.",
    ],
  },
  {
    title: "Ownership Transfer",
    items: [
      "Only authorized users should start ownership transfers.",
      "Before confirming a transfer in MetaMask, verify the batch, the product, the current owner, the receiving participant and the transaction details.",
      "Once the blockchain transaction is confirmed, the resulting record may become part of the batch's traceability history.",
    ],
  },
  {
    title: "Platform & Network Limitations",
    items: [
      "This application runs on a local blockchain / development network for academic and demonstration purposes. It is not connected to a public production blockchain.",
      "Blockchain transactions may be test transactions, and wallet balances shown in the application may be development/test-network balances.",
      "The application should not be treated as a production pharmaceutical regulatory system unless it is appropriately deployed, validated, secured and approved.",
      "Information shown by the application is not a substitute for official regulatory or medical verification.",
    ],
  },
  {
    title: "Security Responsibilities",
    items: [
      "Keep your wallet credentials secure.",
      "Never share private keys or Secret Recovery Phrases.",
      "Review MetaMask transactions before confirming them.",
      "Log out when using a shared device.",
      "Report suspicious activity.",
      "The application should never request sensitive wallet secrets through ordinary registration forms.",
    ],
  },
];

const CONTENT = {
  "batch-registration": {
    subtitle: "Please review the following conditions before registering a pharmaceutical batch.",
    sections: BATCH_SECTIONS,
    ack: "I have read and understood the Terms & Conditions.",
  },
  registration: {
    subtitle: "Pharmaceutical Supply Chain Platform",
    sections: REGISTRATION_SECTIONS,
    ack: "I have read and agree to the Terms & Conditions.",
  },
};

const sectionIcons = {
  "MetaMask & Blockchain": "M12 2.5 20 5.5v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10v-6l8-3Zm-3 9.5 2.5 2.5L16 9.5",
  "Batch Registration": "M12 2 3 7l9 5 9-5-9-5ZM3 7v10l9 5 9-5V7M12 12v10",
  "Supply Chain & Ownership": "M2 7h11v9H2zM13 10h4l4 3v3h-8",
  "Application Usage": "M6 3h9l4 4v14H6zM9 11h7M9 15h7",
};
// Sections without a specific icon above share this document icon.
const DEFAULT_ICON = "M6 3h9l4 4v14H6zM9 11h7M9 15h7";

export default function TermsAndConditionsModal({ context = "batch-registration", onCancel, onAgree }) {
  const [understood, setUnderstood] = useState(false);
  const content = CONTENT[context] || CONTENT["batch-registration"];

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={boxStyle} role="dialog" aria-modal="true" aria-label="Terms & Conditions" onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div>
            <h2 style={titleStyle}>Terms &amp; Conditions</h2>
            <p style={subtitleStyle}>{content.subtitle}</p>
          </div>
          <button type="button" style={closeStyle} onClick={onCancel} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* Fixed-height scroll area so the page itself never grows */}
        <div style={scrollStyle}>
          {content.sections.map((section) => (
            <section key={section.title} style={{ marginBottom: "18px" }}>
              <h3 style={sectionTitleStyle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d={sectionIcons[section.title] || DEFAULT_ICON} />
                </svg>
                {section.title}
              </h3>
              <ol style={listStyle}>
                {section.items.map((item) => (
                  <li key={item} style={{ marginBottom: "6px" }}>
                    {item}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>

        {/* Acceptance controls stay visible below the scroll area */}
        <div style={footerStyle}>
          <label style={checkLabelStyle}>
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} style={{ width: "17px", height: "17px", accentColor: "#2563eb" }} />
            {content.ack}
          </label>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button type="button" style={cancelButtonStyle} onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              style={{ ...agreeButtonStyle, ...(understood ? null : disabledStyle) }}
              disabled={!understood}
              onClick={onAgree}
            >
              Agree &amp; Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15, 23, 42, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1200,
  padding: "16px",
};
const boxStyle = {
  width: "min(680px, 100%)",
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#ffffff",
  color: "#1e293b",
  borderRadius: "14px",
  boxShadow: "0 20px 60px rgba(15, 23, 42, 0.3)",
  textAlign: "left",
  overflow: "hidden",
};
const headerStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
  padding: "20px 24px 14px",
  borderBottom: "1px solid #e2e8f0",
  backgroundColor: "#eff6ff",
};
const titleStyle = { margin: 0, fontSize: "22px", color: "#0f172a" };
const subtitleStyle = { margin: "4px 0 0", fontSize: "14px", color: "#475569" };
const closeStyle = {
  width: "34px",
  height: "34px",
  borderRadius: "50%",
  border: "1px solid #e2e8f0",
  backgroundColor: "#ffffff",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
const scrollStyle = { flex: 1, overflowY: "auto", padding: "18px 24px 4px", minHeight: 0, maxHeight: "52vh" };
const sectionTitleStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  margin: "0 0 8px",
  fontSize: "16px",
  color: "#0b1b4d",
};
const listStyle = { margin: 0, paddingLeft: "22px", fontSize: "14px", lineHeight: 1.55, color: "#334155" };
const footerStyle = { padding: "14px 24px 18px", borderTop: "1px solid #e2e8f0", backgroundColor: "#ffffff" };
const checkLabelStyle = { display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", marginBottom: "14px", cursor: "pointer" };
const cancelButtonStyle = {
  padding: "11px 22px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  backgroundColor: "#ffffff",
  color: "#334155",
  fontSize: "15px",
  cursor: "pointer",
};
const agreeButtonStyle = {
  padding: "11px 22px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  cursor: "pointer",
};
const disabledStyle = { backgroundColor: "#bfdbfe", cursor: "not-allowed" };
