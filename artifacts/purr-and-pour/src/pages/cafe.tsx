import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
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
import { PetSprite, SpeechCloud, usePetMachine } from "@/components/pet-sprite";
import { AccountDrawer, AdminDrawer, CartDrawer, SettingsDrawer, StaffDrawer, type DrawerName } from "@/components/drawers";
import { STATUS_LINES, apiError, asset, basePath, blip, money, spriteKind, type CartLine } from "@/lib/cafe";

const POKES = ["Mrrp! What'll it be?", "Oat milk? Bold choice.", "I only knock over empty cups.", "Pour-over takes four minutes. I counted.", "Scritch accepted.", "Don't tell the corgi, but you're my favorite."];
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

  const [speech, setSpeech] = useState({ text: "Morning! The lamp's warm and so is the milk.", id: 0 });
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
    say("");
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
  const activeOrders = (orders.data ?? []).filter((o) => o.status !== "collected" && o.status !== "cancelled");

  const poke = () => {
    pet.send("POKE");
    say(POKES[(speech.id + 1) % POKES.length]);
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
    <div className="min-h-[100dvh]">
      <a href="#menu" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-card p-2">Skip to menu</a>

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

      {shop.data?.announcement && (
        <p className="font-chalk bg-[hsl(var(--chalk))] py-1.5 text-center text-lg text-[hsl(var(--chalk-ink))]" data-testid="text-announcement">{shop.data.announcement}</p>
      )}

      {/* ---------- the scene ---------- */}
      <section aria-label="The cafe counter" className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-10 md:grid-cols-[1.1fr_1fr] md:pt-14">
          <div className="anim-rise relative z-10">
            <p className="font-pixel text-primary text-sm tracking-[.2em] uppercase">Practice counter · no charges</p>
            <h1 className="font-pixel mt-2 text-5xl leading-[.95] font-bold md:text-7xl">
              Order from<br />the cat<br /><span className="text-[hsl(var(--denim))]">behind the bar.</span>
            </h1>
            <p className="text-muted-foreground mt-5 max-w-md text-lg">
              Pick a drink, tune the milk, and meet your barista. Try a practice order today. Once live, paid pickups will earn stamps toward your next companion.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#menu" className="px-btn font-pixel bg-primary text-primary-foreground px-5 py-3" data-testid="link-menu">See the board</a>
              <button className="px-btn font-pixel bg-card px-5 py-3" onClick={() => document.getElementById("pets")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" })} data-testid="button-meet-pets">Meet the crew</button>
            </div>
          </div>

          {/* wall slats - live menu board */}
          <div className="relative min-h-[300px]">
            <div className="lamp-beam anim-sway pointer-events-none absolute -top-14 left-1/2 h-[340px] w-[320px] -translate-x-1/2" aria-hidden />
            <div className="absolute -top-14 left-1/2 h-8 w-1 -translate-x-1/2 bg-[hsl(var(--walnut))]" aria-hidden />
            <div className="absolute -top-6 left-1/2 h-8 w-24 -translate-x-1/2 rounded-t-full bg-[hsl(210_8%_78%)] shadow-[inset_0_-6px_0_hsl(45_76%_79%)]" aria-hidden />
            <ul className="relative mt-16 space-y-2" aria-label="Today's board">
              {menu.isLoading
                ? [0, 1, 2, 3, 4].map((i) => <li key={i} className="slat h-7 animate-pulse opacity-60" />)
                : menuData.slice(0, 7).map((m, i) => (
                    <li key={m.id} className="anim-rise" style={{ animationDelay: `${200 + i * 60}ms` }}>
                      <button
                        className="slat font-pixel flex w-full justify-between px-4 py-1 text-left text-lg uppercase hover:translate-x-1 transition-transform"
                        onClick={() => { setCat(m.category); document.getElementById(`menu`)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" }); }}
                        data-testid={`button-slat-${m.id}`}
                      >
                        <span className={m.available ? "" : "line-through opacity-60"}>{m.name}</span>
                        <span>{(m.priceCents / 100).toFixed(2)}</span>
                      </button>
                    </li>
                  ))}
            </ul>
          </div>
        </div>

        {/* counter */}
        <div className="relative mt-24">
          <div className="relative mx-auto flex max-w-6xl items-end gap-4 px-4">
            <div className="absolute bottom-full left-4 mb-2 md:left-[14%]">
              <SpeechCloud text={speech.text} id={speech.id} />
            </div>
            <button
              className="relative ml-4 cursor-pointer md:ml-[12%]"
              onClick={poke}
              onPointerEnter={() => pet.state === "sleep" && pet.send("WAKE")}
              aria-label={`Pet ${activePet?.name ?? "the barista"}. Currently ${pet.state}.`}
              data-testid="button-poke-pet"
            >
              <PetSprite kind={activeKind} px={128} state={reduced && pet.state !== "sleep" ? "idle" : pet.state} />
            </button>
            {/* counter props */}
            <div className="mb-1 flex items-end gap-3" aria-hidden>
              <div className="relative h-14 w-10 border-4 border-[hsl(var(--walnut))] bg-[hsl(210_6%_70%)]">
                <span className="steam absolute -top-6 left-3 h-5 w-1.5 bg-[hsl(34_60%_97%/.8)]" />
              </div>
              <div className="h-10 w-8 border-4 border-[hsl(var(--walnut))] bg-[hsl(34_60%_96%)]" />
              <div className="h-8 w-7 border-4 border-[hsl(var(--walnut))] bg-[hsl(var(--denim))]" />
            </div>
            <div className="ml-auto hidden gap-6 pb-1 sm:flex" aria-hidden>
              {petList.filter((p) => p.id !== activePet?.id).map((p) => (
                <PetSprite key={p.id} kind={spriteKind(p)} px={72} state={me.data?.unlockedPets.includes(p.id) ? "sleep" : "idle"} locked={!me.data?.unlockedPets.includes(p.id)} />
              ))}
            </div>
          </div>
          <div className="h-5 bg-[hsl(34_40%_96%)] border-y-4 border-[hsl(var(--walnut))]" />
          <div className="oak h-28 border-b-8 border-[hsl(var(--walnut))]" />
        </div>
      </section>

      {/* ---------- active orders ---------- */}
      <section aria-labelledby="orders-h" className="mx-auto max-w-6xl px-4 pt-14">
        <div className="flex items-end justify-between gap-4">
          <h2 id="orders-h" className="font-pixel text-3xl">Your tickets</h2>
          <span className="font-chalk text-muted-foreground text-lg">{activeOrders.length} on the rail</span>
        </div>
        <div className="mt-4">
          {orders.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <div key={i} className="bg-card px-border h-28 animate-pulse" />)}</div>
          ) : orders.isError ? (
            <ErrorBox msg={apiError(orders.error)} retry={() => orders.refetch()} />
          ) : (orders.data ?? []).length === 0 ? (
            <div className="bg-card px-border flex items-center gap-5 p-5">
              <PetSprite kind={activeKind} px={64} state="sleep" />
              <div>
                <p className="font-pixel text-lg">No tickets yet.</p>
                <p className="text-muted-foreground text-sm">Place a practice order to watch it go accepted, preparing, ready, live from the bar.</p>
              </div>
            </div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">{(orders.data ?? []).slice(0, 6).map((o) => <OrderTicket key={o.id} o={o} />)}</ul>
          )}
        </div>
      </section>

      {/* ---------- menu ---------- */}
      <section id="menu" aria-labelledby="menu-h" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="menu-h" className="font-pixel text-4xl">The board</h2>
            <p className="text-muted-foreground">Prices in USD. Everything is made to order for pickup.</p>
          </div>
          <div role="tablist" aria-label="Menu category" className="flex gap-2"
            onKeyDown={(e) => {
              const cats = ["coffee", "tea", "treats"] as const;
              const i = cats.indexOf(cat);
              if (e.key === "ArrowRight") setCat(cats[(i + 1) % 3]);
              if (e.key === "ArrowLeft") setCat(cats[(i + 2) % 3]);
            }}>
            {(["coffee", "tea", "treats"] as const).map((c) => (
              <button key={c} role="tab" aria-selected={cat === c} tabIndex={cat === c ? 0 : -1}
                className={`px-btn font-pixel px-4 py-2 text-sm uppercase ${cat === c ? "bg-[hsl(var(--walnut))] text-[hsl(var(--lamp))]" : "bg-card"}`}
                onClick={() => setCat(c)} data-testid={`tab-${c}`}>{c}</button>
            ))}
          </div>
        </div>
        <div className="mt-6" role="tabpanel">
          {menu.isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="bg-card px-border h-52 animate-pulse" />)}</div>
          ) : menu.isError ? (
            <ErrorBox msg={apiError(menu.error)} retry={() => menu.refetch()} />
          ) : menuData.filter((m) => m.category === cat).length === 0 ? (
            <p className="bg-card px-border p-6 font-pixel">Nothing in {cat} today. Check the other shelves.</p>
          ) : (
            <div key={cat} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {menuData.filter((m) => m.category === cat).map((m, i) => <MenuCard key={m.id} item={m} i={i} onAdd={addLine} />)}
            </div>
          )}
        </div>
      </section>

      {/* ---------- pets / loyalty ---------- */}
      <section id="pets" aria-labelledby="pets-h" className="mt-20 scroll-mt-24 bg-[hsl(var(--chalk))] py-14 text-[hsl(var(--chalk-ink))]">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="pets-h" className="font-pixel text-4xl text-[hsl(var(--lamp))]">The crew</h2>
              <p className="font-chalk max-w-xl text-xl text-[hsl(var(--chalk-ink)/.75)]">
                Baristas join your counter as loyalty milestones. They are never sold. Practice orders don't count toward stamps.
              </p>
            </div>
            <p className="font-pixel text-lg" data-testid="text-completed-orders">{completed} {completed === 1 ? "order" : "orders"} stamped</p>
          </div>
          {!me.data?.signedIn && (
            <p className="font-chalk mt-4 border-2 border-dashed border-[hsl(var(--lamp)/.5)] p-3 text-lg">
              You're browsing as a guest. Your stamps and unlocked pets are stored in this browser only and can't be claimed later by email.{" "}
              <button className="underline decoration-dashed text-[hsl(var(--lamp))]" onClick={() => setDrawer("account")} data-testid="button-guest-signin">Sign in</button> to carry them with you.
            </p>
          )}
          {pets.isLoading ? (
            <div className="mt-8 grid gap-6 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-72 animate-pulse bg-[hsl(var(--chalk-ink)/.06)]" />)}</div>
          ) : pets.isError ? (
            <div className="mt-8"><ErrorBox msg={apiError(pets.error)} retry={() => pets.refetch()} /></div>
          ) : (
            <ul className="mt-8 grid gap-6 md:grid-cols-3">
              {petList.map((p) => {
                const unlocked = !!me.data?.unlockedPets.includes(p.id);
                const equipped = me.data?.selectedPet === p.id;
                const pct = Math.min(100, p.unlockAt === 0 ? 100 : (completed / p.unlockAt) * 100);
                return (
                  <li key={p.id} className="flex flex-col border-2 border-[hsl(var(--chalk-ink)/.3)] p-5" data-testid={`card-pet-${p.id}`}>
                    <div className="flex h-36 items-end justify-center" style={{ background: `radial-gradient(circle at 50% 80%, ${p.color}33, transparent 65%)` }}>
                      <PetPreview kind={spriteKind(p)} />
                    </div>
                    <h3 className="font-pixel mt-3 text-2xl">{p.name}</h3>
                    <p className="font-chalk text-lg text-[hsl(var(--chalk-ink)/.65)]">{p.species} / {p.personality}</p>
                    <div className="mt-3 h-3 bg-[hsl(var(--chalk-ink)/.12)]" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} unlock progress`}>
                      <div className="h-full bg-[hsl(var(--lamp))]" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="font-chalk mt-1 text-lg">{p.unlockAt === 0 ? "Starter, on the house" : unlocked ? `Earned at ${p.unlockAt} orders` : `${Math.max(0, p.unlockAt - completed)} more orders to unlock`}</p>
                    <button
                      disabled={!unlocked || equipped || equip.isPending}
                      onClick={() => equipPet(p)}
                      className={`font-pixel mt-4 px-4 py-2 text-sm ${equipped ? "bg-[hsl(var(--lamp))] text-[hsl(var(--walnut))]" : "border-2 border-[hsl(var(--chalk-ink)/.7)] hover:bg-[hsl(var(--chalk-ink)/.1)]"} disabled:cursor-not-allowed ${!unlocked ? "opacity-50" : ""}`}
                      data-testid={`button-equip-${p.id}`}
                    >
                      {equipped ? "On shift" : unlocked ? "Put on shift" : <span className="inline-flex items-center gap-1"><Lock size={14} />Preview only</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section aria-labelledby="how-h" className="mx-auto max-w-6xl px-4 py-16">
        <h2 id="how-h" className="font-pixel text-3xl">How the counter works</h2>
        <ol className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-[1fr_1.3fr]">
          <li className="bg-card px-border p-5 md:row-span-2">
            <p className="font-pixel text-primary text-5xl">01</p>
            <p className="font-pixel mt-2 text-xl">Practice runs the real rail</p>
            <p className="text-muted-foreground mt-1">A practice order is saved and moves through accepted, preparing and ready on the server. No charge, no actual coffee, no loyalty stamp.</p>
          </li>
          <li className="border-l-4 border-[hsl(var(--denim))] pl-4">
            <p className="font-pixel text-xl">02 / Paid orders are waiting on the card reader</p>
            <p className="text-muted-foreground">Online payment isn't connected yet. When it is, paid pickups will stamp your card.</p>
          </li>
          <li className="border-l-4 border-[hsl(var(--oak))] pl-4">
            <p className="font-pixel text-xl">03 / Pickup at the counter</p>
            <p className="text-muted-foreground">About {shop.data?.pickupMinutes ?? 10} minutes from accepted. Your barista shouts when it's ready.</p>
          </li>
        </ol>
      </section>

      <footer className="oak border-t-8 border-[hsl(var(--walnut))] py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4">
          <p className="font-pixel text-lg text-[hsl(var(--walnut))]">{shop.data?.name ?? "Purr & Pour"} / pickup only / USD</p>
          <img src={asset("/sprites/reference-cafe.png")} alt="Pixel art of the cafe counter with the ginger cat barista" className="pixelated h-24 w-auto border-4 border-[hsl(var(--walnut))]" />
        </div>
      </footer>

      {shop.isError && (
        <div className="fixed bottom-4 left-4 z-40"><ErrorBox msg={apiError(shop.error)} retry={() => shop.refetch()} /></div>
      )}

      <CartDrawer open={drawer === "cart"} onClose={() => setDrawer(null)} lines={lines} setLines={setLines} menu={menuData} shop={shop.data} me={me.data}
        onPlaced={(o) => {
          setDrawer(null);
          statusRef.current.set(o.id, o.status);
          pet.send("BREW");
          say(`Ticket #${o.number}${o.practice ? " (practice)" : ""}. ${STATUS_LINES[o.status] ?? ""}`);
          document.getElementById("orders-h")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
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
