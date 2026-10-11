import { useEffect, useRef, useState } from "react";
import Icon, { IconCircle, BrandMark } from "./icons";
import { timeAgo, shortenAddressFallback } from "../utils";

function useOutsideClose(ref, open, close) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && close();
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, open, close]);
}

function initials(name) {
  return (name || "?").trim().slice(0, 2);
}

export function NotificationBell({ items, unreadIds, onOpenItem, onMarkAllRead }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClose(ref, open, () => setOpen(false));
  const unread = items.filter((n) => unreadIds.has(n.id)).length;
  return (
    <div className="sc-pop-anchor" ref={ref}>
      <button
        type="button"
        className="sc-icon-btn"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="bell" size={18} />
        {unread > 0 && <span className="sc-badge-dot">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="sc-pop sc-pop--wide" role="dialog" aria-label="Notifications">
          <div className="sc-pop-head">
            <h3>Notifications</h3>
            {unread > 0 && (
              <button type="button" className="sc-link-btn" onClick={onMarkAllRead}>
                Mark all as read
              </button>
            )}
          </div>
          <div className="sc-pop-body">
            {items.length === 0 && (
              <div className="sc-empty">
                <IconCircle name="bell" size="lg" />
                <strong>You're all caught up</strong>
                Activity on your batches will appear here.
              </div>
            )}
            {items.slice(0, 30).map((n) => {
              const isUnread = unreadIds.has(n.id);
              return (
                <button
                  key={n.id}
                  type="button"
                  className={`sc-notif${isUnread ? " sc-notif--unread" : ""}`}
                  onClick={() => {
                    setOpen(false);
                    onOpenItem(n);
                  }}
                >
                  <IconCircle name={n.icon} size="sm" />
                  <span style={{ minWidth: 0 }}>
                    <span className="sc-notif-title">
                      {n.title}
                      {isUnread && <span className="sc-unread-dot" aria-label="Unread" />}
                    </span>
                    <span className="sc-notif-meta" style={{ display: "block" }}>
                      {n.displayId} · {n.productName} · {n.batchCode}
                    </span>
                    {n.detail && <span className="sc-notif-meta" style={{ display: "block" }}>{n.detail}</span>}
                    <span className="sc-notif-time" style={{ display: "block" }}>{timeAgo(n.ts)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProfileMenu({ session, balance, lowBalance, onFaucet, faucetLoading, faucetMessage, mmConnected, onLogout }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);
  useOutsideClose(ref, open, () => setOpen(false));
  const { username, role, city, walletAddress } = session;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard blocked — select-able text remains in the menu
    }
  };

  return (
    <div className="sc-pop-anchor" ref={ref}>
      <button type="button" className="sc-profile-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="sc-avatar">{initials(username)}</span>
        <span className="sc-profile-text">
          <span className="sc-profile-name" style={{ display: "block" }}>{username}</span>
          <span className="sc-profile-role" style={{ display: "block" }}>{role}</span>
        </span>
        <span className="sc-profile-text" style={{ color: "#64748b", display: "inline-flex" }}>
          <Icon name="chevronDown" size={16} />
        </span>
      </button>
      {open && (
        <div className="sc-pop" role="menu" aria-label="Profile">
          <div className="sc-profile-card">
            <span className="sc-avatar sc-avatar--lg">{initials(username)}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>{username}</div>
              <div style={{ color: "#475569" }}>{role}</div>
              {city && (
                <div style={{ color: "#64748b", fontSize: 12.5, display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon name="pin" size={13} /> {city}, India
                </div>
              )}
            </div>
          </div>
          <div className="sc-kv">
            <div>
              <div className="sc-kv-label">Wallet</div>
              <div className="sc-kv-row">
                <span className="sc-wallet" title={walletAddress}>{shortenAddressFallback(walletAddress)}</span>
                <button type="button" className="sc-btn sc-btn--sm" onClick={copy}>
                  <Icon name="copy" size={14} /> {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div className="sc-kv-row">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                <span className={`sc-dot ${mmConnected ? "sc-dot--on" : "sc-dot--off"}`} />
                {mmConnected ? "MetaMask Connected" : "MetaMask Not Connected"}
              </span>
            </div>
            <div className="sc-kv-row">
              <span className="sc-kv-label" style={{ margin: 0 }}>Test ETH balance</span>
              <span style={{ fontWeight: 650, color: "#0f172a" }}>{balance !== null ? `${Number(balance).toFixed(3)} ETH` : "—"}</span>
            </div>
            {lowBalance && (
              <div className="sc-alert" style={{ marginBottom: 0, flexWrap: "wrap" }}>
                <Icon name="alert" size={16} />
                <span style={{ flex: 1 }}>Low test ETH balance</span>
                <button type="button" className="sc-btn sc-btn--sm" onClick={onFaucet} disabled={faucetLoading}>
                  {faucetLoading ? "Requesting..." : "Add 10 Test ETH"}
                </button>
              </div>
            )}
            {faucetMessage && <div style={{ fontSize: 12, color: "#64748b" }}>{faucetMessage}</div>}
          </div>
          <div className="sc-pop-foot">
            <button type="button" className="sc-btn sc-btn--block" onClick={onLogout}>
              <Icon name="logout" size={16} /> Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Header({ onMenu, right }) {
  return (
    <header className="sc-header">
      <div className="sc-brand">
        <button type="button" className="sc-icon-btn sc-menu-btn" onClick={onMenu} aria-label="Open navigation">
          <Icon name="menu" size={18} />
        </button>
        <BrandMark size={34} />
        <div style={{ minWidth: 0 }}>
          <div className="sc-brand-title">Pharmaceutical Supply Chain</div>
          <div className="sc-brand-sub">Secure · Transparent · Trusted</div>
        </div>
      </div>
      <div className="sc-header-right">{right}</div>
    </header>
  );
}

export function MetaMaskChip({ connected }) {
  return (
    <span className="sc-chip sc-chip--mm" title={connected ? "MetaMask is connected" : "MetaMask is not connected"}>
      <span className={`sc-dot ${connected ? "sc-dot--on" : "sc-dot--off"}`} />
      <span className="sc-mm-label">{connected ? "MetaMask Connected" : "MetaMask Disconnected"}</span>
    </span>
  );
}

export function WalletChip({ address }) {
  return (
    <span className="sc-chip sc-wallet-chip" title={address}>
      <Icon name="wallet" size={14} />
      <span className="sc-wallet">{shortenAddressFallback(address)}</span>
    </span>
  );
}
