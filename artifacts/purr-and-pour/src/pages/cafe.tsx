import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/react";
import {
  getGetMeQueryKey,
  getGetOrdersQueryKey,
  getGetStaffOrdersQueryKey,
  useGetMe,
  useGetMenu,
  useGetOrders,
  useGetPets,
  useGetShop,
  useUpdatePreferences,
  type MenuItem,
  type Order,
  type Pet,
} from "@workspace/api-client-react";
import { ShoppingBag, Settings2, UserRound, ClipboardList, PencilRuler, RotateCw, Lock, Check } from "lucide-react";
import { PetSprite, usePetMachine } from "@/components/pet-sprite";
import { AccountDrawer, AdminDrawer, CartDrawer, ChalkDrawer, SettingsDrawer, StaffDrawer, type DrawerName } from "@/components/drawers";
import { CafeScene } from "@/components/cafe-scene";
import { STATUS_LINES, apiError, asset, basePath, blip, money, spriteKind, type CartLine } from "@/lib/cafe";
import { BARISTA_GREETING, resolveWelcomeName } from "@/lib/welcome";

const CART_KEY = "purr-pour-cart";

function ErrorBox({ msg, retry }: { msg: string; retry: () => void }) {
  return (
    <div role="alert" className="bg-card px-border mx-auto max-w-md p-5 text-center">
      <p className="font-pixel text-lg">Something tipped over.</p>
      <p className="text-muted-foreground mt-1 text-sm">{msg}</p>
      <button onClick={retry} className="px-btn font-pixel bg-primary text-primary-foreground mt-3 px-4 py-2 text-sm" data-testid="button-retry">
        <RotateCw size={14} className="mr-1 inline" />
        Try again
      </button>
    </div>
  );
}

/* ---------------- menu card with customization ---------------- */
function MenuCard({ item, onAdd, i }: { item: MenuItem; onAdd: (l: Omit<CartLine, "key">) => void; i: number }) {
  const drink = item.category !== "treats";
  const [milk, setMilk] = useState<CartLine["milk"]>(drink && item.category === "coffee" ? "whole" : "none");
  const [temp, setTemp] = useState<CartLine["temperature"]>("hot");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const opt = (on: boolean) =>
    `font-pixel px-2 py-1 text-xs border-2 border-[hsl(var(--walnut))] ${on ? "bg-[hsl(var(--walnut))] text-[hsl(var(--lamp))]" : "bg-transparent hover:bg-[hsl(var(--walnut)/.08)]"}`;
  return (
    <article
      className="bg-card px-border anim-rise flex flex-col p-4"
      style={{ animationDelay: `${i * 50}ms` }}
      data-testid={`card-menu-${item.id}`}
      aria-label={item.name}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-pixel text-xl leading-tight uppercase">{item.name}</h3>
          {item.badge && <span className="font-pixel mt-1 inline-block bg-[hsl(var(--denim))] px-1.5 py-0.5 text-[10px] tracking-wider text-[hsl(var(--lamp))] uppercase">{item.badge}</span>}
        </div>
        <span className="font-pixel slat px-2 py-0.5 text-lg" data-testid={`text-price-${item.id}`}>{money(item.priceCents)}</span>
      </div>
      <p className="text-muted-foreground mt-2 flex-1 text-sm leading-snug">{item.description}</p>
      {item.available ? (
        <div className="mt-3 space-y-2">
          {drink && (
            <>
              <div role="radiogroup" aria-label="Temperature" className="flex gap-1.5">
                {(["hot", "iced"] as const).map((t) => (
                  <button key={t} role="radio" aria-checked={temp === t} className={opt(temp === t)} onClick={() => setTemp(t)} data-testid={`option-temp-${t}-${item.id}`}>{t}</button>
                ))}
              </div>
              <div role="radiogroup" aria-label="Milk" className="flex flex-wrap gap-1.5">
                {(["whole", "oat", "almond", "none"] as const).map((m) => (
                  <button key={m} role="radio" aria-checked={milk === m} className={opt(milk === m)} onClick={() => setMilk(m)} data-testid={`option-milk-${m}-${item.id}`}>{m === "none" ? "no milk" : m}</button>
                ))}
              </div>
            </>
          )}
          <div className="flex items-center gap-2 pt-1">
            <div className="flex items-center border-2 border-[hsl(var(--walnut))]">
              <button aria-label="Less" className="px-2 font-pixel" onClick={() => setQty((q) => Math.max(1, q - 1))} data-testid={`button-qty-dec-${item.id}`}>-</button>
              <span className="font-pixel w-6 text-center" aria-live="polite">{qty}</span>
              <button aria-label="More" className="px-2 font-pixel" onClick={() => setQty((q) => Math.min(10, q + 1))} data-testid={`button-qty-inc-${item.id}`}>+</button>
            </div>
            <button
              className="px-btn font-pixel bg-primary text-primary-foreground ml-auto px-3 py-1.5 text-sm"
              onClick={() => {
                onAdd({ menuItemId: item.id, quantity: qty, milk: drink ? milk : "none", temperature: drink ? temp : "hot" });
                setAdded(true);
                window.setTimeout(() => setAdded(false), 900);
              }}
              data-testid={`button-add-${item.id}`}
            >
              {added ? <span className="anim-pop inline-flex items-center gap-1"><Check size={14} />Added</span> : "Add to tab"}
            </button>
          </div>
        </div>
      ) : (
        <p className="font-pixel mt-3 text-sm text-[hsl(var(--destructive))]">Sold out for today</p>
      )}
    </article>
  );
}

