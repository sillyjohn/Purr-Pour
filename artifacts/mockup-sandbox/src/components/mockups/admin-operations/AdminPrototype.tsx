import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import {
  Activity, Archive, BarChart3, Bell, Check, ChevronDown, ChevronLeft, ChevronRight, Coffee, Eye,
  EyeOff, ListOrdered, Menu as MenuIcon, Minus, PackagePlus, Pencil, Plus, RotateCcw, Search,
  ShoppingBag, SlidersHorizontal, Sparkles, X,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  cafeReducer, createInitialState, DEMO_CUSTOMER_ID, DEMO_CLOCK, deriveAnalytics, formatLA,
  formatMoney, laDateKey, orderTotalCents, parsePriceToCents, type CafeOrder, type DateRange,
  type MenuCategory, type MenuItem, type OrderLine, type OrderStatus,
} from "./_model";
import "./admin.css";
import "./AdminPrototype.css";

type View = "orders" | "queue" | "menu" | "analytics" | "customer" | "login" | "structure";
const DEMO_ADMIN = { email: "manager@purrandpour.demo", password: "miso-after-hours" };
const NAV: { id: View; label: string; Icon: typeof Coffee }[] = [
  { id: "orders", label: "Orders", Icon: ShoppingBag },
  { id: "queue", label: "Queue", Icon: ListOrdered },
  { id: "menu", label: "Edit Menu", Icon: MenuIcon },
  { id: "analytics", label: "Analytics", Icon: BarChart3 },
];
const STATUSES: OrderStatus[] = ["placed", "inprogress", "complete", "cancelled"];
const STATUS_LABEL: Record<OrderStatus, string> = { placed: "Placed", inprogress: "In progress", complete: "Complete · ready for pickup", cancelled: "Cancelled" };
const STATUS_SHORT: Record<OrderStatus, string> = { placed: "placed", inprogress: "in progress", complete: "ready", cancelled: "cancelled" };
const labelForCategory = (categoryKey: string, categories: MenuCategory[]) => categories.find((category) => category.key === categoryKey)?.label ?? categoryKey;
const dateFromDemo = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(DEMO_CLOCK));
const chartColors = { main: "#61A9BD", pale: "#8CCEDE", yellow: "#CED14E", green: "#44986D", pink: "#DD83C9" };
const numeralStyle: CSSProperties = {
  fontFamily: "'VT323', monospace",
  fontVariantNumeric: "tabular-nums",
  letterSpacing: ".025em",
};
const metricNumeralStyle: CSSProperties = { ...numeralStyle, fontSize: 34, lineHeight: .9 };

function PixelNumber({ children, style, className }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return <span className={className} style={{ ...numeralStyle, ...style }}>{children}</span>;
}

function getQueue(state: ReturnType<typeof createInitialState>) {
  return state.queueOrderIds.map((id) => state.orders.find((order) => order.id === id)).filter((order): order is CafeOrder => !!order && (order.status === "placed" || order.status === "inprogress"));
}

function summarizeOrder(order: CafeOrder) {
  return order.lines.map((entry) => `${entry.quantity} × ${entry.name}`).join(" · ");
}

function useEscClose(onClose: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [active, onClose]);
}

function Modal({ title, children, onClose, actions, testId }: {
  title: string; children: ReactNode; onClose: () => void; actions: ReactNode; testId: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEscClose(onClose, true);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => previous?.focus();
  }, []);
  return <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby={`${testId}-title`} tabIndex={-1} ref={ref} data-testid={testId} onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const controls = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex="0"]') ?? []);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <h2 id={`${testId}-title`}>{title}</h2>
      <button type="button" className="admin-btn admin-btn-quiet admin-btn-small" style={{ float: "right", marginTop: -37 }} onClick={onClose} aria-label="Close dialog" data-testid={`button-close-${testId}`}><X size={16} /></button>
      <div>{children}</div>
      <div className="admin-modal-actions">{actions}</div>
    </section>
  </div>;
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`admin-status admin-status-${status}`} data-testid={`status-order-${status}`}>{STATUS_LABEL[status]}</span>;
}

function OrderLines({ lines, dark = false }: { lines: OrderLine[]; dark?: boolean }) {
  return <ul className={dark ? "admin-order-lines" : ""} style={!dark ? { listStyle: "none", padding: 0, margin: "7px 0", font: "17px 'VT323',monospace" } : undefined}>
    {lines.map((entry, index) => <li key={`${entry.menuItemId}-${index}`} data-testid={`line-order-${entry.menuItemId}-${index}`}>
      <strong>{entry.quantity}× {entry.name}</strong>
      <span className={dark ? "admin-muted-board" : "admin-subtle"}> · {entry.categoryName} · {entry.temperature}{entry.milk !== "none" ? `, ${entry.milk} milk` : ""} · {formatMoney(entry.priceCents)} ea</span>
      {entry.notes && <span className={dark ? "admin-muted-board" : "admin-subtle"}> · note: {entry.notes}</span>}
    </li>)}
  </ul>;
}

function OrderDetail({ order }: { order: CafeOrder }) {
  return <div className="admin-order-detail" data-testid={`detail-order-${order.id}`}>
    <OrderLines lines={order.lines} dark />
    {order.notes && <p className="admin-muted-board">Cup note: “{order.notes}”</p>}
    <div className="admin-order-detail-row"><span>Order total</span><strong>{formatMoney(orderTotalCents(order))}</strong></div>
    <div className="admin-order-detail-row"><span>Placed</span><span>{formatLA(order.createdAt)}</span></div>
    <div className="admin-order-detail-row"><span>Last updated</span><span>{formatLA(order.updatedAt)}</span></div>
    <details style={{ marginTop: 7 }}>
      <summary style={{ cursor: "pointer", font: "15px 'Pixelify Sans',monospace", color: "#ead895" }}>Status history · {order.history.length}</summary>
      <ul style={{ paddingLeft: 18, margin: "5px 0", font: "15px 'VT323',monospace" }}>
        {order.history.map((event, index) => <li key={`${event.at}-${index}`}>{STATUS_LABEL[event.status]} · {formatLA(event.at)}</li>)}
      </ul>
    </details>
  </div>;
}

