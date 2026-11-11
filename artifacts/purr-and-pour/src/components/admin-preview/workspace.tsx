import {useEffect, useMemo, useReducer, useRef, useState} from "react";
import {Link, useLocation} from "wouter";
import {Coffee, Eye, RotateCcw, Sparkles} from "lucide-react";
import {asset} from "@/lib/cafe";
import {cafeReducer, createInitialState} from "./demo-model";
import {NAV, getQueue, Modal, PixelNumber, OrdersView, QueueView, MenuView, AnalyticsView, CustomerView, type View} from "./preview-views";
import SiteStructure from "./site-structure";
import "./admin.css";
import "./structure.css";

export default function AdminWorkspace({view, onSignOut}: {view: View; onSignOut: () => void}) {
  const [state, dispatch] = useReducer(cafeReducer, undefined, createInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [toast, setToast] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useMemo(() => getQueue(state), [state]);
  const flash = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  };
  const run = (action: Parameters<typeof dispatch>[0], success?: string) => {
    try {
      stateRef.current = cafeReducer(stateRef.current, action);
      dispatch(action);
      if (success) flash(success);
      return true;
    } catch (error) {
      flash(error instanceof Error ? error.message : "That update could not be made.");
      return false;
    }
  };
  const [, navigate] = useLocation();
  const changeView = (next: View) => navigate(`/admin/${next}`);
  useEffect(() => () => {if (toastTimer.current) clearTimeout(toastTimer.current);}, []);
  if (view === "structure") return <SiteStructure onBack={() => changeView("orders")} />;
  return <div className="admin-prototype admin-logged-in">
    <header className="admin-header">
      <Link href="/" className="admin-brand" aria-label="Back to the café" data-testid="link-admin-cafe">
        <img className="admin-brand-mark" src={asset("/logo.svg")} alt="" />
        <div><div className="admin-brand-name">Purr &amp; Pour</div><div className="admin-brand-sub">NEIGHBORHOOD COFFEE · ADMIN PROTOTYPE</div></div>
      </Link>
      <span className="admin-flag" data-testid="text-prototype-disclosure">Admin preview · sample data · simulated updates · no charges</span>
      <div className="admin-header-spacer" />
      <span className="admin-shift-label">TUESDAY SHIFT · 12:00–8:00 PM</span>
      <div className="admin-header-tools">
        <button type="button" className="admin-reset admin-header-light" onClick={() => changeView("structure")} data-testid="button-admin-site-structure">Site structure</button>
        <button type="button" className="admin-reset admin-header-light" onClick={onSignOut} data-testid="button-admin-signout">Sign out</button>
        <button type="button" className="admin-reset admin-header-light" onClick={() => setResetOpen(true)} data-testid="button-reset-demo"><RotateCcw size={14} /> Reset demo</button>
      </div>
    </header>
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-side-kicker">Behind the counter</div>
        <nav className="admin-nav" aria-label="Café operations">
          {NAV.map(({ id, label, Icon }) => <button key={id} type="button" aria-current={view === id ? "page" : undefined} onClick={() => changeView(id)} data-testid={`nav-${id}`}><Icon />{label}{id === "queue" && <PixelNumber className="admin-count" style={{ marginLeft: "auto", fontSize: 17 }}>{queue.length}</PixelNumber>}</button>)}
          <button type="button" aria-current={view === "customer" ? "page" : undefined} onClick={() => changeView("customer")} data-testid="nav-customer"><Eye />Guest window</button>
          <Link href="/" target="_blank" rel="noopener noreferrer" title="Open the live café in a new tab. Sample menu edits stay in Guest window." aria-label="View café (opens in a new tab)" data-testid="nav-view-cafe"><Coffee />View café ↗</Link>
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="admin-pet-staff">
            <svg viewBox="0 0 32 32" width="42" height="42" role="img" aria-label="Miso, pixel cat barista">
              <rect x="5" y="2" width="7" height="7" fill="#d9b86b" /><rect x="20" y="2" width="7" height="7" fill="#d9b86b" />
              <rect x="4" y="8" width="24" height="14" fill="#d9b86b" /><rect x="8" y="12" width="3" height="3" fill="#26332c" /><rect x="21" y="12" width="3" height="3" fill="#26332c" />
              <rect x="14" y="16" width="4" height="2" fill="#8d5c49" /><rect x="10" y="20" width="12" height="3" fill="#f1e8d2" />
              <rect x="7" y="23" width="18" height="7" fill="#61a9bd" /><rect x="3" y="26" width="5" height="4" fill="#61a9bd" /><rect x="24" y="26" width="5" height="4" fill="#61a9bd" />
              <rect x="13" y="24" width="6" height="4" fill="#e8d28c" />
            </svg>
            <div><strong><Sparkles size={14} style={{ display: "inline", verticalAlign: "-2px" }} /> MISO · BARISTA</strong><span>Steaming oat milk.<br />On shift since noon.</span></div>
          </div>
          <div className="admin-pet-footnote">The biscuit tin is looking low.</div>
        </div>
      </aside>
    <main className="admin-main">
        {view === "orders" && <OrdersView state={state} queue={queue} run={run} />}
        {view === "queue" && <QueueView state={state} queue={queue} run={run} />}
        {view === "menu" && <MenuView state={state} run={run} />}
        {view === "analytics" && <AnalyticsView state={state} />}
        {view === "customer" && <CustomerView state={state} run={run} flash={flash} />}
      </main>
    </div>
    <nav className="admin-mobile-tabs" aria-label="Café views">
      {([...NAV, { id: "customer" as View, label: "Guest", Icon: Eye }]).map(({ id, label, Icon }) => <button key={id} type="button" aria-current={view === id ? "page" : undefined} onClick={() => changeView(id)} data-testid={`mobile-nav-${id}`}><Icon /><span>{label}</span></button>)}
      <Link href="/" target="_blank" rel="noopener noreferrer" aria-label="View café (opens in a new tab)" data-testid="mobile-nav-view-cafe"><Coffee /><span>Café ↗</span></Link>
    </nav>
    {toast && <div className="admin-toast" role="status" aria-live="polite" data-testid="status-feedback">{toast}</div>}
    {resetOpen && <Modal title="Reset this shift?" onClose={() => setResetOpen(false)} testId="dialog-reset-demo" actions={<><button className="admin-btn admin-btn-quiet" onClick={() => setResetOpen(false)} data-testid="button-reset-keep">Keep working</button><button className="admin-btn admin-btn-hot" onClick={() => { dispatch({ type: "reset" }); setResetOpen(false); flash("Demo reset. Sample café restored."); }} data-testid="button-reset-confirm">Reset sample café</button></>}>
      <p>This clears every simulated order and menu change made during this visit, then brings back the original sample shift.</p>
      <p className="admin-subtle">Refresh also resets this sample shift. No backend, customer account, or payment data is touched.</p>
    </Modal>}
  </div>;
}
