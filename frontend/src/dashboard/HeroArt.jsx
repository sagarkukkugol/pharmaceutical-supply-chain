import { useState } from "react";
import { ROLE_IMAGES } from "./roleImages";

// Role-specific line illustrations for the overview banner (single-colour
// outline art, in keeping with the icon style — no photos, no colour).
const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };

function LineArt({ kind }) {
  return (
    <svg width="190" height="110" viewBox="0 0 190 110" aria-hidden="true" {...common}>
      <path d="M8 98h174" stroke="#cbd5e1" />
      {kind === "factory" && (
        <>
          <path d="M20 98V52l30 16V52l30 16V52l30 16V30h22v68" />
          <path d="M122 30V16h12v14M34 80h8M64 80h8M94 80h8M130 50h6M130 64h6M130 78h6" />
          <path d="M150 98V78h16v20" />
        </>
      )}
      {kind === "truck" && (
        <>
          <path d="M16 84V40h82v44M98 54h30l22 22v8H98" />
          <circle cx="44" cy="88" r="9" />
          <circle cx="128" cy="88" r="9" />
          <path d="M34 56h44M34 68h30" />
        </>
      )}
      {kind === "warehouse" && (
        <>
          <path d="M14 98V46l81-30 81 30v52" />
          <rect x="42" y="58" width="40" height="40" rx="2" />
          <rect x="108" y="58" width="40" height="40" rx="2" />
          <path d="M42 78h40M108 78h40M62 58v40M128 58v40" />
        </>
      )}
      {kind === "pharmacy" && (
        <>
          <path d="M22 98V44h146v54M14 44l12-24h138l12 24" />
          <path d="M95 52v26M82 65h26" strokeWidth="2.4" />
          <rect x="40" y="62" width="30" height="36" rx="2" />
          <rect x="120" y="62" width="30" height="24" rx="2" />
          <path d="M40 80h30M55 62v36" />
        </>
      )}
    </svg>
  );
}

// Banner picture for a role: the role's photo (same image as on the
// homepage), falling back to the outline art if the file can't load.
export default function HeroArt({ kind, role }) {
  const [failed, setFailed] = useState(false);
  const src = ROLE_IMAGES[role];
  if (!src || failed) return <LineArt kind={kind} />;
  return <img className="sc-hero-photo" src={src} alt={`${role} illustration`} onError={() => setFailed(true)} />;
}