function AdminPrototype() {
  const [state, dispatch] = useReducer(cafeReducer, undefined, createInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [view, setView] = useState<View>(() => {
    const requested = new URLSearchParams(window.location.search).get("view");
    return requested === "structure" ? "structure" : "login";
  });
  const [signedIn, setSignedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
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
  const changeView = (next: View) => {
    setView(next);
    window.history.replaceState(null, "", `${window.location.pathname}?view=${next}`);
  };
  const authenticateDemo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loginEmail.trim().toLowerCase() !== DEMO_ADMIN.email || loginPassword !== DEMO_ADMIN.password) {
      setLoginError("That sample sign-in did not match. Use the preview credentials below.");
      return;
    }
    setLoginError("");
    setLoginPassword("");
    setSignedIn(true);
    setView("orders");
    window.history.replaceState(null, "", `${window.location.pathname}?view=orders`);
    flash("Demo sign-in accepted · opened /admin/orders");
  };

  if (view === "structure") {
    return <SiteStructure onBack={() => changeView(signedIn ? "orders" : "login")} />;
  }

  if (!signedIn) {
    return <div className="admin-prototype">
      <header className="admin-header">
        <div className="admin-brand"><img className="admin-brand-mark" src="/__mockup/images/welcome-wall/logo.svg" alt="" />
          <div><div className="admin-brand-name">Purr &amp; Pour</div><div className="admin-brand-sub">NEIGHBORHOOD COFFEE · BACK ROOM</div></div>
        </div>
        <span className="admin-flag">Sign-in route concept · demo only</span>
        <div className="admin-header-spacer" />
        <span className="admin-shift-label">LOCAL PREVIEW</span>
        <button type="button" className="admin-reset" onClick={() => changeView("structure")} data-testid="button-site-structure">Site structure</button>
      </header>
      <main className="admin-auth-page">
        <div className="admin-auth-grid">
          <section className="admin-auth-story" aria-labelledby="backroom-title">
            <span className="admin-auth-eyebrow">THE BACK ROOM · STAFF ONLY</span>
            <h1 id="backroom-title" className="admin-view-title">The café runs up front.<br />The shift runs back here.</h1>
            <p>Orders, queue, menu and today’s numbers — in one little room behind the chalkboard.</p>
            <div className="admin-auth-route-card"><span className="admin-auth-sprite" aria-hidden="true">M</span>
              <div><strong>One quiet route.</strong><span>After sign-in, staff land on the live ticket rail.</span></div>
              <code>/admin/orders</code>
            </div>
            <div className="admin-auth-structure-callout"><span className="admin-auth-eyebrow">NEW HERE?</span><span>See how the public café and staff back room fit together.</span>
              <button type="button" className="admin-btn admin-btn-quiet admin-btn-small" onClick={() => changeView("structure")}>Read the site map <ChevronRight size={14} /></button>
            </div>
          </section>
          <section className="admin-auth-card" aria-labelledby="admin-login-title">
            <div className="admin-auth-card-top"><span className="admin-auth-eyebrow">STAFF SIGN IN</span><span className="admin-auth-seal">PIXEL<br />GATED</span></div>
            <h2 id="admin-login-title">Clock in, barista.</h2>
            <p className="admin-auth-card-subtitle">Use an admin account to enter the staff workspace.</p>
            <form className="admin-auth-form" onSubmit={authenticateDemo}>
              <label><span className="admin-label">Admin email</span><input type="email" className="admin-field" autoComplete="username" required value={loginEmail} onChange={(event) => { setLoginEmail(event.target.value); setLoginError(""); }} placeholder="manager@purrandpour.demo" data-testid="input-admin-email" /></label>
              <label><span className="admin-label">Password</span><span className="admin-auth-password-field"><input type={showPassword ? "text" : "password"} className="admin-field" autoComplete="current-password" required value={loginPassword} onChange={(event) => { setLoginPassword(event.target.value); setLoginError(""); }} placeholder="Your back-room passphrase" data-testid="input-admin-password" /><button type="button" className="admin-auth-eye" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>
              {loginError && <p className="admin-alert" role="alert" data-testid="error-admin-login">{loginError}</p>}
              <button className="admin-btn admin-btn-hot admin-auth-submit" type="submit" data-testid="button-admin-login"><ShoppingBag size={16} /> Open the back room <ChevronRight size={16} /></button>
            </form>
            <div className="admin-demo-credentials">
              <div><strong>LOCAL PREVIEW ONLY</strong><span>This sample credential is public by design; no real user, server, or role is checked.</span></div>
              <code>{DEMO_ADMIN.email}<br />{DEMO_ADMIN.password}</code>
              <button type="button" className="admin-btn admin-btn-quiet admin-btn-small" onClick={() => { setLoginEmail(DEMO_ADMIN.email); setLoginPassword(DEMO_ADMIN.password); setLoginError(""); }} data-testid="button-fill-demo">Fill sample credentials</button>
            </div>
            <div className="admin-auth-card-footer"><span>Regular guest?</span><span>Return to the café homepage in the live app.</span></div>
          </section>
        </div>
        <div className="admin-auth-disclosure"><Bell size={14} /><span>Prototype sign-in only · no production authentication · no account or order data accessed</span></div>
      </main>
    </div>;
  }

  return <div className="admin-prototype admin-logged-in">
    <header className="admin-header">
      <div className="admin-brand">
        <img className="admin-brand-mark" src="/__mockup/images/welcome-wall/logo.svg" alt="" />
        <div><div className="admin-brand-name">Purr &amp; Pour</div><div className="admin-brand-sub">NEIGHBORHOOD COFFEE · ADMIN PROTOTYPE</div></div>
      </div>
      <span className="admin-flag" data-testid="text-prototype-disclosure">Demo role · sample data · simulated updates · no charges</span>
      <div className="admin-header-spacer" />
      <span className="admin-shift-label">TUESDAY SHIFT · 12:00–8:00 PM</span>
      <div className="admin-header-tools">
        <button type="button" className="admin-reset admin-header-light" onClick={() => changeView("structure")} data-testid="button-admin-site-structure">Site structure</button>
        <button type="button" className="admin-reset admin-header-light" onClick={() => { setSignedIn(false); setLoginEmail(""); setLoginPassword(""); changeView("login"); }} data-testid="button-admin-signout">Sign out</button>
        <button type="button" className="admin-reset admin-header-light" onClick={() => setResetOpen(true)} data-testid="button-reset-demo"><RotateCcw size={14} /> Reset demo</button>
      </div>
    </header>
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-side-kicker">Behind the counter</div>
        <nav className="admin-nav" aria-label="Café operations">
          {NAV.map(({ id, label, Icon }) => <button key={id} type="button" aria-current={view === id ? "page" : undefined} onClick={() => changeView(id)} data-testid={`nav-${id}`}><Icon />{label}{id === "queue" && <PixelNumber className="admin-count" style={{ marginLeft: "auto", fontSize: 17 }}>{queue.length}</PixelNumber>}</button>)}
          <button type="button" aria-current={view === "customer" ? "page" : undefined} onClick={() => changeView("customer")} data-testid="nav-customer"><Eye />Guest window</button>
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
    </nav>
    {toast && <div className="admin-toast" role="status" aria-live="polite" data-testid="status-feedback">{toast}</div>}
    {resetOpen && <Modal title="Reset this shift?" onClose={() => setResetOpen(false)} testId="dialog-reset-demo" actions={<><button className="admin-btn admin-btn-quiet" onClick={() => setResetOpen(false)} data-testid="button-reset-keep">Keep working</button><button className="admin-btn admin-btn-hot" onClick={() => { dispatch({ type: "reset" }); setResetOpen(false); flash("Demo reset. Sample café restored."); }} data-testid="button-reset-confirm">Reset sample café</button></>}>
      <p>This clears every simulated order and menu change made during this visit, then brings back the original sample shift.</p>
      <p className="admin-subtle">Refresh also resets this sample shift. No backend, customer account, or payment data is touched.</p>
    </Modal>}
  </div>;
}

