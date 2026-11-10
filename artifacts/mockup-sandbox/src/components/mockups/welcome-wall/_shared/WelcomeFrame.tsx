import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ClipboardList, Settings2, ShoppingBag, UserRound } from "lucide-react";
import { CafeScene } from "./cafe-scene";
import { usePetMachine } from "./pet-sprite";
import { money, type MenuCategory, type MenuItem, type Pet } from "./cafe";

export type WelcomeFrameProps = {
  renderDecoration?: (name: string) => ReactNode;
};

const menu: MenuItem[] = [
  { id: "espresso", name: "Espresso", description: "Small cup. Big main-character energy. A sweet, rich double shot.", category: "coffee", priceCents: 300, available: true },
  { id: "americano", name: "Americano", description: "Our house espresso, stretched with hot water. Simply good coffee.", category: "coffee", priceCents: 350, available: true },
  { id: "latte", name: "Cloud Nine Latte", description: "Silky steamed milk meets our cozy house espresso. Miso’s favorite.", category: "coffee", priceCents: 500, available: true, badge: "HOUSE FAVORITE" },
  { id: "cappuccino", name: "Cappuccino", description: "A little espresso, a little milk, a whole lot of fluffy foam.", category: "coffee", priceCents: 450, available: true },
  { id: "mocha", name: "Midnight Mocha", description: "Dark chocolate, espresso, and steamed milk. A hug in a mug.", category: "coffee", priceCents: 550, available: true },
  { id: "cold-brew", name: "Slow Sunday Cold Brew", description: "Steeped for 18 hours. Smooth, mellow, and worth the wait.", category: "coffee", priceCents: 450, available: true, badge: "CHILLED" },
  { id: "matcha", name: "Garden Matcha", description: "Earthy ceremonial matcha whisked with your favorite milk.", category: "tea", priceCents: 550, available: true, badge: "A LITTLE ZEN" },
  { id: "chai", name: "Cozy Chai", description: "Black tea, warming spices, and a generous splash of milk.", category: "tea", priceCents: 450, available: true },
  { id: "croissant", name: "Butter Croissant", description: "Flaky, golden, and baked fresh. Your coffee’s best friend.", category: "treats", priceCents: 375, available: true, badge: "FRESHLY BAKED" },
  { id: "cookie", name: "Chocolate Chip Cookie", description: "Crisp edges, a soft middle, and generous chocolate chunks.", category: "treats", priceCents: 300, available: true },
];
const pets: Pet[] = [
  { id: "miso", name: "Miso", species: "Ginger cat" },
  { id: "mochi", name: "Mochi", species: "Tuxedo cat" },
  { id: "biscuit", name: "Biscuit", species: "Corgi" },
];
type DrawerName = "menu" | "crew" | "tickets" | "cart" | "account" | "settings" | null;
const navBtn = "px-btn font-pixel bg-card flex items-center gap-1.5 px-3 py-2 text-sm";
const fallbackName = "hairy stranger";

