import { useState } from "react";
import "./counter-atlas.css";

type MenuCategory = "coffee" | "tea" | "treats";
type MenuItem = { id: string; name: string; description: string; price: number; category: MenuCategory; badge?: string };

const menu: MenuItem[] = [
  { id: "espresso", name: "Espresso", description: "Small cup. Big main-character energy. A sweet, rich double shot.", price: 300, category: "coffee" },
  { id: "americano", name: "Americano", description: "Our house espresso, stretched with hot water. Simply good coffee.", price: 350, category: "coffee" },
  { id: "latte", name: "Cloud Nine Latte", description: "Silky steamed milk meets our cozy house espresso. Miso’s favorite.", price: 500, category: "coffee", badge: "HOUSE FAVORITE" },
  { id: "cappuccino", name: "Cappuccino", description: "A little espresso, a little milk, a whole lot of fluffy foam.", price: 450, category: "coffee" },
  { id: "mocha", name: "Midnight Mocha", description: "Dark chocolate, espresso, and steamed milk. A hug in a mug.", price: 550, category: "coffee" },
  { id: "cold-brew", name: "Slow Sunday Cold Brew", description: "Steeped for 18 hours. Smooth, mellow, and worth the wait.", price: 450, category: "coffee", badge: "CHILLED" },
  { id: "matcha", name: "Garden Matcha", description: "Earthy ceremonial matcha whisked with your favorite milk.", price: 550, category: "tea", badge: "A LITTLE ZEN" },
  { id: "chai", name: "Cozy Chai", description: "Black tea, warming spices, and a generous splash of milk.", price: 450, category: "tea" },
  { id: "croissant", name: "Butter Croissant", description: "Flaky, golden, and baked fresh. Your coffee’s best friend.", price: 375, category: "treats", badge: "FRESHLY BAKED" },
  { id: "cookie", name: "Chocolate Chip Cookie", description: "Crisp edges, a soft middle, and generous chocolate chunks.", price: 300, category: "treats" },
];
const categories: MenuCategory[] = ["coffee", "tea", "treats"];
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CounterAtlas() {
  const [category, setCategory] = useState<MenuCategory>("coffee");
  const [section, setSection] = useState<"counter" | "crew" | "tickets">("counter");
  const [selectedId, setSelectedId] = useState("latte");
  const [tab, setTab] = useState<{ id: string; quantity: number }[]>([]);

  const selected = menu.find((item) => item.id === selectedId) ?? menu[0];
  const totalItems = tab.reduce((total, line) => total + line.quantity, 0);
  const totalPrice = tab.reduce((total, line) => {
    const item = menu.find((entry) => entry.id === line.id);
    return total + (item?.price ?? 0) * line.quantity;
  }, 0);
  const addToTab = () => setTab((current) => {
    const existing = current.find((line) => line.id === selected.id);
    return existing
      ? current.map((line) => line.id === selected.id ? { ...line, quantity: line.quantity + 1 } : line)
      : [...current, { id: selected.id, quantity: 1 }];
  });

  return (
    <main className="atlas">
      <header className="atlas-top">
        <div className="atlas-brand">
          <img className="atlas-logo" src="/__mockup/images/counteratlas-logo.svg" alt="" />
          <div>
            <p className="atlas-wordmark">Purr &amp; Pour</p>
            <p className="atlas-caption">neighborhood counter, pickup only</p>
          </div>
        </div>
        <div className="atlas-top-note"><span className="atlas-live-dot" />Live order updates</div>
        <button className="atlas-bag" onClick={() => setSection("tickets")} aria-label={`Open tab, ${totalItems} items`}>
          <span className="atlas-bag-icon" aria-hidden="true">▱</span><span>Your tab</span><b>{totalItems}</b>
        </button>
      </header>

      <div className="atlas-layout">
        <nav className="atlas-nav" aria-label="Cafe sections">
          <span className="atlas-nav-label">Purr &amp; Pour</span>
          {([
            ["counter", "01", "Counter"],
            ["crew", "02", "Crew"],
            ["tickets", "03", "Tickets"],
          ] as const).map(([key, number, label]) => (
            <button key={key} className={`atlas-nav-item ${section === key ? "is-current" : ""}`} onClick={() => setSection(key)}>
              <span>{number}</span>{label}
            </button>
          ))}
          <div className="atlas-nav-bottom"><span className="atlas-open-badge">THE COUNTER</span></div>
        </nav>

        <section className="atlas-main">
          <div className="atlas-intro">
            <div>
              <p className="atlas-eyebrow"><span>{section === "counter" ? "TODAY" : section === "crew" ? "THE CREW" : "YOUR TICKETS"}</span><span className="atlas-eyebrow-line" /></p>
              <h1>{section === "counter" ? "Purr & Pour" : section === "crew" ? "The Crew" : "Your Tickets"}</h1>
            </div>
            <p className="atlas-intro-copy">
              {section === "counter" ? "Choose a shelf, make it yours, and add it to your tab." : section === "crew" ? "Baristas join your counter as loyalty milestones." : "Follow every cup from the rail to the pickup counter."}
            </p>
          </div>

          <div className="atlas-stage">
            <div className="atlas-stage-label"><span>THE COUNTER</span><span>LIVE ORDER UPDATES</span></div>
            <div className="atlas-window" aria-hidden="true"><span /><span /><span /></div>
            <div className="atlas-pet-wrap" aria-label="Miso, the ginger cat barista">
              <div className="atlas-speech">Morning! The lamp’s warm and so is the milk.</div>
              <div className="atlas-pet" role="img" aria-label="Animated ginger cat barista" />
              <span className="atlas-pet-name">MISO <small>on shift</small></span>
            </div>
            <div className="atlas-station">
              <img src="/__mockup/images/counteratlas-cafe-station-cutout.png" alt="" />
            </div>
            <div className="atlas-stage-floor" />
            <div className="atlas-scene-foot"><span>Pickup only</span><span>{totalItems} {totalItems === 1 ? "item" : "items"} in your tab</span></div>
          </div>

          <div className="atlas-footer-strip">
            <span className="atlas-strip-title">PICKUP ONLY</span>
            <p>Practice orders never count toward stamps.</p>
            <span className="atlas-strip-mark" aria-hidden="true">✳</span>
          </div>
        </section>

        <aside className="atlas-board">
          <div className="atlas-board-head">
            <div><p className="atlas-eyebrow">TODAY</p><h2>The Board<span>.</span></h2></div>
            <span className="atlas-board-date">PICKUP<br />ONLY</span>
          </div>
          <div className="atlas-tabs" role="tablist" aria-label="Menu category">
            {categories.map((value) => <button key={value} role="tab" aria-selected={category === value} onClick={() => setCategory(value)}>{value}</button>)}
          </div>
          <div className="atlas-menu-list" role="tabpanel">
            {menu.filter((item) => item.category === category).map((item, index) => (
              <button key={item.id} className={`atlas-menu-row ${selectedId === item.id ? "is-selected" : ""}`} onClick={() => setSelectedId(item.id)}>
                <span className="atlas-item-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="atlas-item-copy"><b>{item.name}</b><small>{item.description}</small>{item.badge && <em>{item.badge}</em>}</span>
                <span className="atlas-item-price">{money(item.price)}</span>
              </button>
            ))}
          </div>
          <div className="atlas-order-card">
            <div className="atlas-order-top"><span>YOUR TAB</span><span>{totalItems} {totalItems === 1 ? "ITEM" : "ITEMS"}</span></div>
            {tab.length ? (
              <ul className="atlas-tab-lines">
                {tab.map((line) => {
                  const item = menu.find((entry) => entry.id === line.id);
                  return <li key={line.id}><span>{line.quantity}× {item?.name}</span><span>{money((item?.price ?? 0) * line.quantity)}</span></li>;
                })}
              </ul>
            ) : <p className="atlas-empty-tab">Pick something off the board and it lands here.</p>}
            <div className="atlas-total"><span>Total</span><b>{money(totalPrice)}</b></div>
            <button className="atlas-add" onClick={addToTab}><span>Add to tab</span><b>＋</b></button>
          </div>
          <div className="atlas-status"><span className="atlas-status-mark">P</span><span><b>Practice order</b><small>No charge. No loyalty earned.</small></span><span className="atlas-status-arrow">↗</span></div>
        </aside>
      </div>
    </main>
  );
}