function SiteStructure({ onBack }: { onBack: () => void }) {
  return <div className="admin-prototype admin-structure-shell">
    <header className="admin-header">
      <div className="admin-brand"><img className="admin-brand-mark" src="/__mockup/images/welcome-wall/logo.svg" alt="" />
        <div><div className="admin-brand-name">Purr &amp; Pour</div><div className="admin-brand-sub">NEIGHBORHOOD COFFEE · SITE MAP</div></div>
      </div>
      <span className="admin-flag">Current storefront + proposed staff route</span><div className="admin-header-spacer" />
      <button type="button" className="admin-reset" onClick={onBack} data-testid="button-back-from-structure">Return to back room <ChevronRight size={14} /></button>
    </header>
    <main className="admin-structure-page">
      <div className="admin-auth-heading">
        <div><span className="admin-auth-eyebrow">HOW THE SHOP FITS TOGETHER</span><h1 className="admin-view-title">A small counter, one clear route map.</h1>
          <p className="admin-view-subtitle">The public café stays on the counter. Staff tools belong behind a separate, role-checked door.</p></div>
        <span className="admin-pill">Current + proposed</span>
      </div>
      <div className="admin-structure-grid">
        <section className="admin-structure-card" aria-labelledby="current-site-heading">
          <div className="admin-structure-top"><span className="admin-auth-eyebrow">LIVE ROUTES IN App.tsx</span><span className="admin-structure-tag admin-tag-live">Current website</span></div>
          <h2 id="current-site-heading">Purr &amp; Pour · customer-facing</h2>
          <div className="admin-tree">
            <div className="admin-tree-node admin-tree-root"><code>App.tsx</code><span>Wouter router · ClerkProvider · query cache</span></div>
            <div className="admin-tree-row"><span className="admin-tree-branch">├──</span><div><code>/</code><b>Cafe</b><small>One café scene · Menu, Tickets, Crew, Cart &amp; Settings drawers · Miso at the counter</small></div></div>
            <div className="admin-tree-row"><span className="admin-tree-branch">├──</span><div><code>/sign-in</code><b>Customer sign in</b><small>Clerk-hosted flow for regulars</small></div></div>
            <div className="admin-tree-row"><span className="admin-tree-branch">├──</span><div><code>/sign-up</code><b>Customer sign up</b><small>Create a regular’s account</small></div></div>
            <div className="admin-tree-row"><span className="admin-tree-branch">└──</span><div><code>fallback</code><b>Not found</b><small>Unknown paths land here today</small></div></div>
          </div>
          <div className="admin-structure-footnote">Source files: <code>artifacts/purr-and-pour/src/App.tsx</code>, <code>src/pages/cafe.tsx</code>, <code>src/components/cafe-scene.tsx</code> and <code>src/components/drawers.tsx</code>.</div>
        </section>
        <section className="admin-structure-card admin-structure-card-plan" aria-labelledby="planned-admin-heading">
          <div className="admin-structure-top"><span className="admin-auth-eyebrow">PROPOSED · NOT YET WIRED</span><span className="admin-structure-tag admin-tag-plan">New staff route</span></div>
          <h2 id="planned-admin-heading">The admin back room</h2>
          <div className="admin-tree">
            <div className="admin-tree-node admin-tree-root"><code>/admin</code><span>Signed-in staff identity + server-verified admin role</span></div>
            <div className="admin-tree-row"><span className="admin-tree-branch">├──</span><div><code>/admin/orders</code><b>Ticket rail</b><small>View tickets · apply the four agreed statuses</small></div></div>
            <div className="admin-tree-row"><span className="admin-tree-branch">├──</span><div><code>/admin/queue</code><b>Barista priority</b><small>Manually reorder the active queue</small></div></div>
            <div className="admin-tree-row"><span className="admin-tree-branch">├──</span><div><code>/admin/menu</code><b>Edit Menu</b><small>Items, availability and custom sections</small></div></div>
            <div className="admin-tree-row"><span className="admin-tree-branch">└──</span><div><code>/admin/analytics</code><b>Shift ledger</b><small>Sale totals, category mix and order timing</small></div></div>
          </div>
          <div className="admin-structure-footnote">Planned entry: <code>/admin</code> → Clerk sign-in → server role check → redirect to <code>/admin/orders</code>. Real route and permissions need app/API integration.</div>
        </section>
      </div>
      <div className="admin-structure-notice" role="note"><strong>Security line</strong><span>The credential form here is a local interaction demo. A production role gate must be checked on the server for every admin route and API operation; hiding a link is not authorization.</span></div>
    </main>
  </div>;
}

function OrdersView({ state, queue, run }: {
  state: ReturnType<typeof createInitialState>; queue: CafeOrder[]; run: (action: Parameters<typeof cafeReducer>[1], success?: string) => void;
}) {
  const [filter, setFilter] = useState<"current" | "history" | "all">("current");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>("ord-108");
  const currentIds = new Set(queue.map((order) => order.id));
  const visible = state.orders.filter((order) => {
    const isCurrent = currentIds.has(order.id);
    if (filter === "current" && !isCurrent) return false;
    if (filter === "history" && isCurrent) return false;
    if (statusFilter !== "all" && order.status !== statusFilter) return false;
    const search = query.trim().toLowerCase();
    return !search || [order.number, order.customerName, ...order.lines.map((entry) => entry.name)].join(" ").toLowerCase().includes(search);
  });
  return <>
    <div className="admin-view-head">
      <div><h1 className="admin-view-title">The ticket rail</h1><p className="admin-view-subtitle">A familiar face, a familiar order. Keep the good cups moving.</p></div>
      <div className="admin-view-actions"><span className="admin-pill"><Activity size={14} /> Shift open</span><span className="admin-pill"><span className="admin-count">{queue.length}</span> in queue</span></div>
    </div>
    <div className="admin-content">
      <div className="admin-kpi-row">
        <div className="admin-kpi"><div className="admin-kpi-label">Waiting on the rail</div><div className="admin-kpi-value"><PixelNumber style={metricNumeralStyle}>{queue.filter((entry) => entry.status === "placed").length}</PixelNumber></div><div className="admin-kpi-note">Ready for a barista</div></div>
        <div className="admin-kpi"><div className="admin-kpi-label">On the bar</div><div className="admin-kpi-value"><PixelNumber style={metricNumeralStyle}>{queue.filter((entry) => entry.status === "inprogress").length}</PixelNumber></div><div className="admin-kpi-note">Being made right now</div></div>
        <div className="admin-kpi"><div className="admin-kpi-label">Ready for pickup</div><div className="admin-kpi-value"><PixelNumber style={metricNumeralStyle}>{state.orders.filter((entry) => entry.status === "complete").length}</PixelNumber></div><div className="admin-kpi-note">No collected state in this demo</div></div>
        <div className="admin-kpi"><div className="admin-kpi-label">Today's tickets</div><div className="admin-kpi-value"><PixelNumber style={metricNumeralStyle}>{state.orders.filter((entry) => laDateKey(entry.createdAt) === dateFromDemo).length}</PixelNumber></div><div className="admin-kpi-note">Sample Nov 10 · Los Angeles</div></div>
      </div>
      <div className="admin-toolbar">
        <div className="admin-segment" role="group" aria-label="Order date group">
          {(["current", "history", "all"] as const).map((item) => <button type="button" key={item} aria-pressed={filter === item} onClick={() => setFilter(item)} data-testid={`filter-orders-${item}`}>{item === "current" ? "Current" : item === "history" ? "History" : "All tickets"}</button>)}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 5 }}><SlidersHorizontal size={16} /><select className="admin-field" style={{ width: "auto", minHeight: 36 }} aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as OrderStatus | "all")} data-testid="select-order-status"><option value="all">All statuses</option>{STATUSES.map((status) => <option value={status} key={status}>{STATUS_LABEL[status]}</option>)}</select></label>
        <label style={{ position: "relative", flex: "1 1 160px", maxWidth: 290 }}><Search size={15} style={{ position: "absolute", left: 9, top: 11, color: "#786858" }} /><input className="admin-field" style={{ paddingLeft: 30, minHeight: 36 }} placeholder="Order, neighbor, drink…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search tickets" data-testid="input-search-orders" /></label>
        <span className="admin-subtle" data-testid="text-order-result-count">{visible.length} tickets</span>
      </div>
      {visible.length ? <div className="admin-panel admin-board">
        {visible.map((order) => <article className="admin-order-card" key={order.id} data-testid={`card-order-${order.id}`}>
          <div>
            <button type="button" className="admin-order-name" style={{ border: 0, padding: 0, background: "none", cursor: "pointer" }} aria-expanded={expanded === order.id} onClick={() => setExpanded(expanded === order.id ? null : order.id)} data-testid={`button-order-detail-${order.id}`}><PixelNumber style={{ fontSize: 22 }}>#{order.number}</PixelNumber> · {order.customerName} <ChevronDown size={15} style={{ verticalAlign: "-2px" }} /></button>
            <div className="admin-order-meta">{formatLA(order.createdAt)} · {order.lines.reduce((sum, entry) => sum + entry.quantity, 0)} items · {formatMoney(orderTotalCents(order))}{order.practice ? " · practice" : ""}{!order.paid ? " · unpaid" : ""}</div>
            <ul className="admin-order-lines">{order.lines.map((entry, i) => <li key={`${entry.menuItemId}-${i}`}>{entry.quantity}× {entry.name} <span className="admin-muted-board">· {entry.temperature}{entry.milk !== "none" ? `, ${entry.milk}` : ""}</span></li>)}</ul>
            {order.notes && <div className="admin-order-meta">Note: “{order.notes}”</div>}
            {expanded === order.id && <OrderDetail order={order} />}
          </div>
          <div className="admin-order-tools">
            <StatusBadge status={order.status} />
            <label className="admin-subtle" style={{ display: "flex", alignItems: "center", gap: 4 }}>Set status
              <select className="admin-field" style={{ width: 122, minHeight: 34, padding: "4px" }} aria-label={`Set status for order ${order.number}`} value={order.status} onChange={(event) => run({ type: "set-status", orderId: order.id, status: event.target.value as OrderStatus }, `#${order.number} is now ${STATUS_SHORT[event.target.value as OrderStatus]}.`)} data-testid={`select-status-${order.id}`}>
                {STATUSES.map((status) => <option value={status} key={status}>{STATUS_LABEL[status]}</option>)}
              </select>
            </label>
          </div>
        </article>)}
      </div> : <div className="admin-panel admin-board admin-empty"><div><strong>No tickets on this part of the rail.</strong>Try another filter or clear the search.</div></div>}
      <section className="admin-panel admin-board admin-event-log" aria-label="Simulated shift event log">
        <div className="admin-event-heading"><span><Bell size={15} /> Shift notes</span><span className="admin-muted-board">Simulated event log · newest first</span></div>
        {state.events.slice(0, 5).map((event) => <div className="admin-event-row" key={event.id} data-testid={`event-${event.id}`}><span className="admin-event-dot" /><span>{event.text}</span><time>{formatLA(event.at)}</time></div>)}
      </section>
    </div>
  </>;
}

