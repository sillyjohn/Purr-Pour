import {Link} from "wouter";
import {asset} from "@/lib/cafe";

const publicRoutes = [
  ["/", "Customer café", "Fixed café scene; menu, cart, tickets, pets, account and settings drawers."],
  ["/sign-in", "Account sign-in", "Real Clerk authentication. Successful sign-in continues through the server role check."],
  ["/sign-up", "Account registration", "New accounts have no admin permission by default."],
  ["/auth/continue", "Sign-in routing", "Admins go to /admin/orders; other customers return to the café."],
];
const adminRoutes = [
  ["/admin", "Protected entry", "Requires a signed-in account and the server-confirmed admin role; opens Orders."],
  ["/admin/orders", "Orders", "Sample tickets, four statuses and status history."],
  ["/admin/queue", "Queue", "Sample priority ordering."],
  ["/admin/menu", "Edit Menu", "Sample items, availability, archive and custom categories."],
  ["/admin/analytics", "Analytics", "Sample sales, categories and order times."],
  ["/admin/customer", "Guest window", "Linked sample customer experience, not the public café’s real orders."],
  ["/admin/structure", "Site structure", "This route map."],
];

export default function SiteStructure({onBack}: {onBack: () => void}) {
  return <div className="admin-prototype admin-structure-shell">
    <header className="admin-header">
      <Link href="/" className="admin-brand" data-testid="link-structure-cafe"><img className="admin-brand-mark" src={asset("/logo.svg")} alt="" /><div><div className="admin-brand-name">Purr &amp; Pour</div><div className="admin-brand-sub">CURRENT SITE STRUCTURE</div></div></Link>
      <span className="admin-flag">Real account access · sample workspace data</span>
      <div className="admin-header-spacer" />
      <button type="button" className="admin-reset" onClick={onBack} data-testid="button-back-from-structure">Back to Orders</button>
    </header>
    <main className="admin-structure-page">
      <h1 className="admin-view-title">How the café fits together</h1>
      <p className="admin-view-subtitle">The customer café remains a single-page scene. The admin workspace has its own protected routes.</p>
      <div className="admin-structure-grid" style={{marginTop: 24}}>
        {[["Public café & accounts", publicRoutes], ["Protected admin workspace", adminRoutes]].map(([title, routes]) => <section className="admin-structure-card" key={String(title)}>
          <h2 className="admin-view-title" style={{fontSize: 22}}>{String(title)}</h2>
          <div className="admin-tree">{(routes as string[][]).map(([path, label, detail]) => <div className="admin-tree-row" key={path}><span className="admin-tree-branch">├──</span><div><code>{path}</code><b>{label}</b><small>{detail}</small></div></div>)}</div>
        </section>)}
      </div>
      <div className="admin-structure-notice" role="note"><strong>Real security, preview tools</strong><span>Clerk authenticates the account. The Node gateway reads the role from trusted Clerk metadata, and Spring Boot enforces permissions on real APIs. This workspace’s orders, menus, categories and charts are local samples: changes reset on reload and never change live café data.</span></div>
      <div className="admin-structure-notice"><strong>Application structure</strong><span>React + Wouter → Clerk-authenticated Node gateway → Spring Boot → PostgreSQL. Existing API and SSE traffic uses <code>/api/*</code>. Live admin queue, category and analytics integration remains separate work.</span></div>
    </main>
  </div>;
}
