import { useCallback, useEffect, useMemo, useState } from "react";
import "./dashboard.css";
import Shell from "./Shell";
import { NotificationBell, ProfileMenu, MetaMaskChip, WalletChip } from "./Header";
import OverviewPage from "./OverviewPage";
import BatchesPage from "./BatchesPage";
import BatchDetailsModal from "./BatchDetailsModal";
import HistoryPage from "./HistoryPage";
import TransferWorkspace from "./TransferWorkspace";
import StockPage from "./StockPage";
import { ActiveShipmentsPage, ShipmentHistoryPage } from "./ShipmentPages";
import { PageHead } from "./ui";
import { PAGE_COLUMNS } from "./columnSets";
import { ROLE_CONFIG } from "./roleConfig";
import { buildRoleView, buildNotifications } from "./roleViews";
import { useChainData } from "./useChainData";
import { loadLocalState, saveShipments, saveVerifications, saveReadIds } from "./localState";
import RegisterBatchCard from "../components/RegisterBatchCard";
import MedicineVerifier from "../components/MedicineVerifier";
import { getBalance, isMetaMaskAvailable, getCurrentlyConnectedAccount } from "../contract";
import { requestFaucet } from "../api";

const LOW_BALANCE_THRESHOLD_ETH = 1;

function useFullBleed() {
  useEffect(() => {
    document.documentElement.classList.add("sc-fullbleed");
    return () => document.documentElement.classList.remove("sc-fullbleed");
  }, []);
}