export function WelcomeFrame({ renderDecoration }: WelcomeFrameProps) {
  const [drawer, setDrawer] = useState<DrawerName>(null);
  const [category, setCategory] = useState<MenuCategory>("coffee");
  const [name, setName] = useState(fallbackName);
  const [cartCount, setCartCount] = useState(0);
  const [speech, setSpeech] = useState({ text: "Morning! The lamp's warm and so is the milk.", id: 0 });
  const pet = usePetMachine();
  const reduced = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const displayName = name.trim() || fallbackName;
  const shortName = displayName.split(/\s+/)[0] || fallbackName;

  useEffect(() => {
    if (!speech.text) return;
    const timer = window.setTimeout(() => setSpeech((current) => ({ ...current, text: "" })), 6000);
    return () => window.clearTimeout(timer);
  }, [speech]);

  const say = (text: string) => setSpeech((current) => ({ text, id: current.id + 1 }));
  const openMenu = (selected?: MenuCategory) => {
    if (selected) setCategory(selected);
    setDrawer("menu");
  };
  const poke = () => {
    pet.send("POKE");
    say("Scritch accepted.");
  };
  const addItem = (item: MenuItem) => {
    setCartCount((count) => count + 1);
    say(`${item.name}, coming right up on your tab.`);
  };

  return (
    <div className="cafe-root welcome-wall-root">
      <a href="#scene-menu" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-card p-2">Skip to menu</a>
      <header className="sticky top-0 z-40 border-b-4 border-[hsl(var(--walnut))] bg-[hsl(var(--wall)/.92)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <img src="/__mockup/images/welcome-wall/logo.svg" alt="" className="pixelated h-9 w-9" />
          <div className="mr-auto leading-none">
            <p className="font-pixel text-xl font-bold" data-testid="text-shop-name">Purr &amp; Pour</p>
            <p className="font-chalk text-muted-foreground text-base">neighborhood counter, pickup only</p>
          </div>
          <span className="hidden items-center gap-1.5 text-xs sm:flex font-pixel" title="Mockup preview" data-testid="status-live">
            <span className="h-2 w-2 bg-[hsl(var(--lamp))]" />preview
          </span>
          <button className={navBtn} onClick={() => openMenu()} data-testid="button-open-menu"><span className="font-pixel">Menu</span></button>
          <button className={`${navBtn} hidden sm:flex`} onClick={() => setDrawer("tickets")} data-testid="button-open-orders"><ClipboardList size={16} /><span className="hidden md:inline">Tickets</span></button>
          <button className={`${navBtn} hidden sm:flex`} onClick={() => setDrawer("crew")} data-testid="button-open-pets"><span className="font-pixel">Crew</span></button>
          <button className={navBtn} aria-label="Settings" onClick={() => setDrawer("settings")} data-testid="button-open-settings"><Settings2 size={16} /></button>
          <button className={navBtn} aria-label="Account" onClick={() => setDrawer("account")} data-testid="button-open-account"><UserRound size={16} /><span className="hidden md:inline">{shortName}</span></button>
          <button className={`${navBtn} !bg-primary text-primary-foreground`} onClick={() => setDrawer("cart")} data-testid="button-open-cart" aria-label={`Open tab, ${cartCount} items`}>
            <ShoppingBag size={16} /><span key={cartCount} className="anim-pop">{cartCount}</span>
          </button>
        </div>
      </header>

      <div id="cafe-main" className="contents">
        <CafeScene
          menu={menu}
          loading={false}
          pet={pets[0]}
          petList={pets}
          unlocked={["miso"]}
          speech={speech}
          petState={pet.state}
          reduced={reduced}
          cartCount={cartCount}
          name={displayName}
          renderDecoration={renderDecoration}
          onMenu={() => openMenu()}
          onCategory={openMenu}
          onPets={() => setDrawer("crew")}
          onOrders={() => setDrawer("tickets")}
          onCart={() => setDrawer("cart")}
          onPoke={poke}
          onWake={() => { if (pet.state === "sleep") pet.send("WAKE"); }}
        />
      </div>

      {drawer && (
        <div className="welcome-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDrawer(null); }}>
          <section className="welcome-drawer chalkboard" role="dialog" aria-modal="true" aria-labelledby="welcome-drawer-title">
            <button className="welcome-drawer-close" aria-label="Close drawer" onClick={() => setDrawer(null)}>×</button>
            <div className="p-6 pb-10">
              <header className="mb-5 text-left">
                <h2 id="welcome-drawer-title" className="font-pixel text-3xl tracking-wide text-[hsl(var(--lamp))]">
                  {drawer === "menu" ? "The Board" : drawer === "crew" ? "The Crew" : drawer === "tickets" ? "Your Tickets" : drawer === "cart" ? "Your Tab" : drawer === "account" ? "Guest account" : "Settings"}
                </h2>
                <p className="font-chalk text-lg text-[hsl(var(--chalk-ink)/.7)]">
                  {drawer === "menu" ? "Choose a shelf and add a favorite to your tab." : drawer === "account" ? "A local name preview for this mockup." : "A lightweight local preview. Nothing is submitted."}
                </p>
              </header>
              {drawer === "account" ? (
                <div className="space-y-4">
                  <label className="block font-pixel">Name
                    <input className="chalk-input mt-2" value={name} onChange={(event) => setName(event.target.value)} aria-label="Name" />
                  </label>
                  <p className="text-sm text-[hsl(var(--chalk-ink)/.7)]">Displayed greeting: {displayName}</p>
                  <button className="welcome-chalk-button" onClick={() => setName(fallbackName)}>Reset guest name</button>
                </div>
              ) : drawer === "menu" ? (
                <>
                  <div role="tablist" aria-label="Menu category" className="sticky top-0 z-10 -mx-2 mb-4 flex gap-2 bg-[hsl(140_6%_18%)] px-2 py-2">
                    {(["coffee", "tea", "treats"] as const).map((entry) => (
                      <button key={entry} role="tab" aria-selected={category === entry} className={`font-pixel min-h-11 flex-1 border-2 px-2 py-2 text-sm uppercase ${category === entry ? "border-[hsl(var(--lamp))] bg-[hsl(var(--lamp))] text-[hsl(var(--walnut))]" : "border-[hsl(var(--chalk-ink)/.6)] text-[hsl(var(--chalk-ink))]"}`} onClick={() => setCategory(entry)}>{entry}</button>
                    ))}
                  </div>
                  <div role="tabpanel" className="space-y-4">
                    {menu.filter((item) => item.category === category).map((item) => (
                      <article key={item.id} className="border-2 border-[hsl(var(--chalk-ink)/.3)] p-3">
                        <div className="flex items-start justify-between gap-3"><h3 className="font-pixel text-xl">{item.name}</h3><span className="font-pixel">{money(item.priceCents)}</span></div>
                        {item.badge && <span className="font-pixel inline-block bg-[hsl(var(--denim))] px-1.5 py-0.5 text-[10px] tracking-wider text-[hsl(var(--lamp))] uppercase">{item.badge}</span>}
                        <p className="mt-2 text-sm text-[hsl(var(--chalk-ink)/.7)]">{item.description}</p>
                        <button className="welcome-chalk-button mt-3" onClick={() => addItem(item)}>Add to tab</button>
                      </article>
                    ))}
                  </div>
                </>
              ) : drawer === "crew" ? (
                <ul className="space-y-4">{pets.map((entry) => <li key={entry.id} className="border-2 border-[hsl(var(--chalk-ink)/.3)] p-3"><h3 className="font-pixel text-xl">{entry.name}</h3><p>{entry.species}</p><p className="text-sm text-[hsl(var(--chalk-ink)/.7)]">{entry.id === "miso" ? "On shift today." : "Preview crew member."}</p></li>)}</ul>
              ) : drawer === "cart" ? (
                <div><p className="font-pixel">{cartCount} {cartCount === 1 ? "item" : "items"} in your tab</p><p className="mt-2 text-[hsl(var(--chalk-ink)/.7)]">Local visual preview only. No orders or payments are placed.</p></div>
              ) : (
                <p className="border-2 border-dashed border-[hsl(var(--chalk-ink)/.4)] p-5 font-pixel">{drawer === "tickets" ? "No preview tickets yet." : "Preview settings are not connected."}</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
