import { useState } from "react";
import { Header } from "./Header";
import { IconCircle } from "./icons";

// Header + sidebar + content frame shared by every role (and the public
// consumer view). Sidebar collapses to a drawer on narrow screens.
export default function Shell({ nav, active, onNavigate, headerRight, children, navLabel = "Menu" }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sc-app">
      <Header onMenu={() => setOpen((o) => !o)} right={headerRight} />
      <div className="sc-body">
        <nav className={`sc-sidebar${open ? " sc-sidebar--open" : ""}`} aria-label="Primary">
          <div className="sc-nav-label">{navLabel}</div>
          {nav.map((item) => (
            <button
              key={item.key}
              type="button"
              className="sc-nav-item"
              aria-current={active === item.key ? "page" : undefined}
              onClick={() => {
                onNavigate(item.key);
                setOpen(false);
              }}
            >
              <IconCircle name={item.icon} tone={active === item.key ? "white" : "gray"} size="sm" />
              {item.label}
            </button>
          ))}
        </nav>
        {open && <div className="sc-scrim sc-scrim--open" onClick={() => setOpen(false)} />}
        <main className="sc-main">{children}</main>
      </div>
    </div>
  );
}