// ============================================================
// OwnerDashboard — the signed-in experience for Manufacturer,
// Transporter, Distributor and Pharmacy. Auth, MetaMask, the account-
// switch safety logout and the faucet are unchanged from the original
// Dashboard; everything on screen now comes from one shared read of the
// real chain data (useChainData).
// ============================================================
export default function OwnerDashboard({ session, onLogout }) {
  useFullBleed();
  const { role, walletAddress } = session;
  const cfg = ROLE_CONFIG[role];

  const chain = useChainData();
  const [local, setLocal] = useState(() => loadLocalState(walletAddress));
  const [page, setPage] = useState("dashboard");
  const [detailsId, setDetailsId] = useState(null);

  // ----- balance + faucet (unchanged behaviour) -----
  const [balance, setBalance] = useState(null);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetMessage, setFaucetMessage] = useState("");
  const [mmConnected, setMmConnected] = useState(true);

  const refreshBalance = useCallback(async () => {
    try {
      setBalance(await getBalance(walletAddress));
    } catch (err) {
      console.error(err);
    }
  }, [walletAddress]);

  useEffect(() => {
    Promise.resolve().then(refreshBalance);
  }, [refreshBalance]);

  // If the user switches accounts / network inside MetaMask while this
  // dashboard is open, force a logout — any transaction would otherwise
  // be signed by a different account than the one shown here.
  useEffect(() => {
    if (!isMetaMaskAvailable()) return;
    let cancelled = false;
    getCurrentlyConnectedAccount().then((a) => {
      if (!cancelled) setMmConnected(!!a && a.toLowerCase() === walletAddress.toLowerCase());
    });
    const onAccounts = (accounts) => {
      const next = accounts?.[0];
      if (!next || next.toLowerCase() !== walletAddress.toLowerCase()) onLogout();
    };
    const onChain = () => onLogout();
    window.ethereum.on?.("accountsChanged", onAccounts);
    window.ethereum.on?.("chainChanged", onChain);
    return () => {
      cancelled = true;
      window.ethereum?.removeListener?.("accountsChanged", onAccounts);
      window.ethereum?.removeListener?.("chainChanged", onChain);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  const handleFaucet = async () => {
    setFaucetLoading(true);
    setFaucetMessage("");
    try {
      const data = await requestFaucet(walletAddress);
      setBalance(data.newBalance);
      setFaucetMessage(`Sent ${data.amount} test ETH. Tx: ${data.txHash.slice(0, 10)}...`);
    } catch (err) {
      setFaucetMessage(err.message);
    } finally {
      setFaucetLoading(false);
    }
  };

  // After ANY on-chain write: refresh balance + shared chain data so
  // tables, KPIs, owner/status, history, activity and notifications all
  // update together.
  const onChainChange = useCallback(() => {
    refreshBalance();
    chain.refresh();
  }, [refreshBalance, chain]);

  // ----- derived role data -----
  const view = useMemo(
    () => buildRoleView({ role, wallet: walletAddress, batches: chain.batches, local, userOf: chain.userOf }),
    [role, walletAddress, chain.batches, local, chain.userOf]
  );
  const notifications = useMemo(
    () => buildNotifications({ role, wallet: walletAddress, batches: chain.batches, events: chain.events, local, userOf: chain.userOf }),
    [role, walletAddress, chain.batches, chain.events, local, chain.userOf]
  );
  const unreadIds = useMemo(() => {
    const read = new Set(local.readIds);
    const baseline = local.firstSeen - 24 * 3600 * 1000;
    return new Set(notifications.filter((n) => !read.has(n.id) && n.ts * 1000 > baseline).map((n) => n.id));
  }, [notifications, local.readIds, local.firstSeen]);

  const markRead = (ids) =>
    setLocal((prev) => {
      const readIds = [...new Set([...prev.readIds, ...ids])];
      saveReadIds(walletAddress, readIds);
      return { ...prev, readIds };
    });

  const openNotification = (n) => {
    markRead([n.id]);
    setPage(n.nav && cfg.nav.some((i) => i.key === n.nav) ? n.nav : cfg.listPage);
    setDetailsId(n.batch.id);
  };

  // Transporter checkpoints (device-local; see localState.js).
  const recordCheckpoint = (row, action) =>
    setLocal((prev) => {
      const now = Date.now();
      const old = prev.shipments[row.id] || {};
      const entry = action === "pickup" ? { state: "picked", pickedAt: now } : { ...old, state: "transit", transitAt: now };
      const shipments = { ...prev.shipments, [row.id]: entry };
      saveShipments(walletAddress, shipments);
      return { ...prev, shipments };
    });

  const logVerification = (b) =>
    setLocal((prev) => {
      const last = prev.verifications[prev.verifications.length - 1];
      if (last && String(last.batchId) === String(b.id) && Date.now() - last.at < 60000) return prev;
      const verifications = [...prev.verifications, { batchId: b.id, batchCode: b.batchCode, productName: b.productName, at: Date.now() }];
      saveVerifications(walletAddress, verifications);
      return { ...prev, verifications };
    });

  const detailsBatch = detailsId ? chain.batches.find((b) => b.id === detailsId) || null : null;
  const openDetails = (row) => setDetailsId(row.id);
  const statusOptions = view.overview.map((o) => o.label);
  const common = { rows: view.rows, allBatches: chain.batches, loading: chain.loading, error: chain.error, onDetails: openDetails };

  const lowBalance = balance !== null && Number(balance) <= LOW_BALANCE_THRESHOLD_ETH;

  let content;
  switch (`${role}:${page}`) {
    case "Manufacturer:register":
      content = (
        <>
          <PageHead title="Register Batch" subtitle="Record a new pharmaceutical batch on the blockchain." />
          <div style={{ maxWidth: 780 }}>
            <RegisterBatchCard session={session} onDone={onChainChange} />
          </div>
        </>
      );
      break;
    case "Manufacturer:registered":
      content = (
        <BatchesPage
          {...common}
          title="Registered Batches"
          subtitle="Every batch you have registered."
          columns={PAGE_COLUMNS.registered}
          statusOptions={statusOptions}
          sortable
          emptyText="Register your first batch to see it here."
        />
      );
      break;
    case "Manufacturer:transfer":
      content = (
        <TransferWorkspace
          session={session}
          owned={view.rows.filter((r) => r.owned && r.deliveryStatus === 0)}
          allBatches={chain.batches}
          loading={chain.loading}
          error={chain.error}
          title="Ownership Transfer"
          subtitle="Hand a batch you hold to a Transporter."
          recipientLabel="transporter"
          emptyText="Batches you register — and still hold — can be transferred from here."
          onChainChange={onChainChange}
        />
      );
      break;
    case "Transporter:shipments":
      content = <ActiveShipmentsPage session={session} {...common} onCheckpoint={recordCheckpoint} onChainChange={onChainChange} />;
      break;
    case "Transporter:shipment-history":
      content = <ShipmentHistoryPage {...common} />;
      break;
    case "Distributor:received":
      content = (
        <BatchesPage
          {...common}
          title="Received Batches"
          subtitle="Every batch transferred to you."
          columns={PAGE_COLUMNS.distributorReceived}
          statusOptions={statusOptions}
          emptyText="Batches handed to you by a transporter will appear here."
        />
      );
      break;
    case "Distributor:inventory":
      content = (
        <BatchesPage
          {...common}
          rows={view.rows.filter((r) => r.owned)}
          title="Inventory"
          subtitle="Pharmaceutical stock currently in your custody."
          columns={PAGE_COLUMNS.inventory}
          statusOptions={["In Inventory", "Expired"]}
          emptyTitle="Inventory is empty"
          emptyText="Received batches that you have not dispatched yet appear here."
        />
      );
      break;
    case "Distributor:dispatch":
      content = (
        <TransferWorkspace
          session={session}
          owned={view.rows.filter((r) => r.owned)}
          allBatches={chain.batches}
          loading={chain.loading}
          error={chain.error}
          title="Dispatch to Pharmacy"
          subtitle="Transfer ownership of an inventory batch to an authorised pharmacy."
          recipientLabel="pharmacy"
          emptyText="Nothing in inventory to dispatch."
          onChainChange={onChainChange}
        />
      );
      break;
    case "Pharmacy:received":
      content = (
        <BatchesPage
          {...common}
          title="Received Batches"
          subtitle="Every batch a distributor has transferred to you."
          columns={PAGE_COLUMNS.pharmacyReceived}
          statusOptions={statusOptions}
          emptyText="Batches dispatched to you by a distributor will appear here."
        />
      );
      break;
    case "Pharmacy:stock":
      content = <StockPage session={session} {...common} onChainChange={onChainChange} />;
      break;
    case "Pharmacy:verify":
      content = (
        <MedicineVerifier
          title="Batch Verification"
          allowRating={false}
          onVerified={logVerification}
          intro="Check a batch against the blockchain before dispensing: scan its QR code, upload a QR image, or enter the batch code."
        />
      );
      break;
    case "Manufacturer:history":
    case "Distributor:history":
    case "Pharmacy:history":
      content = <HistoryPage {...common} statusOptions={statusOptions} />;
      break;
    default:
      content = (
        <OverviewPage
          session={session}
          view={view}
          allBatches={chain.batches}
          notifications={notifications}
          loading={chain.loading}
          error={chain.error}
          onDetails={openDetails}
          onOpenNotification={openNotification}
          onNavigate={setPage}
        />
      );
  }

  return (
    <>
      <Shell
        nav={cfg.nav}
        active={page}
        onNavigate={setPage}
        navLabel={role}
        headerRight={
          <>
            <NotificationBell
              items={notifications}
              unreadIds={unreadIds}
              onOpenItem={openNotification}
              onMarkAllRead={() => markRead(notifications.map((n) => n.id))}
            />
            <MetaMaskChip connected={mmConnected} />
            <WalletChip address={walletAddress} />
            <ProfileMenu
              session={session}
              balance={balance}
              lowBalance={lowBalance}
              onFaucet={handleFaucet}
              faucetLoading={faucetLoading}
              faucetMessage={faucetMessage}
              mmConnected={mmConnected}
              onLogout={onLogout}
            />
          </>
        }
      >
        {content}
      </Shell>
      <div className="sc-app" style={{ minHeight: 0, background: "transparent", display: "block" }}>
        <BatchDetailsModal batch={detailsBatch} onClose={() => setDetailsId(null)} />
      </div>
    </>
  );
}
