import { useState, useEffect, useRef } from "react";
import { searchUsers } from "../api";
import { shortenAddress } from "../participants";

// A "type a username, get a dropdown of matches" picker.
// Used by Manufacturer/Transporter/Distributor when transferring ownership,
// so nobody ever has to type or paste a wallet address.
//
// NEW: `roleFilter` restricts results to a single role — e.g. a
// Manufacturer's picker passes roleFilter="Distributor" so only
// Distributors ever show up here, matching what the smart contract will
// actually allow. This is a UX convenience only; the real guarantee is
// enforced on-chain in SupplyChain.sol regardless of what this shows.
export default function UserSearchSelect({ excludeUsername, roleFilter, onSelect }) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const boxRef = useRef(null);

  useEffect(() => {
    // Debounce so we're not hitting the backend on every keystroke.
    const handle = setTimeout(async () => {
      if (!query.trim()) {
        setMatches([]);
        return;
      }
      try {
        const results = await searchUsers(query.trim(), roleFilter);
        const filtered = excludeUsername
          ? results.filter((u) => u.username.toLowerCase() !== excludeUsername.toLowerCase())
          : results;
        setMatches(filtered);
        setOpen(true);
      } catch {
        setMatches([]);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, excludeUsername, roleFilter]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePick = (user) => {
    setSelected(user);
    setQuery(user.username);
    setOpen(false);
    onSelect(user);
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    setSelected(null);
    onSelect(null);
  };

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input
        type="text"
        placeholder="Type a username..."
        value={query}
        onChange={handleChange}
        onFocus={() => matches.length > 0 && setOpen(true)}
        style={inputStyle}
      />

      {open && matches.length > 0 && (
        <div style={dropdownStyle}>
          {matches.map((u) => (
            <div key={u.username} onClick={() => handlePick(u)} style={optionStyle}>
              <strong>{u.username}</strong> <span style={{ color: "#1d4ed8" }}>({u.role})</span>
              {u.city && <span style={{ color: "#64748b" }}> — {u.city}</span>}
              <br />
              <small style={{ color: "#64748b" }}>{shortenAddress(u.walletAddress)}</small>
            </div>
          ))}
        </div>
      )}

      {open && query.trim() && matches.length === 0 && (
        <div style={dropdownStyle}>
          <div style={{ padding: "10px", color: "#64748b" }}>No matching username.</div>
        </div>
      )}

      {selected && (
        <div style={confirmBoxStyle}>
          <strong>{selected.username}</strong>
          <br />
          <span style={{ color: "#1d4ed8" }}>{selected.role}</span>
          {selected.city && <span style={{ color: "#64748b" }}> — {selected.city}</span>}
          <br />
          <small style={{ color: "#94a3b8" }}>{selected.walletAddress}</small>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "8px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  fontSize: "16px",
  boxSizing: "border-box",
};

const dropdownStyle = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  zIndex: 10,
  maxHeight: "220px",
  overflowY: "auto",
  marginTop: "-4px",
};

const optionStyle = {
  padding: "10px 14px",
  cursor: "pointer",
  borderBottom: "1px solid #e2e8f0",
};

const confirmBoxStyle = {
  padding: "12px",
  marginTop: "8px",
  marginBottom: "8px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  backgroundColor: "#f8fafc",
};
