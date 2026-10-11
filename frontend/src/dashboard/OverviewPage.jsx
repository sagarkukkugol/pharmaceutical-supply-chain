import { KpiCard, StatusDonut, ActivityList } from "./ui";
import BatchesPage from "./BatchesPage";
import HeroArt from "./HeroArt";
import PartnerRatings from "./PartnerRatings";
import Icon from "./icons";
import { PREVIEW_COLUMNS } from "./columnSets";
import { ROLE_CONFIG } from "./roleConfig";
import { timeAgo } from "../utils";

// Dashboard = an overview only: who am I, what am I responsible for,
// what's its status, what happened recently, and a SMALL preview of the
// batch list (the full management tables live on the role's own pages).
export default function OverviewPage({ session, view, allBatches, notifications, loading, error, onDetails, onOpenNotification, onNavigate }) {
  const cfg = ROLE_CONFIG[session.role];
  const statusOptions = view.overview.map((o) => o.label);
  return (
    <>
      <div className="sc-card sc-hero">
        <div>
          <h1>Welcome back, {session.username}</h1>
          <p>{cfg.blurb}</p>
          <div className="sc-hero-tags">
            <span className="sc-tag"><Icon name="user" size={13} /> {session.role}</span>
            {session.city && <span className="sc-tag"><Icon name="pin" size={13} /> {session.city}</span>}
            {cfg.tags.map((t) => (
              <span key={t} className="sc-tag">{t}</span>
            ))}
          </div>
        </div>
        <div className="sc-hero-art"><HeroArt kind={cfg.art} role={session.role} /></div>
      </div>

      {error && <div className="sc-alert" style={{ marginTop: 20, marginBottom: 0 }}><Icon name="alert" size={16} /> {error}</div>}

      <div className="sc-grid sc-grid--kpi">
        {view.kpis.map((k) => (
          <KpiCard key={k.key} label={k.label} value={k.value} icon={k.icon} hint={k.hint} />
        ))}
      </div>

      <div className="sc-grid sc-grid--2">
        <div className="sc-card">
          <div className="sc-card-head"><h2>Batch Status Overview</h2></div>
          <StatusDonut segments={view.overview} />
        </div>
        <div className="sc-card">
          <div className="sc-card-head"><h2>Recent Activity</h2></div>
          <ActivityList items={notifications.slice(0, 5)} onOpen={onOpenNotification} timeAgoFn={timeAgo} empty="No activity yet" />
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <BatchesPage
          title={cfg.previewTitle}
          rows={view.rows}
          allBatches={allBatches}
          columns={PREVIEW_COLUMNS[session.role]}
          loading={loading}
          onDetails={onDetails}
          statusOptions={statusOptions}
          qr={session.role === "Transporter"}
          preview
          pageSize={5}
          emptyText={session.role === "Manufacturer" ? "Register your first batch to see it here." : "Batches handed to you will appear here."}
          headRight={
            <button type="button" className="sc-details-link" onClick={() => onNavigate(cfg.listPage)}>
              View all <Icon name="arrowRight" size={14} />
            </button>
          }
        />
      </div>

      <div style={{ marginTop: 20 }}>
        <PartnerRatings walletAddress={session.walletAddress} />
      </div>
    </>
  );
}