function QueueView({ state, queue, run }: {
  state: ReturnType<typeof createInitialState>; queue: CafeOrder[]; run: (action: Parameters<typeof cafeReducer>[1], success?: string) => void;
}) {
  return <>
    <div className="admin-view-head"><div><h1 className="admin-view-title">On the rail</h1><p className="admin-view-subtitle">FIFO by default. Nudge a ticket when the rush calls for it.</p></div><span className="admin-pill"><ListOrdered size={15} /> {queue.length} active</span></div>
    <div className="admin-content">
      <div className="admin-alert" style={{ marginBottom: 12 }}>Only placed and in-progress cups live here. Ready and cancelled tickets leave the rail, but stay in the order book.</div>
      <div className="admin-panel admin-board">
        {queue.length ? queue.map((order, index) => <article className="admin-order-card" key={order.id} data-testid={`queue-order-${order.id}`}>
          <div>
            <div className="admin-order-name"><PixelNumber style={{ fontSize: 22 }}>#{order.number}</PixelNumber> · {order.customerName}<span className="admin-priority" style={{ marginLeft: 8 }}><PixelNumber style={{ fontSize: 17 }}>#{index + 1}</PixelNumber> in line</span></div>
            <div className="admin-order-meta">{formatLA(order.createdAt)} · {formatMoney(orderTotalCents(order))} {order.practice ? "· practice cup" : ""}</div>
            <ul className="admin-order-lines">{order.lines.map((entry, i) => <li key={`${entry.menuItemId}-${i}`}>{entry.quantity}× {entry.name} <span className="admin-muted-board">· {entry.temperature}{entry.milk !== "none" ? `, ${entry.milk}` : ""}</span>{entry.notes && <span className="admin-muted-board"> · {entry.notes}</span>}</li>)}</ul>
            {order.notes && <div className="admin-order-meta">Cup note: “{order.notes}”</div>}
          </div>
          <div className="admin-order-tools">
            <StatusBadge status={order.status} />
            <button type="button" className="admin-btn admin-btn-dark admin-btn-small" disabled={index === 0} aria-label={`Move order ${order.number} up in the queue`} onClick={() => run({ type: "move-queue", orderId: order.id, direction: -1 }, `#${order.number} moved up one place.`)} data-testid={`button-queue-up-${order.id}`}><ChevronLeft size={15} /> Up</button>
            <button type="button" className="admin-btn admin-btn-dark admin-btn-small" disabled={index === queue.length - 1} aria-label={`Move order ${order.number} down in the queue`} onClick={() => run({ type: "move-queue", orderId: order.id, direction: 1 }, `#${order.number} moved down one place.`)} data-testid={`button-queue-down-${order.id}`}>Down <ChevronRight size={15} /></button>
            <select className="admin-field" style={{ width: 145, minHeight: 34, padding: 4 }} aria-label={`Update queue status for order ${order.number}`} value={order.status} onChange={(event) => run({ type: "set-status", orderId: order.id, status: event.target.value as OrderStatus }, `#${order.number} is now ${STATUS_SHORT[event.target.value as OrderStatus]}.`)} data-testid={`select-queue-status-${order.id}`}>{STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}</select>
          </div>
        </article>) : <div className="admin-empty"><div><strong>Rail is clear.</strong>Wipe the steam wand; the next neighbor will be here soon.</div></div>}
      </div>
      <p className="admin-subtle" style={{ marginTop: 10 }}>Queue position is shown to a guest only for their own placed or in-progress order.</p>
    </div>
  </>;
}