/* ---------------- order tracker ---------------- */
const STEPS = ["accepted", "preparing", "ready", "collected"] as const;
function OrderTicket({ o }: { o: Order }) {
  const idx = STEPS.indexOf(o.status as (typeof STEPS)[number]);
  return (
    <li className="bg-card px-border p-4" data-testid={`card-order-${o.id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-pixel text-xl">Ticket #{o.number}</p>
        <div className="flex gap-2">
          {o.practice && <span className="font-pixel bg-[hsl(var(--lamp))] px-2 py-0.5 text-xs">PRACTICE - no charge</span>}
          <span className="font-pixel text-muted-foreground text-xs">{new Date(o.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
        </div>
      </div>
      <p className="text-muted-foreground text-sm">{o.lines.map((l) => `${l.quantity}x ${l.name}`).join(", ")} / {money(o.totalCents)}</p>
      {o.status === "cancelled" ? (
        <p className="font-pixel mt-3 text-[hsl(var(--destructive))]" data-testid={`status-order-${o.id}`}>Cancelled</p>
      ) : (
        <ol className="mt-3 grid grid-cols-4 gap-1" aria-label={`Status: ${o.status}`} data-testid={`status-order-${o.id}`}>
          {STEPS.map((s, i) => (
            <li key={s} className="text-center">
              <div className={`h-3 ${i <= idx ? "bg-primary" : "bg-muted"} ${i === idx && s !== "collected" ? "animate-pulse" : ""}`} />
              <span className={`font-pixel mt-1 block text-[10px] uppercase sm:text-xs ${i === idx ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}

/* ================= THE CAFE ================= */
export default function Cafe() {
  const qc = useQueryClient();
  const shop = useGetShop();
  const menu = useGetMenu();
  const pets = useGetPets();
  const { userId, isLoaded: authLoaded } = useAuth();
  const { user } = useUser();
  const welcomeName = resolveWelcomeName(authLoaded && userId ? user : null);
  const me = useGetMe();
  const orders = useGetOrders();
  const equip = useUpdatePreferences();
  const role = me.data?.role;
  const isStaff = role === "staff" || role === "admin";

  const [drawer, setDrawer] = useState<DrawerName>(null);
  const [cat, setCat] = useState<"coffee" | "tea" | "treats">("coffee");
  const [lines, setLinesState] = useState<CartLine[]>(() => {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; }
  });
  const setLines = useCallback((fn: (l: CartLine[]) => CartLine[]) => setLinesState(fn), []);
  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(lines)); }, [lines]);

  const [speech, setSpeech] = useState({ text: BARISTA_GREETING, id: 0 });
  const say = useCallback((text: string) => setSpeech((s) => ({ text, id: s.id + 1 })), []);
  const pet = usePetMachine();
  const sendRef = useRef(pet.send);
  sendRef.current = pet.send;
  const soundRef = useRef(false);
  soundRef.current = !!me.data?.soundEnabled;

  const osReduced = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const reduced = !!me.data?.reducedMotion || osReduced;
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", !!me.data?.reducedMotion);
  }, [me.data?.reducedMotion]);

  // speech auto-clear
  useEffect(() => {
    if (!speech.text) return;
    const t = window.setTimeout(() => setSpeech((s) => ({ ...s, text: "" })), 6000);
    return () => window.clearTimeout(t);
  }, [speech]);

  /* -------- SSE -------- */
  const statusRef = useRef(new Map<string, string>());
  useEffect(() => {
    for (const o of orders.data ?? []) if (!statusRef.current.has(o.id)) statusRef.current.set(o.id, o.status);
  }, [orders.data]);
  const [live, setLive] = useState<"connecting" | "open" | "down">("connecting");
  useEffect(() => {
    if (!authLoaded) return;
    statusRef.current.clear();
    setLive("connecting");
    say(BARISTA_GREETING);
    let es: EventSource | null = null;
    let retry: number | undefined;
    let closed = false;
    const connect = () => {
      es = new EventSource(`${basePath}/api/events`, { withCredentials: true });
      es.onopen = () => {
        setLive("open");
        qc.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
        qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
        qc.invalidateQueries({ queryKey: getGetStaffOrdersQueryKey() });
      };
      es.addEventListener("order", (ev) => {
        try {
          const o = JSON.parse((ev as MessageEvent).data) as Order;
          const prev = statusRef.current.get(o.id);
          statusRef.current.set(o.id, o.status);
          qc.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
          qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
          qc.invalidateQueries({ queryKey: getGetStaffOrdersQueryKey() });
          if (prev !== o.status) {
            say(`#${o.number}: ${STATUS_LINES[o.status] ?? o.status}`);
            if (o.status === "preparing" || o.status === "accepted") sendRef.current("BREW");
            if (o.status === "ready") sendRef.current("READY");
            if (o.status === "collected") sendRef.current("POKE");
            if (soundRef.current) blip(o.status === "ready" ? 988 : 523, 0.12);
          }
        } catch { /* ignore malformed */ }
      });
      es.onerror = () => {
        setLive("down");
        es?.close();
        if (!closed) retry = window.setTimeout(connect, 3000);
      };
    };
    connect();
    return () => { closed = true; es?.close(); window.clearTimeout(retry); };
  }, [qc, say, userId, authLoaded]);

  const menuData = menu.data ?? [];
  const petList: Pet[] = useMemo(() => [...(pets.data ?? [])].sort((a, b) => a.unlockAt - b.unlockAt), [pets.data]);
  const activePet = petList.find((p) => p.id === me.data?.selectedPet) ?? petList[0];
  const activeKind = activePet ? spriteKind(activePet) : "ginger";
  const cartCount = lines.reduce((s, l) => s + l.quantity, 0);
  const completed = me.data?.completedOrders ?? 0;

  const poke = () => {
    pet.send("POKE");
    say(BARISTA_GREETING);
    if (soundRef.current) blip(880);
  };

  const addLine = (l: Omit<CartLine, "key">) => {
    setLines((ls) => {
      const found = ls.find((x) => x.menuItemId === l.menuItemId && x.milk === l.milk && x.temperature === l.temperature);
      if (found) return ls.map((x) => (x === found ? { ...x, quantity: Math.min(10, x.quantity + l.quantity) } : x));
      return [...ls, { ...l, key: `${l.menuItemId}-${l.milk}-${l.temperature}-${Date.now()}` }];
    });
    const m = menuData.find((x) => x.id === l.menuItemId);
    pet.send("POKE");
    say(`${m?.name ?? "That"}, coming right up on your tab.`);
    if (soundRef.current) blip(740);
  };

  const equipPet = (p: Pet) => {
    equip.mutate(
      { data: { selectedPet: p.id } },
      {
        onSuccess: (c) => { qc.setQueryData(getGetMeQueryKey(), c); say(`${p.name} is on shift now.`); pet.send("POKE"); },
        onError: (e) => say(apiError(e)),
      },
    );
  };

  const navBtn = "px-btn font-pixel bg-card flex items-center gap-1.5 px-3 py-2 text-sm";

  return (
    <div className="cafe-root">
      <a href="#scene-menu" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-card p-2">Skip to menu</a>

      {/* ---------- top bar ---------- */}
      <header className="sticky top-0 z-40 border-b-4 border-[hsl(var(--walnut))] bg-[hsl(var(--wall)/.92)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <img src={asset("/logo.svg")} alt="" className="pixelated h-9 w-9" />
          <div className="mr-auto leading-none">
            <p className="font-pixel text-xl font-bold" data-testid="text-shop-name">{shop.data?.name ?? "Purr & Pour"}</p>
            <p className="font-chalk text-muted-foreground text-base">neighborhood counter, pickup only</p>
          </div>
          <span className="hidden items-center gap-1.5 text-xs sm:flex font-pixel" title="Live order updates" data-testid="status-live">
            <span className={`h-2 w-2 ${live === "open" ? "bg-[hsl(140_45%_40%)]" : live === "down" ? "bg-destructive" : "bg-[hsl(var(--lamp))]"}`} />
            {live === "open" ? "live" : live === "down" ? "reconnecting" : "connecting"}
          </span>
          <button className={navBtn} onClick={() => setDrawer("menu")} data-testid="button-open-menu"><span className="font-pixel">Menu</span></button>
          <button className={`${navBtn} hidden sm:flex`} onClick={() => setDrawer("orders")} data-testid="button-open-orders"><ClipboardList size={16} /><span className="hidden md:inline">Tickets</span></button>
          <button className={`${navBtn} hidden sm:flex`} onClick={() => setDrawer("pets")} data-testid="button-open-pets"><span className="font-pixel">Crew</span></button>
          {isStaff && <button className={navBtn} onClick={() => setDrawer("staff")} data-testid="button-open-staff"><ClipboardList size={16} /><span className="hidden md:inline">Rail</span></button>}
          {role === "admin" && <button className={navBtn} onClick={() => setDrawer("admin")} data-testid="button-open-admin"><PencilRuler size={16} /><span className="hidden md:inline">Board</span></button>}
          <button className={navBtn} aria-label="Settings" onClick={() => setDrawer("settings")} data-testid="button-open-settings"><Settings2 size={16} /></button>
          <button className={navBtn} aria-label="Account" onClick={() => setDrawer("account")} data-testid="button-open-account"><UserRound size={16} /><span className="hidden md:inline">{me.data?.signedIn ? me.data.name.split(" ")[0] || "You" : "Sign in"}</span></button>
          <button className={`${navBtn} !bg-primary text-primary-foreground`} onClick={() => setDrawer("cart")} data-testid="button-open-cart" aria-label={`Open tab, ${cartCount} items`}>
            <ShoppingBag size={16} />
            <span key={cartCount} className="anim-pop">{cartCount}</span>
          </button>
        </div>
      </header>

      <div id="cafe-main" className="contents">
        <CafeScene
          menu={menuData}
          loading={menu.isLoading}
          pet={activePet}
          petList={petList}
          unlocked={me.data?.unlockedPets ?? []}
          speech={speech}
          petState={pet.state}
          reduced={reduced}
          cartCount={cartCount}
          welcomeName={welcomeName}
          announcement={shop.data?.announcement}
          onMenu={() => setDrawer("menu")}
          onCategory={(category) => { setCat(category); setDrawer("menu"); }}
          onPets={() => setDrawer("pets")}
          onOrders={() => setDrawer("orders")}
          onCart={() => setDrawer("cart")}
          onPoke={poke}
          onWake={() => { if (pet.state === "sleep") pet.send("WAKE"); }}
        />
      </div>

      {shop.isError && (
        <div className="fixed bottom-4 left-4 z-40"><ErrorBox msg={apiError(shop.error)} retry={() => shop.refetch()} /></div>
      )}

      <ChalkDrawer open={drawer === "menu"} onClose={() => setDrawer(null)} title="The Board" desc="Choose a shelf, make it yours, and add it to your tab." testId="drawer-menu">
        <div role="tablist" aria-label="Menu category" className="sticky top-0 z-10 -mx-2 mb-4 flex gap-2 bg-[hsl(140_6%_18%)] px-2 py-2"
          onKeyDown={(e) => {
            const cats = ["coffee", "tea", "treats"] as const;
            const i = cats.indexOf(cat);
            if (e.key === "ArrowRight") setCat(cats[(i + 1) % cats.length]);
            if (e.key === "ArrowLeft") setCat(cats[(i + cats.length - 1) % cats.length]);
          }}>
          {(["coffee", "tea", "treats"] as const).map((c) => (
            <button key={c} role="tab" aria-selected={cat === c} tabIndex={cat === c ? 0 : -1}
              className={`font-pixel min-h-11 flex-1 border-2 px-2 py-2 text-sm uppercase ${cat === c ? "border-[hsl(var(--lamp))] bg-[hsl(var(--lamp))] text-[hsl(var(--walnut))]" : "border-[hsl(var(--chalk-ink)/.6)] text-[hsl(var(--chalk-ink))]"}`}
              onClick={() => setCat(c)} data-testid={`tab-${c}`}>{c}</button>
          ))}
        </div>
        {menu.isLoading ? (
          <div className="space-y-4" aria-label="Loading menu">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse border-2 border-[hsl(var(--chalk-ink)/.18)] bg-[hsl(var(--chalk-ink)/.06)]" />)}</div>
        ) : menu.isError ? (
          <ErrorBox msg={apiError(menu.error)} retry={() => menu.refetch()} />
        ) : menuData.filter((m) => m.category === cat).length === 0 ? (
          <p className="border-2 border-dashed border-[hsl(var(--chalk-ink)/.4)] p-5 font-pixel">Nothing in {cat} today. Try another shelf.</p>
        ) : (
          <div role="tabpanel" className="space-y-4">
            {menuData.filter((m) => m.category === cat).map((m, i) => <MenuCard key={m.id} item={m} i={i} onAdd={addLine} />)}
          </div>
        )}
      </ChalkDrawer>

      <ChalkDrawer open={drawer === "pets"} onClose={() => setDrawer(null)} title="The Crew" desc="Baristas join your counter as loyalty milestones. Practice orders never count toward stamps." testId="drawer-pets">
        <div className="mb-4 flex items-center justify-between border-b border-dashed border-[hsl(var(--chalk-ink)/.3)] pb-3">
          <span className="font-pixel text-[hsl(var(--lamp))]" data-testid="text-completed-orders">{completed} {completed === 1 ? "order" : "orders"} stamped</span>
          {!me.data?.signedIn && <button className="min-h-11 underline decoration-dashed" onClick={() => setDrawer("account")} data-testid="button-guest-signin">Sign in to keep progress</button>}
        </div>
        {pets.isLoading ? (
          <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="h-48 animate-pulse border-2 border-[hsl(var(--chalk-ink)/.15)]" />)}</div>
        ) : pets.isError ? (
          <ErrorBox msg={apiError(pets.error)} retry={() => pets.refetch()} />
        ) : (
          <ul className="space-y-4">
            {petList.map((p) => {
              const unlocked = !!me.data?.unlockedPets.includes(p.id);
              const equipped = me.data?.selectedPet === p.id;
              const pct = Math.min(100, p.unlockAt === 0 ? 100 : (completed / p.unlockAt) * 100);
              return (
                <li key={p.id} className="border-2 border-[hsl(var(--chalk-ink)/.3)] p-3" data-testid={`card-pet-${p.id}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-24 w-24 shrink-0 items-end justify-center" style={{ background: `radial-gradient(circle at 50% 80%, ${p.color}33, transparent 65%)` }}>
                      <PetPreview kind={spriteKind(p)} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-pixel text-xl">{p.name}</h3>
                      <p className="text-[hsl(var(--chalk-ink)/.7)]">{p.species} / {p.personality}</p>
                      <p className="mt-1 text-sm">{p.unlockAt === 0 ? "Starter, on the house" : unlocked ? `Earned at ${p.unlockAt} orders` : `${Math.max(0, p.unlockAt - completed)} more orders`}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 bg-[hsl(var(--chalk-ink)/.15)]" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} unlock progress`}>
                    <div className="h-full bg-[hsl(var(--lamp))]" style={{ width: `${pct}%` }} />
                  </div>
                  <button disabled={!unlocked || equipped || equip.isPending} onClick={() => equipPet(p)}
                    className={`font-pixel mt-3 min-h-11 w-full border-2 px-3 py-2 text-sm ${equipped ? "border-[hsl(var(--lamp))] bg-[hsl(var(--lamp))] text-[hsl(var(--walnut))]" : "border-[hsl(var(--chalk-ink)/.7)] hover:bg-[hsl(var(--chalk-ink)/.1)]"} disabled:cursor-not-allowed disabled:opacity-50`}
                    data-testid={`button-equip-${p.id}`}>
                    {equipped ? "On shift" : unlocked ? "Put on shift" : <span className="inline-flex items-center gap-1"><Lock size={14} />Preview only</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ChalkDrawer>

      <ChalkDrawer open={drawer === "orders"} onClose={() => setDrawer(null)} title="Your Tickets" desc="Follow every cup from the rail to the pickup counter." testId="drawer-orders">
        {orders.isLoading ? (
          <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse border-2 border-[hsl(var(--chalk-ink)/.15)]" />)}</div>
        ) : orders.isError ? (
          <ErrorBox msg={apiError(orders.error)} retry={() => orders.refetch()} />
        ) : (orders.data ?? []).length === 0 ? (
          <div className="py-8 text-center">
            <PetSprite kind={activeKind} px={72} state="sleep" />
            <p className="font-pixel mt-2 text-xl text-[hsl(var(--lamp))]">No tickets yet.</p>
            <p className="mt-1 text-lg text-[hsl(var(--chalk-ink)/.7)]">A practice ticket runs through the live kitchen queue. No charge.</p>
            <button className="font-pixel mt-4 min-h-11 border-2 border-[hsl(var(--lamp))] px-4 py-2" onClick={() => setDrawer("menu")} data-testid="button-orders-menu">Browse the board</button>
          </div>
        ) : (
          <ul className="space-y-4">{(orders.data ?? []).slice(0, 12).map((o) => <OrderTicket key={o.id} o={o} />)}</ul>
        )}
      </ChalkDrawer>

      <CartDrawer open={drawer === "cart"} onClose={() => setDrawer(null)} lines={lines} setLines={setLines} menu={menuData} shop={shop.data} me={me.data}
        onPlaced={(o) => {
          setDrawer("orders");
          statusRef.current.set(o.id, o.status);
          pet.send("BREW");
          say(`Ticket #${o.number}${o.practice ? " (practice)" : ""}. ${STATUS_LINES[o.status] ?? ""}`);
        }} />
      <SettingsDrawer open={drawer === "settings"} onClose={() => setDrawer(null)} me={me.data} pets={petList} />
      <AccountDrawer open={drawer === "account"} onClose={() => setDrawer(null)} me={me.data} />
      {isStaff && <StaffDrawer open={drawer === "staff"} onClose={() => setDrawer(null)} enabled={isStaff} />}
      {role === "admin" && <AdminDrawer open={drawer === "admin"} onClose={() => setDrawer(null)} menu={menuData} />}
    </div>
  );
}

function PetPreview({ kind }: { kind: ReturnType<typeof spriteKind> }) {
  const m = usePetMachine();
  return (
    <button onClick={() => m.send("POKE")} onMouseEnter={() => m.send("WAKE")} aria-label="Preview animation" className="cursor-pointer">
      <PetSprite kind={kind} px={112} state={m.state} />
    </button>
  );
}
