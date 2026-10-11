import "./dashboard.css";
import { useEffect } from "react";
import Shell from "./Shell";
import HeroArt from "./HeroArt";
import Icon from "./icons";
import { CONSUMER_NAV } from "./roleConfig";
import MedicineVerifier from "../components/MedicineVerifier";

// Public consumer experience: no login, no wallet — just "Verify
// Medicine". Same shell, typography, cards and icon style as every role.
export default function ConsumerApp({ initialCode, onBack }) {
  useEffect(() => {
    document.documentElement.classList.add("sc-fullbleed");
    return () => document.documentElement.classList.remove("sc-fullbleed");
  }, []);
  return (
    <Shell
      nav={CONSUMER_NAV}
      active="verify"
      onNavigate={() => {}}
      navLabel="Consumer"
      headerRight={
        <>
          <span className="sc-chip">
            <Icon name="shield" size={14} /> Public verification · no login needed
          </span>
          <button type="button" className="sc-btn" onClick={onBack}>
            <Icon name="home" size={16} /> Back to Home
          </button>
        </>
      }
    >
      <div className="sc-card sc-hero" style={{ maxWidth: 980, marginBottom: 20 }}>
        <div>
          <h1>Verify Medicine</h1>
          <p>Check authenticity, expiry and the complete supply-chain journey of your medicine.</p>
        </div>
        <div className="sc-hero-art"><HeroArt kind="pharmacy" role="Consumer" /></div>
      </div>
      <div style={{ maxWidth: 980 }}>
        <MedicineVerifier initialCode={initialCode} allowRating title="Check a medicine" />
      </div>
    </Shell>
  );
}