function MenuView({ state, run }: {
  state: ReturnType<typeof createInitialState>; run: (action: Parameters<typeof cafeReducer>[1], success?: string) => boolean;
}) {
  const [editing, setEditing] = useState<MenuItem | "new" | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<MenuItem | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const shown = state.menu.filter((item) => showArchived || !item.archived);
  const categories = state.categories;
  const addCategory = () => {
    if (!categoryDraft.trim()) { setCategoryError("Enter a section name."); return; }
    if (run({ type: "create-menu-category", name: categoryDraft }, `${categoryDraft.trim()} section added.`)) {
      setCategoryDialogOpen(false);
      setCategoryDraft("");
      setCategoryError("");
    } else setCategoryError("That section already exists or the name is too long.");
  };
  const saveMenuItem = (item: MenuItem) => {
    if (run({ type: "save-menu-item", item }, `${item.name} saved to the chalkboard.`)) setEditing(null);
  };
  return <>
    <div className="admin-view-head">
      <div><h1 className="admin-view-title">Chalkboard specials</h1><p className="admin-view-subtitle">A small board of neighborhood favorites. Changes show up at the guest window.</p></div>
      <div style={{display:"flex",gap:7,flexWrap:"wrap",justifyContent:"flex-end"}}><button className="admin-btn admin-btn-quiet" type="button" onClick={() => {setCategoryDraft("");setCategoryError("");setCategoryDialogOpen(true);}} data-testid="button-add-menu-category"><Plus size={16} /> Add category</button><button className="admin-btn admin-btn-hot" type="button" onClick={() => setEditing("new")} data-testid="button-add-menu-item"><PackagePlus size={16} /> Add a menu item</button></div>
    </div>
    <div className="admin-content">
      <div className="admin-toolbar">
        <span className="admin-pill"><Coffee size={14} /> {state.menu.filter((item) => !item.archived && item.available).length} available now</span>
        <button className="admin-btn admin-btn-quiet admin-btn-small" type="button" onClick={() => setShowArchived(!showArchived)} aria-pressed={showArchived} data-testid="toggle-archived-items">{showArchived ? <EyeOff size={14} /> : <Eye size={14} />}{showArchived ? "Hide archive" : "Show archive"}</button>
        <span className="admin-subtle">Archived items stay attached to old tickets.</span>
      </div>
      <div className="admin-grid-two">
        {categories.map((category) => {
          const categoryItems = shown.filter((item) => item.categoryKey === category.key);
          return <section className="admin-board" key={category.key} aria-label={`${category.label} menu`} data-testid={`category-menu-${category.key}`}>
          <div style={{ padding: "10px 12px", borderBottom: "1px dashed rgba(225,225,204,.34)", display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2 className="admin-board-title" style={{ margin: 0 }}>{category.label}</h2><span className="admin-tag">{categoryItems.length} on board</span></div>
          {categoryItems.length ? categoryItems.map((item) => <div className="admin-menu-row" key={item.id} data-testid={`row-menu-${item.id}`}>
            <div>
            <div className="admin-menu-name">{item.name}<PixelNumber style={{ marginLeft: 9, color: "#e8d99b", fontSize: 21 }}>{formatMoney(item.priceCents)}</PixelNumber></div>
              <div className="admin-menu-description">{item.description || "A little something from the counter."}</div>
              <div style={{ display: "flex", gap: 5, marginTop: 5 }}><span className="admin-tag">{item.available ? "Available" : item.archived ? "Archived" : "86'd"}</span>{item.archived && <span className="admin-tag">History kept</span>}</div>
            </div>
            <div className="admin-menu-controls">
              {!item.archived && <button className="admin-btn admin-btn-quiet admin-btn-small" type="button" role="switch" aria-checked={item.available} aria-label={`${item.available ? "86" : "Make available"} ${item.name}`} onClick={() => run({ type: "toggle-menu-availability", itemId: item.id }, `${item.name}: ${item.available ? "86'd" : "back on the board"}.`)} data-testid={`toggle-available-${item.id}`}>{item.available ? "86 it" : "Bring back"}</button>}
              <button className="admin-btn admin-btn-quiet admin-btn-small" type="button" aria-label={`Edit ${item.name}`} onClick={() => setEditing(item)} data-testid={`button-edit-menu-${item.id}`}><Pencil size={14} /> Edit</button>
              {!item.archived && <button className="admin-btn admin-btn-danger admin-btn-small" type="button" aria-label={`Archive ${item.name}`} onClick={() => setArchiveTarget(item)} data-testid={`button-archive-menu-${item.id}`}><Archive size={14} /> Archive</button>}
            </div>
          </div>) : <p className="admin-subtle" style={{padding:"12px",margin:0}}>No items here yet. Add a menu item and choose this section.</p>}
        </section>})}
      </div>
    </div>
    {editing && <MenuEditor item={editing === "new" ? null : editing} categories={categories} onClose={() => setEditing(null)} onSave={saveMenuItem} />}
    {categoryDialogOpen && <Modal title="Add a chalkboard section" onClose={() => setCategoryDialogOpen(false)} testId="dialog-add-menu-category" actions={<><button className="admin-btn admin-btn-quiet" onClick={() => setCategoryDialogOpen(false)} data-testid="button-menu-category-cancel">Keep the board</button><button className="admin-btn admin-btn-hot" type="button" onClick={addCategory} data-testid="button-menu-category-save"><Check size={15} /> Add section</button></>}>
      <p>Add a section to organize menu items. You can assign it when adding or editing an item.</p>
      <label><span className="admin-label">Section name · {categoryDraft.length}/30</span><input className="admin-field" maxLength={30} value={categoryDraft} onChange={(event)=>{setCategoryDraft(event.target.value);setCategoryError("");}} placeholder="Seasonal, bakery, or something new" data-testid="input-menu-category-name" /></label>
      {categoryError && <div role="alert" className="admin-alert" data-testid="error-menu-category">{categoryError}</div>}
    </Modal>}
    {archiveTarget && <Modal title={`Take ${archiveTarget.name} off the board?`} onClose={() => setArchiveTarget(null)} testId="dialog-archive-item" actions={<><button className="admin-btn admin-btn-quiet" onClick={() => setArchiveTarget(null)} data-testid="button-archive-keep">Keep it</button><button className="admin-btn admin-btn-danger" onClick={() => { run({ type: "archive-menu-item", itemId: archiveTarget.id }, `${archiveTarget.name} archived. Past tickets keep their original line.`); setArchiveTarget(null); }} data-testid="button-archive-confirm"><Archive size={15} /> Archive item</button></>}>
      <p>This removes it from the guest menu, but does not delete it. Past order lines and prices stay unchanged.</p>
    </Modal>}
  </>;
}

function MenuEditor({ item, categories, onClose, onSave }: { item: MenuItem | null; categories: MenuCategory[]; onClose: () => void; onSave: (item: MenuItem) => void }) {
  const form = useForm<{name: string; description: string; price: string; categoryKey: string; available: boolean}>({
    defaultValues: {name: item?.name ?? "", description: item?.description ?? "", price: item ? (item.priceCents / 100).toFixed(2) : "", categoryKey: item?.categoryKey ?? categories[0]?.key ?? "", available: item?.available ?? true},
  });
  const {name, description, price, categoryKey, available} = form.watch();
  const setName = (value: string) => form.setValue("name", value);
  const setDescription = (value: string) => form.setValue("description", value);
  const setPrice = (value: string) => form.setValue("price", value);
  const setCategory = (value: string) => form.setValue("categoryKey", value);
  const setAvailable = (value: boolean) => form.setValue("available", value);
  const [error, setError] = useState("");
  const save = () => {
    const cents = parsePriceToCents(price);
    const draft: MenuItem = { id: item?.id ?? `menu-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`, name, description, priceCents: cents ?? -1, categoryKey, available, archived: item?.archived ?? false };
    const errors = [];
    if (!name.trim() || name.trim().length > 80) errors.push("Name must be 1–80 characters.");
    if (description.length > 250) errors.push("Description must be 250 characters or fewer.");
    if (cents === null || cents < 50 || cents > 10000) errors.push("Use a price from $0.50 to $100.00 with no more than two decimal places.");
    if (errors.length) { setError(errors.join(" ")); return; }
    onSave({ ...draft, priceCents: cents! });
  };
  return <Modal title={item ? "Edit the chalkboard" : "Add a board favorite"} onClose={onClose} testId="dialog-menu-editor" actions={<><button className="admin-btn admin-btn-quiet" onClick={onClose} data-testid="button-menu-editor-cancel">Cancel</button><button className="admin-btn admin-btn-hot" type="submit" form="admin-menu-editor-form" data-testid="button-menu-editor-save"><Check size={15} /> Save item</button></>}>
    <Form {...form}><form id="admin-menu-editor-form" onSubmit={form.handleSubmit(save)} style={{ display: "grid", gap: 10, paddingTop: 11 }}>
      <label><span className="admin-label">Name · {name.length}/80</span><input className="admin-field" maxLength={80} value={name} onChange={(event) => { setName(event.target.value); setError(""); }} data-testid="input-menu-name" /></label>
      <label><span className="admin-label">Description · {description.length}/250</span><textarea className="admin-field" rows={2} maxLength={250} value={description} onChange={(event) => { setDescription(event.target.value); setError(""); }} data-testid="input-menu-description" /></label>
      <div className="admin-modal-grid">
        <label><span className="admin-label">Price · dollars</span><input className="admin-field" inputMode="decimal" placeholder="4.75" value={price} onChange={(event) => { setPrice(event.target.value); setError(""); }} data-testid="input-menu-price" /><span className="admin-subtle">Whole cents · $0.50–$100.00</span></label>
        <label><span className="admin-label">Section</span><select className="admin-field" value={categoryKey} onChange={(event) => setCategory(event.target.value)} data-testid="select-menu-category">{categories.map((value) => <option key={value.key} value={value.key}>{value.label}</option>)}</select></label>
      </div>
      <button type="button" role="switch" aria-checked={available} className="admin-btn admin-btn-quiet" style={{ justifySelf: "start" }} onClick={() => setAvailable(!available)} data-testid="toggle-menu-editor-available">{available ? "Available at the guest window" : "86'd for now"}</button>
      {error && <div role="alert" className="admin-alert" data-testid="error-menu-validation">{error}</div>}
    </form></Form>
  </Modal>;
}

function AnalyticsView({ state }: { state: ReturnType<typeof createInitialState> }) {
  const [range, setRange] = useState<DateRange>("7days");
  const [start, setStart] = useState("2026-11-04");
  const [end, setEnd] = useState(dateFromDemo);
  const [direction, setDirection] = useState<"best" | "least">("best");
  const result = useMemo(() => {
    try { return {data: deriveAnalytics(state, { range, startDate: start, endDate: end }), error: ""}; }
    catch (error) { return {data: null, error: error instanceof Error ? error.message : "Check the date range."}; }
  }, [state, range, start, end]);
  const analytics = result.data;
  const ranking = [...(analytics?.rankings ?? [])].sort((a, b) => direction === "best" ? b.units - a.units || a.name.localeCompare(b.name) : a.units - b.units || a.name.localeCompare(b.name));
  const rankChartData = ranking.map((entry) => ({ name: entry.name, units: entry.units }));
  const timeRows = analytics?.orderTimes ?? [];
  const labelRange = range === "today" ? `Today · ${dateFromDemo} Los Angeles` : range === "7days" ? `Nov 4–10 · 7 demo café days` : range === "all" ? "All sample history · dates in Los Angeles" : `Custom · ${start} to ${end} Los Angeles`;
  return <>
      <div className="admin-view-head"><div><h1 className="admin-view-title">How the café’s humming</h1><p className="admin-view-subtitle">Paid, non-practice, non-cancelled sample tickets count as sales. No payment is processed.</p></div><span className="admin-pill"><BarChart3 size={15} /> {labelRange}</span></div>
    <div className="admin-content">
      <div className="admin-toolbar">
        <div className="admin-segment" role="group" aria-label="Analytics date range">
          {(["today", "7days", "all", "custom"] as DateRange[]).map((value) => <button type="button" key={value} aria-pressed={range === value} onClick={() => setRange(value)} data-testid={`analytics-range-${value}`}>{value === "today" ? "Today" : value === "7days" ? "7 days" : value === "all" ? "All time" : "Custom"}</button>)}
        </div>
        {range === "custom" && <><label className="admin-subtle">From <input className="admin-field" type="date" value={start} max={end} onChange={(event) => setStart(event.target.value)} aria-label="Analytics start date" data-testid="input-analytics-start" /></label><label className="admin-subtle">Through <input className="admin-field" type="date" value={end} min={start} max={dateFromDemo} onChange={(event) => setEnd(event.target.value)} aria-label="Analytics end date" data-testid="input-analytics-end" /></label></>}
        <span className="admin-subtle">Café day: America/Los_Angeles</span>
      </div>
      {!analytics ? <p className="admin-alert" role="alert" data-testid="error-analytics-range">{result.error} No results are shown until the dates are valid.</p> : <>
      {analytics.orderVolume === 0 && <p className="admin-alert" data-testid="empty-analytics">No non-practice orders in this range. Item rankings include the catalog's zero-sale items.</p>}
      <div className="admin-kpi-row">
        <div className="admin-kpi"><div className="admin-kpi-label">Gross item sales</div><div className="admin-kpi-value" data-testid="metric-sales"><PixelNumber style={metricNumeralStyle}>{formatMoney(analytics.salesCents)}</PixelNumber></div><div className="admin-kpi-note">Before tax, fees and refunds</div></div>
        <div className="admin-kpi"><div className="admin-kpi-label">Paid sale orders</div><div className="admin-kpi-value" data-testid="metric-sale-orders"><PixelNumber style={metricNumeralStyle}>{analytics.orderCount}</PixelNumber></div><div className="admin-kpi-note"><PixelNumber style={{ fontSize: 18 }}>{analytics.orderVolume}</PixelNumber> total non-practice orders</div></div>
        <div className="admin-kpi"><div className="admin-kpi-label">Units sold</div><div className="admin-kpi-value" data-testid="metric-units"><PixelNumber style={metricNumeralStyle}>{analytics.units}</PixelNumber></div><div className="admin-kpi-note">Quantity across paid sale tickets</div></div>
        <div className="admin-kpi"><div className="admin-kpi-label">Excluded tickets</div><div className="admin-kpi-value"><PixelNumber style={metricNumeralStyle}>{analytics.excludedCount}</PixelNumber></div><div className="admin-kpi-note">Unpaid, practice, or cancelled</div></div>
      </div>
      <div className="admin-chart-grid">
        <section className="admin-chart-card">
          <h3>{direction === "best" ? "Best sellers" : "Least sold items"}</h3><div className="admin-chart-caption">Units sold · zero included · item ranking</div>
          <button className="admin-btn admin-btn-quiet admin-btn-small" style={{ marginTop: 6 }} type="button" onClick={() => setDirection(direction === "best" ? "least" : "best")} data-testid="button-ranking-direction">{direction === "best" ? "Show least sold" : "Show most sold"}</button>
          <div className="admin-chart" data-testid="chart-menu-rankings"><ResponsiveContainer width="100%" height="100%"><BarChart data={rankChartData} layout="vertical" margin={{ top: 3, right: 24, bottom: 3, left: 0 }}>
            <CartesianGrid strokeDasharray="3 4" horizontal={false} stroke="#c9bea9" />
            <XAxis type="number" allowDecimals={false} domain={[0, "dataMax"]} tick={{ fill: "#635541", fontSize: 16, fontFamily: "'VT323', monospace" }} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fill: "#514432", fontSize: 12 }} />
            <Tooltip formatter={(value) => [`${value} units`, "Quantity"]} contentStyle={{ background: "#f6efdf", border: "1px solid #87785f", fontFamily: "'VT323',monospace" }} />
            <Bar dataKey="units" fill={chartColors.main} barSize={13}><LabelList dataKey="units" position="right" fontFamily="'VT323', monospace" fontSize={16} /></Bar>
          </BarChart></ResponsiveContainer></div>
          <details data-testid="details-ranking-values"><summary>All item counts and gross sales</summary><table className="admin-table" style={{minWidth: 0}}><thead><tr><th>Item</th><th>Units</th><th>Gross</th></tr></thead><tbody>{ranking.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.units}</td><td>{formatMoney(item.salesCents)}</td></tr>)}</tbody></table></details>
        </section>
        <section className="admin-chart-card">
          <h3>By section</h3><div className="admin-chart-caption">Units sold · category totals by actual sales</div>
          <div className="admin-chart" data-testid="chart-category-totals"><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.categoryTotals} margin={{ top: 10, right: 12, bottom: 3, left: -14 }}>
            <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#c9bea9" /><XAxis type="category" dataKey="categoryName" tick={{ fill: "#514432", fontSize: 12 }} /><YAxis type="number" allowDecimals={false} domain={[0, "dataMax"]} tick={{ fill: "#635541", fontSize: 16, fontFamily: "'VT323', monospace" }} />
            <Tooltip formatter={(value) => [`${value ?? 0} units`, "Quantity"]} contentStyle={{ background: "#f6efdf", border: "1px solid #87785f", fontFamily: "'VT323',monospace" }} />
            <Bar dataKey="units" name="Units" fill={chartColors.main} barSize={35}><LabelList dataKey="units" position="top" fontFamily="'VT323', monospace" fontSize={16} /></Bar>
          </BarChart></ResponsiveContainer></div>
          <div className="admin-subtle" style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 4 }}>{analytics.categoryTotals.map((entry) => <span key={entry.categoryKey}>{entry.categoryName} · {entry.units} units · {formatMoney(entry.salesCents)}</span>)}</div>
        </section>
        <section className="admin-chart-card">
          <h3>When cups land</h3><div className="admin-chart-caption">All non-practice orders by hour · includes unpaid/cancelled · LA time</div>
          <div className="admin-chart" data-testid="chart-orders-by-hour"><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.byHour.filter((entry) => entry.orders > 0 || Number(entry.hour.slice(0, 2)) >= 6 && Number(entry.hour.slice(0, 2)) <= 22)} margin={{ top: 12, right: 12, bottom: 2, left: -14 }}>
            <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#c9bea9" /><XAxis type="category" dataKey="hour" tick={{ fill: "#635541", fontSize: 15, fontFamily: "'VT323', monospace" }} interval={2} /><YAxis type="number" allowDecimals={false} domain={[0, "dataMax"]} tick={{ fill: "#635541", fontSize: 16, fontFamily: "'VT323', monospace" }} />
            <Tooltip formatter={(value) => [`${value} orders`, "Tickets"]} contentStyle={{ background: "#f6efdf", border: "1px solid #87785f", fontFamily: "'VT323',monospace" }} />
            <Bar dataKey="orders" fill={chartColors.main} barSize={19}><LabelList dataKey="orders" position="top" fontFamily="'VT323', monospace" fontSize={16} formatter={function(value: unknown) { return Number(value) > 0 ? String(value) : ""; }} /></Bar>
          </BarChart></ResponsiveContainer></div>
        </section>
        <section className="admin-chart-card">
          <h3>By café day</h3><div className="admin-chart-caption">All non-practice orders · days with tickets only · LA dates</div>
          <div className="admin-chart" data-testid="chart-orders-by-day"><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.byDay} margin={{ top: 12, right: 12, bottom: 2, left: -14 }}>
            <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#c9bea9" /><XAxis type="category" dataKey="day" tick={{ fill: "#635541", fontSize: 13, fontFamily: "'VT323', monospace" }} /><YAxis type="number" allowDecimals={false} domain={[0, "dataMax"]} tick={{ fill: "#635541", fontSize: 16, fontFamily: "'VT323', monospace" }} />
            <Tooltip formatter={(value) => [`${value} orders`, "Tickets"]} contentStyle={{ background: "#f6efdf", border: "1px solid #87785f", fontFamily: "'VT323',monospace" }} />
            <Bar dataKey="orders" fill={chartColors.main} barSize={25}><LabelList dataKey="orders" position="top" fontFamily="'VT323', monospace" fontSize={16} /></Bar>
          </BarChart></ResponsiveContainer></div>
        </section>
      </div>
      <section style={{ marginTop: 13 }} className="admin-panel">
        <div style={{ padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(98,78,54,.2)" }}><h2 style={{ margin: 0, font: "18px 'Pixelify Sans',monospace" }}>Ticket timing</h2><span className="admin-subtle">{timeRows.length} non-practice orders · placement to last update, not preparation duration</span></div>
        {timeRows.length ? <div className="admin-table-wrap"><table className="admin-table" data-testid="table-order-times"><thead><tr><th>Ticket</th><th>Placed · LA</th><th>Last updated · LA</th><th>Elapsed</th><th>Status</th></tr></thead><tbody>{timeRows.map((row) => <tr key={row.orderId} data-testid={`row-analytics-order-${row.orderId}`}><td>#{row.number}</td><td>{formatLA(row.placedAt)}</td><td>{formatLA(row.updatedAt)}</td><td>{row.durationMinutes} min</td><td>{STATUS_LABEL[row.status]}</td></tr>)}</tbody></table></div> : <div className="admin-empty" style={{ color: "#675a48" }}><div><strong style={{ color: "#66563e" }}>No actual sales in this date range.</strong>Try a wider café day range.</div></div>}
      </section>
      <p className="admin-subtle" style={{ margin: "9px 0" }}>Sample history only. “Paid” is a demo ledger flag, not a charge. Sales exclude practice, unpaid, and cancelled tickets; traffic counts include unpaid/cancelled but exclude practice. “Complete” means ready for pickup, not collected. Refresh resets the demo.</p>
      </>}
    </div>
  </>;
}

type CartChoice = { quantity: number; temperature: "hot" | "iced"; milk: "whole" | "oat" | "almond" | "none"; notes: string };
function CustomerView({ state, run, flash }: {
  state: ReturnType<typeof createInitialState>; run: (action: Parameters<typeof cafeReducer>[1], success?: string) => boolean; flash: (message: string) => void;
}) {
  const available = state.menu.filter((item) => item.available && !item.archived);
  const [cart, setCart] = useState<Record<string, CartChoice>>({});
  const [cupNote, setCupNote] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<CafeOrder | null>(null);
  const [notice, setNotice] = useState("");
  const ownOrders = state.orders.filter((order) => order.customerId === DEMO_CUSTOMER_ID);
  const mostRecent = ownOrders[0];
  const position = mostRecent && (mostRecent.status === "placed" || mostRecent.status === "inprogress") ? state.queueOrderIds.indexOf(mostRecent.id) + 1 : 0;
  useEffect(() => {
    if (!mostRecent) return;
    const spoken = mostRecent.status === "complete" ? `#${mostRecent.number} is ready for pickup. Find us by the little green window.` :
      mostRecent.status === "inprogress" ? `#${mostRecent.number} is on the bar. Miso's got it.` :
        mostRecent.status === "cancelled" ? `#${mostRecent.number} was cancelled.` : `#${mostRecent.number} is in the queue${position ? ` · position ${position}` : ""}.`;
    setNotice(spoken);
  }, [mostRecent?.id, mostRecent?.status, mostRecent?.updatedAt, position]);
  const addItem = (id: string) => {
    const current = cart[id] ?? { quantity: 0, temperature: "hot" as const, milk: "whole" as const, notes: "" };
    setCart({ ...cart, [id]: { ...current, quantity: Math.min(20, current.quantity + 1) } });
    flash(`${state.menu.find((item) => item.id === id)?.name ?? "Item"} added to your tray.`);
  };
  const cartItems = available.filter((item) => (cart[item.id]?.quantity ?? 0) > 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.priceCents * cart[item.id].quantity, 0);
  const placeOrder = () => {
    if (!cartItems.length) { flash("Add a cup or treat to your tray first."); return; }
    try {
      const placed = run({
        type: "place-order", customerId: DEMO_CUSTOMER_ID, customerName: "Mira",
        lines: cartItems.map((item) => ({ menuItemId: item.id, quantity: cart[item.id].quantity, temperature: cart[item.id].temperature, milk: cart[item.id].milk, notes: cart[item.id].notes })),
        notes: cupNote,
      }, "Sample order placed. No checkout or payment happened.");
      if (!placed) return;
      setCart({});
      setCupNote("");
      setNotice("Your sample order is on the rail. No payment was taken.");
      setExpandedOrder(`ord-${String(state.nextOrderNumber).padStart(4, "0")}`);
    } catch (error) { flash(error instanceof Error ? error.message : "Please check your tray."); }
  };
  return <>
    <div className="admin-view-head"><div><h1 className="admin-view-title">The guest window</h1><p className="admin-view-subtitle">A neighbor’s view of the same menu and same familiar rail.</p></div><span className="admin-pill"><ShoppingBag size={14} /> Mira · sample guest</span></div>
    <div className="admin-preview-banner"><span><strong>Customer preview</strong> · linked to the same demo store. Orders are sample-only, unpaid practice tickets.</span><span className="admin-tag">No checkout</span></div>
    {notice && <div className="admin-customer-notice" role="status" aria-live="polite" data-testid="status-customer-order">{notice}</div>}
    <div className="admin-customer">
      <section className="admin-customer-column" aria-label="Available café menu">
        <div className="admin-board" style={{ padding: 13, borderBottom: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><h2 className="admin-board-title" style={{ margin: 0 }}>Today at Purr &amp; Pour</h2><span className="admin-muted-board">Local favorites, made kindly</span></div>
        </div>
        <div className="admin-board admin-customer-scroll">
          {state.categories.map((category) => <div key={category.key}>
            <div style={{ padding: "9px 11px 5px", font: "17px 'Pixelify Sans',monospace", color: "#e8d692" }}>{category.label}</div>
            {available.filter((item) => item.categoryKey === category.key).map((item) => <div className="admin-menu-row" key={item.id} data-testid={`customer-menu-item-${item.id}`}>
              <div><div className="admin-menu-name">{item.name}<PixelNumber style={{ marginLeft: 7, color: "#e8d99b", fontSize: 21 }}>{formatMoney(item.priceCents)}</PixelNumber></div><div className="admin-menu-description">{item.description}</div></div>
              <button className="admin-btn admin-btn-dark admin-btn-small" type="button" aria-label={`Add ${item.name} to tray`} onClick={() => addItem(item.id)} data-testid={`button-customer-add-${item.id}`}><Plus size={15} /> Add</button>
            </div>)}
          </div>)}
          {!available.length && <div className="admin-empty"><div><strong>The board is taking a breather.</strong>Check back after the next pot.</div></div>}
        </div>
      </section>
      <section className="admin-customer-column" aria-label="Your tray and orders">
        <div className="admin-customer-cart">
          <h2 style={{ margin: "0 0 7px", font: "20px 'Pixelify Sans',monospace" }}>Your tray <span className="admin-subtle">· {cartItems.reduce((sum, item) => sum + cart[item.id].quantity, 0)} items</span></h2>
          {cartItems.length ? <div style={{ maxHeight: 214, overflow: "auto" }}>
            {cartItems.map((item) => {
              const choice = cart[item.id];
              return <div className="admin-cart-line" key={item.id} data-testid={`cart-item-${item.id}`}>
                <div><strong>{item.name}</strong><div className="admin-subtle">{formatMoney(item.priceCents)} each</div>
                  <div style={{ display: "flex", gap: 5, marginTop: 4 }}>
                    <select className="admin-field" style={{ minHeight: 31, padding: 3 }} aria-label={`${item.name} temperature`} value={choice.temperature} onChange={(event) => setCart({ ...cart, [item.id]: { ...choice, temperature: event.target.value as CartChoice["temperature"] } })} data-testid={`select-temperature-${item.id}`}><option value="hot">Hot</option><option value="iced">Iced</option></select>
                    <select className="admin-field" style={{ minHeight: 31, padding: 3 }} aria-label={`${item.name} milk`} value={choice.milk} onChange={(event) => setCart({ ...cart, [item.id]: { ...choice, milk: event.target.value as CartChoice["milk"] } })} data-testid={`select-milk-${item.id}`}><option value="whole">Whole milk</option><option value="oat">Oat milk</option><option value="almond">Almond milk</option><option value="none">No milk</option></select>
                  </div>
                  <input className="admin-field" style={{ minHeight: 31, marginTop: 4 }} placeholder="Drink note (optional)" value={choice.notes} onChange={(event) => setCart({ ...cart, [item.id]: { ...choice, notes: event.target.value } })} aria-label={`${item.name} customization note`} data-testid={`input-line-note-${item.id}`} />
                </div>
                <div className="admin-qty"><button type="button" aria-label={`Remove one ${item.name}`} onClick={() => { const quantity = choice.quantity - 1; const next = { ...cart }; if (quantity <= 0) delete next[item.id]; else next[item.id] = { ...choice, quantity }; setCart(next); }} data-testid={`button-quantity-minus-${item.id}`}><Minus size={14} /></button><span aria-label={`Quantity ${choice.quantity}`} data-testid={`text-quantity-${item.id}`}>{choice.quantity}</span><button type="button" aria-label={`Add one ${item.name}`} onClick={() => setCart({ ...cart, [item.id]: { ...choice, quantity: Math.min(20, choice.quantity + 1) } })} data-testid={`button-quantity-plus-${item.id}`}><Plus size={14} /></button></div>
              </div>;
            })}
          </div> : <div className="admin-subtle" style={{ padding: "10px 0" }}>A little something for the walk home?</div>}
          <label style={{ display: "block", marginTop: 6 }}><span className="admin-label">Note for the barista</span><input className="admin-field" placeholder="Name on cup, allergies, anything helpful" value={cupNote} onChange={(event) => setCupNote(event.target.value)} data-testid="input-customer-order-note" /></label>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 9 }}><strong>Total · {formatMoney(cartTotal)}</strong><button className="admin-btn admin-btn-hot" type="button" disabled={!cartItems.length} onClick={placeOrder} data-testid="button-place-sample-order"><ShoppingBag size={15} /> Place sample order</button></div>
          <div className="admin-subtle" style={{ marginTop: 6 }}>No charge. This creates an unpaid practice ticket for Mira.</div>
        </div>
        <div className="admin-customer-column admin-customer-scroll" style={{ marginTop: 10, border: "2px solid #584a38" }}>
          <div style={{ padding: "10px 11px", display: "flex", justifyContent: "space-between", background: "#e4d7bd", color: "#382c21" }}><strong style={{ font: "18px 'Pixelify Sans',monospace" }}>Your recent orders</strong><span className="admin-subtle">Mira only</span></div>
          {ownOrders.map((order) => <article key={order.id} style={{ padding: 10, background: "#f1e8d6", borderTop: "1px solid #c2b59c" }} data-testid={`customer-order-${order.id}`}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><strong style={{ font: "17px 'Pixelify Sans',monospace" }}>#{order.number} · {formatLA(order.createdAt)}</strong><StatusBadge status={order.status} /></div>
            <div className="admin-subtle" style={{ marginTop: 4 }}>{summarizeOrder(order)}</div>
            {order.status === "placed" || order.status === "inprogress" ? <div style={{ marginTop: 6 }}><span className="admin-priority">{order.status === "inprogress" ? "On the bar" : position > 0 && order.id === mostRecent?.id ? `${position} in line` : "In the queue"}</span></div> : null}
            <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
              <button className="admin-btn admin-btn-quiet admin-btn-small" type="button" aria-expanded={expandedOrder === order.id} onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)} data-testid={`button-customer-order-detail-${order.id}`}>Details</button>
              {order.customerId === DEMO_CUSTOMER_ID && order.status === "placed" && <button className="admin-btn admin-btn-danger admin-btn-small" type="button" onClick={() => setCancelTarget(order)} data-testid={`button-cancel-own-order-${order.id}`}>Cancel order</button>}
            </div>
            {expandedOrder === order.id && <div style={{ marginTop: 6 }}><OrderLines lines={order.lines} /><div className="admin-subtle">Total {formatMoney(orderTotalCents(order))} · {order.practice ? "practice ticket, unpaid" : order.paid ? "paid" : "unpaid"}</div><div className="admin-subtle">Placed {formatLA(order.createdAt)} · Updated {formatLA(order.updatedAt)}</div>{order.notes && <div className="admin-subtle">Barista note: “{order.notes}”</div>}</div>}
          </article>)}
          {!ownOrders.length && <div style={{ padding: 15 }} className="admin-subtle">Your first cup is waiting to be ordered.</div>}
        </div>
      </section>
    </div>
    {cancelTarget && <Modal title={`Cancel order #${cancelTarget.number}?`} onClose={() => setCancelTarget(null)} testId="dialog-cancel-customer-order" actions={<><button className="admin-btn admin-btn-quiet" onClick={() => setCancelTarget(null)} data-testid="button-cancel-order-keep">Keep my order</button><button className="admin-btn admin-btn-danger" onClick={() => { if (run({ type: "customer-cancel", orderId: cancelTarget.id, customerId: DEMO_CUSTOMER_ID, expectedStatus: cancelTarget.status }, `Order #${cancelTarget.number} cancelled.`)) setNotice(`#${cancelTarget.number} was cancelled. Your sample order stays in your history.`); setCancelTarget(null); }} data-testid="button-cancel-order-confirm">Cancel my order</button></>}>
      <p>Only your own placed order can be cancelled here. The change is simulated; no payment or refund will happen.</p>
    </Modal>}
  </>;
}

export { AdminPrototype };
