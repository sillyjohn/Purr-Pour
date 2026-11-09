import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SignIn, useClerk, useUser } from "@clerk/react";
import {
  getGetMeQueryKey,
  getGetMenuQueryKey,
  getGetOrdersQueryKey,
  getGetStaffOrdersQueryKey,
  useGetStaffOrders,
  usePlaceOrder,
  useUpdateMenuItem,
  useUpdateOrderStatus,
  useUpdatePreferences,
  type Customer,
  type MenuItem,
  type Order,
  type Pet,
  type Shop,
} from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Minus, Plus, Trash2, Lock, RotateCw } from "lucide-react";
import { apiError, basePath, money, spriteKind, uuid, type CartLine } from "@/lib/cafe";
import { PetSprite } from "@/components/pet-sprite";

export type DrawerName = "cart" | "settings" | "account" | "staff" | "admin" | null;

function ChalkDrawer({
  open,
  onClose,
  title,
  desc,
  children,
  testId,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  desc: string;
  children: ReactNode;
  testId: string;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        data-testid={testId}
        className="chalkboard w-full overflow-y-auto border-y-0 border-r-0 p-0 sm:max-w-[460px] [&>button]:text-[hsl(var(--chalk-ink))]"
      >
        <div className="p-6 pb-10">
          <SheetHeader className="mb-5 text-left">
            <SheetTitle className="font-pixel text-3xl tracking-wide text-[hsl(var(--lamp))]">{title}</SheetTitle>
            <SheetDescription className="font-chalk text-lg text-[hsl(var(--chalk-ink)/.7)]">{desc}</SheetDescription>
          </SheetHeader>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

const chalkBtn =
  "font-pixel px-4 py-2 text-sm border-2 border-[hsl(var(--chalk-ink)/.7)] text-[hsl(var(--chalk-ink))] hover:bg-[hsl(var(--chalk-ink)/.1)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors";
const chalkBtnHot =
  "font-pixel px-4 py-3 text-base bg-[hsl(var(--lamp))] text-[hsl(var(--walnut))] hover:bg-[hsl(45_80%_86%)] disabled:opacity-40 disabled:cursor-not-allowed";

/* ================= CART + CHECKOUT ================= */
export function CartDrawer({
  open,
  onClose,
  lines,
  menu,
  shop,
  me,
  setLines,
  onPlaced,
}: {
  open: boolean;
  onClose: () => void;
  lines: CartLine[];
  menu: MenuItem[];
  shop?: Shop;
  me?: Customer;
  setLines: (fn: (l: CartLine[]) => CartLine[]) => void;
  onPlaced: (o: Order) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [requestId, setRequestId] = useState(uuid);
  const [err, setErr] = useState("");
  const place = usePlaceOrder();

  useEffect(() => {
    if (me?.signedIn && me.name && !name) setName(me.name);
  }, [me, name]);

  const byId = new Map(menu.map((m) => [m.id, m]));
  const total = lines.reduce((s, l) => s + (byId.get(l.menuItemId)?.priceCents ?? 0) * l.quantity, 0);
  const valid = lines.length > 0 && name.trim().length > 0 && /.+@.+\..+/.test(email);

  const submit = (practice: boolean) => {
    setErr("");
    place.mutate(
      {
        data: {
          customerName: name.trim(),
          email: email.trim(),
          notes: notes.trim() || undefined,
          practice,
          requestId,
          lines: lines.map(({ menuItemId, quantity, milk, temperature }) => ({ menuItemId, quantity, milk, temperature })),
        },
      },
      {
        onSuccess: (order) => {
          qc.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
          qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setLines(() => []);
          setNotes("");
          setRequestId(uuid());
          onPlaced(order);
        },
        onError: (e) => setErr(apiError(e)),
      },
    );
  };

  const qty = (key: string, d: number) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, quantity: Math.min(10, Math.max(1, l.quantity + d)) } : l)));

  return (
    <ChalkDrawer open={open} onClose={onClose} title="Your Tab" desc={`Pickup only. Ready in about ${shop?.pickupMinutes ?? 10} minutes.`} testId="drawer-cart">
      {lines.length === 0 ? (
        <div className="py-10 text-center">
          <p className="font-pixel text-xl text-[hsl(var(--lamp))]">Empty cup.</p>
          <p className="mt-2 text-lg text-[hsl(var(--chalk-ink)/.7)]">Pick something off the board and it lands here.</p>
          <button className={`${chalkBtn} mt-5`} onClick={onClose} data-testid="button-browse-menu">Back to the board</button>
        </div>
      ) : (
        <>
          <ul className="space-y-3" aria-label="Cart items">
            {lines.map((l) => {
              const m = byId.get(l.menuItemId);
              return (
                <li key={l.key} className="chalk-line pb-3" data-testid={`row-cart-${l.key}`}>
                  <div className="flex items-baseline justify-between gap-3 text-xl">
                    <span className="uppercase">{m?.name ?? "Unavailable item"}</span>
                    <span>{money((m?.priceCents ?? 0) * l.quantity)}</span>
                  </div>
                  <div className="flex items-center justify-between text-base text-[hsl(var(--chalk-ink)/.65)]">
                    <span>
                      {l.temperature} {l.milk !== "none" ? `/ ${l.milk} milk` : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <button aria-label="Decrease quantity" className="p-1 hover:text-[hsl(var(--lamp))]" onClick={() => qty(l.key, -1)} data-testid={`button-dec-${l.key}`}><Minus size={16} /></button>
                      <span className="w-6 text-center text-lg text-[hsl(var(--chalk-ink))]">{l.quantity}</span>
                      <button aria-label="Increase quantity" className="p-1 hover:text-[hsl(var(--lamp))]" onClick={() => qty(l.key, 1)} data-testid={`button-inc-${l.key}`}><Plus size={16} /></button>
                      <button aria-label="Remove item" className="ml-2 p-1 hover:text-[hsl(4_80%_70%)]" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} data-testid={`button-remove-${l.key}`}><Trash2 size={16} /></button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex justify-between font-pixel text-2xl text-[hsl(var(--lamp))]">
            <span>Total</span>
            <span data-testid="text-cart-total">{money(total)}</span>
          </div>

          <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid) submit(true); }}>
            <label className="block">
              <span className="text-base text-[hsl(var(--chalk-ink)/.7)]">Name for the cup</span>
              <input className="chalk-input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Marisol" required data-testid="input-name" />
            </label>
            <label className="block">
              <span className="text-base text-[hsl(var(--chalk-ink)/.7)]">Email (contact only, we won't send messages)</span>
              <input className="chalk-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@neighborhood.com" required data-testid="input-email" />
            </label>
            <label className="block">
              <span className="text-base text-[hsl(var(--chalk-ink)/.7)]">Notes for the barista</span>
              <textarea className="chalk-input resize-none" rows={2} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Extra foam, please" data-testid="input-notes" />
            </label>

            <div className="border-2 border-dashed border-[hsl(var(--lamp)/.6)] p-4">
              <p className="font-pixel text-lg text-[hsl(var(--lamp))]">Practice order</p>
              <p className="text-lg leading-snug text-[hsl(var(--chalk-ink)/.8)]">
                No charge. No actual coffee. No loyalty earned. It runs through the real kitchen queue so you can watch the barista work.
              </p>
              <button type="submit" disabled={!valid || place.isPending} className={`${chalkBtnHot} mt-3 w-full`} data-testid="button-practice-order">
                {place.isPending ? "Writing ticket..." : "Place practice order"}
              </button>
            </div>

            <div className="p-4 opacity-90">
              <p className="flex items-center gap-2 font-pixel text-lg"><Lock size={16} /> Live payment</p>
              <p className="text-lg leading-snug text-[hsl(var(--chalk-ink)/.7)]">
                {shop?.paymentEnabled
                  ? "Card payment is handled by the shop's payment provider."
                  : "Card payment is not connected yet, so real orders can't be paid online. Practice orders work in the meantime."}
              </p>
              <button type="button" disabled={!shop?.paymentEnabled || !valid || place.isPending} onClick={() => submit(false)} className={`${chalkBtn} mt-3 w-full`} data-testid="button-live-order">
                Pay {money(total)} and order
              </button>
            </div>
            {err && <p role="alert" className="text-lg text-[hsl(4_80%_72%)]" data-testid="text-order-error">{err}</p>}
          </form>
        </>
      )}
    </ChalkDrawer>
  );
}

/* ================= SETTINGS ================= */
export function SettingsDrawer({ open, onClose, me, pets }: { open: boolean; onClose: () => void; me?: Customer; pets: Pet[] }) {
  const qc = useQueryClient();
  const upd = useUpdatePreferences();
  const [pet, setPet] = useState("");
  const [rm, setRm] = useState(false);
  const [snd, setSnd] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (open && me) {
      setPet(me.selectedPet);
      setRm(me.reducedMotion);
      setSnd(me.soundEnabled);
      setMsg("");
    }
  }, [open, me]);

  const save = () => {
    setMsg("");
    upd.mutate(
      { data: { selectedPet: pet, reducedMotion: rm, soundEnabled: snd } },
      {
        onSuccess: (c) => {
          qc.setQueryData(getGetMeQueryKey(), c);
          setMsg("Saved to the board.");
        },
        onError: (e) => setMsg(apiError(e)),
      },
    );
  };

  const Toggle = ({ on, set, label, hint, id }: { on: boolean; set: (v: boolean) => void; label: string; hint: string; id: string }) => (
    <button role="switch" aria-checked={on} onClick={() => set(!on)} className="chalk-line flex w-full items-center justify-between py-3 text-left" data-testid={`toggle-${id}`}>
      <span>
        <span className="block text-xl">{label}</span>
        <span className="block text-base text-[hsl(var(--chalk-ink)/.6)]">{hint}</span>
      </span>
      <span className={`font-pixel min-w-14 border-2 px-2 py-1 text-center text-sm ${on ? "border-[hsl(var(--lamp))] bg-[hsl(var(--lamp))] text-[hsl(var(--walnut))]" : "border-[hsl(var(--chalk-ink)/.6)]"}`}>{on ? "ON" : "OFF"}</span>
    </button>
  );

  return (
    <ChalkDrawer open={open} onClose={onClose} title="House Rules" desc="Preferences save to your session on the server." testId="drawer-settings">
      {!me ? (
        <p className="text-lg">Loading your preferences...</p>
      ) : (
        <div className="space-y-2">
          <Toggle id="reduced-motion" on={rm} set={setRm} label="Reduced motion" hint="Pets hold still, no hopping or steam." />
          <Toggle id="sound" on={snd} set={setSnd} label="Counter sounds" hint="Tiny chiptune blips on taps and order updates." />
          <fieldset className="pt-4">
            <legend className="font-pixel mb-2 text-lg text-[hsl(var(--lamp))]">Barista on shift</legend>
            <div className="grid grid-cols-3 gap-2">
              {pets.map((p) => {
                const unlocked = me.unlockedPets.includes(p.id);
                return (
                  <button key={p.id} disabled={!unlocked} aria-pressed={pet === p.id} onClick={() => setPet(p.id)}
                    className={`flex flex-col items-center border-2 p-2 ${pet === p.id ? "border-[hsl(var(--lamp))] bg-[hsl(var(--chalk-ink)/.08)]" : "border-[hsl(var(--chalk-ink)/.3)]"} disabled:cursor-not-allowed`}
                    data-testid={`button-select-pet-${p.id}`}>
                    <PetSprite kind={spriteKind(p)} px={56} locked={!unlocked} state="idle" />
                    <span className="mt-1 text-base leading-none">{p.name}</span>
                    {!unlocked && <span className="text-sm text-[hsl(var(--chalk-ink)/.55)]">{p.unlockAt} orders</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <button onClick={save} disabled={upd.isPending} className={`${chalkBtnHot} mt-6 w-full`} data-testid="button-save-settings">
            {upd.isPending ? "Saving..." : "Save preferences"}
          </button>
          {msg && <p role="status" className="pt-2 text-lg">{msg}</p>}
          {!me.signedIn && (
            <p className="pt-4 text-base text-[hsl(var(--chalk-ink)/.6)]">
              As a guest, these preferences and your progress live with this browser only. Sign in to keep them across devices.
            </p>
          )}
        </div>
      )}
    </ChalkDrawer>
  );
}

/* ================= ACCOUNT ================= */
export function AccountDrawer({ open, onClose, me }: { open: boolean; onClose: () => void; me?: Customer }) {
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();
  return (
    <ChalkDrawer open={open} onClose={onClose} title={isSignedIn ? "Regular's Card" : "Sign in"} desc={isSignedIn ? "Your loyalty card at the counter." : "Keep your pets and stamps on any device."} testId="drawer-account">
      {isSignedIn ? (
        <div className="space-y-4 text-xl">
          <p data-testid="text-account-name">{me?.name || user?.firstName || "Regular"}</p>
          <p className="text-[hsl(var(--chalk-ink)/.7)]">{user?.primaryEmailAddress?.emailAddress}</p>
          <p>Completed orders: <span className="text-[hsl(var(--lamp))]" data-testid="text-account-orders">{me?.completedOrders ?? 0}</span></p>
          <p>Role: {me?.role ?? "customer"}</p>
          <button className={chalkBtn} onClick={() => signOut({ redirectUrl: basePath || "/" })} data-testid="button-sign-out">Sign out</button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-lg leading-snug text-[hsl(var(--chalk-ink)/.8)]">
            Guest progress is tied to this browser. There's no email claim for guest orders, so stamps earned before signing in stay here.
          </p>
          <div className="-mx-2">
            <SignIn routing="hash" signUpUrl={`${basePath}/sign-up`} />
          </div>
        </div>
      )}
    </ChalkDrawer>
  );
}

/* ================= STAFF QUEUE ================= */
const NEXT: Record<string, ("preparing" | "ready" | "collected")[]> = {
  accepted: ["preparing"],
  preparing: ["ready"],
  ready: ["collected"],
};
export function StaffDrawer({ open, onClose, enabled }: { open: boolean; onClose: () => void; enabled: boolean }) {
  const qc = useQueryClient();
  const q = useGetStaffOrders({ query: { enabled, queryKey: getGetStaffOrdersQueryKey() } });
  const upd = useUpdateOrderStatus();
  const [err, setErr] = useState("");
  const set = (id: string, status: "preparing" | "ready" | "collected" | "cancelled") => {
    setErr("");
    upd.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetStaffOrdersQueryKey() });
          qc.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
        },
        onError: (e) => setErr(apiError(e)),
      },
    );
  };
  const active = (q.data ?? []).filter((o) => o.status !== "collected" && o.status !== "cancelled");
  return (
    <ChalkDrawer open={open} onClose={onClose} title="The Rail" desc="Live ticket queue, staff only." testId="drawer-staff">
      {q.isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse bg-[hsl(var(--chalk-ink)/.08)]" />)}</div>
      ) : q.isError ? (
        <div><p className="text-lg">{apiError(q.error)}</p><button className={`${chalkBtn} mt-3`} onClick={() => q.refetch()}><RotateCw size={14} className="mr-1 inline" />Retry</button></div>
      ) : active.length === 0 ? (
        <p className="py-10 text-center text-xl text-[hsl(var(--chalk-ink)/.7)]">Rail is clear. Wipe the steam wand.</p>
      ) : (
        <ul className="space-y-4">
          {active.map((o) => (
            <li key={o.id} className="border-2 border-[hsl(var(--chalk-ink)/.3)] p-3" data-testid={`row-staff-order-${o.id}`}>
              <div className="flex justify-between font-pixel text-lg">
                <span className="text-[hsl(var(--lamp))]">#{o.number} {o.customerName}</span>
                <span>{o.status}</span>
              </div>
              {o.practice && <p className="text-base text-[hsl(var(--lamp)/.8)]">PRACTICE - do not make</p>}
              <ul className="text-lg">
                {o.lines.map((l, i) => <li key={i}>{l.quantity}x {l.name} <span className="text-[hsl(var(--chalk-ink)/.6)]">{l.temperature}{l.milk !== "none" ? `, ${l.milk}` : ""}</span></li>)}
              </ul>
              {o.notes && <p className="text-base italic text-[hsl(var(--chalk-ink)/.7)]">"{o.notes}"</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {(NEXT[o.status] ?? []).map((s) => (
                  <button key={s} className={chalkBtnHot + " !py-1 !text-sm"} disabled={upd.isPending} onClick={() => set(o.id, s)} data-testid={`button-status-${s}-${o.id}`}>Mark {s}</button>
                ))}
                <button className={chalkBtn + " !py-1"} disabled={upd.isPending} onClick={() => set(o.id, "cancelled")} data-testid={`button-cancel-${o.id}`}>Cancel</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {err && <p role="alert" className="pt-3 text-lg text-[hsl(4_80%_72%)]">{err}</p>}
    </ChalkDrawer>
  );
}

/* ================= ADMIN MENU ================= */
function AdminRow({ item }: { item: MenuItem }) {
  const qc = useQueryClient();
  const upd = useUpdateMenuItem();
  const [name, setName] = useState(item.name);
  const [desc, setDesc] = useState(item.description);
  const [price, setPrice] = useState((item.priceCents / 100).toFixed(2));
  const [avail, setAvail] = useState(item.available);
  const [msg, setMsg] = useState("");
  const cents = Math.round(Number(price) * 100);
  const ok = name.trim().length > 0 && cents >= 50 && cents <= 10000;
  const save = () => {
    setMsg("");
    upd.mutate(
      { id: item.id, data: { name: name.trim(), description: desc, priceCents: cents, available: avail } },
      { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetMenuQueryKey() }); setMsg("Saved"); }, onError: (e) => setMsg(apiError(e)) },
    );
  };
  return (
    <li className="space-y-2 border-2 border-[hsl(var(--chalk-ink)/.3)] p-3" data-testid={`row-admin-item-${item.id}`}>
      <input className="chalk-input" aria-label="Name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} data-testid={`input-admin-name-${item.id}`} />
      <textarea className="chalk-input resize-none !text-lg" aria-label="Description" rows={2} maxLength={250} value={desc} onChange={(e) => setDesc(e.target.value)} data-testid={`input-admin-desc-${item.id}`} />
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1 text-lg">$<input className="chalk-input !w-20" inputMode="decimal" aria-label="Price in USD" value={price} onChange={(e) => setPrice(e.target.value)} data-testid={`input-admin-price-${item.id}`} /></label>
        <button role="switch" aria-checked={avail} onClick={() => setAvail(!avail)} className={chalkBtn + " !py-1"} data-testid={`toggle-admin-available-${item.id}`}>{avail ? "Available" : "86'd"}</button>
        <button onClick={save} disabled={!ok || upd.isPending} className={chalkBtnHot + " ml-auto !py-1 !text-sm"} data-testid={`button-admin-save-${item.id}`}>{upd.isPending ? "..." : "Save"}</button>
      </div>
      {!ok && <p className="text-base text-[hsl(4_80%_72%)]">Price must be $0.50 to $100.00 and name filled.</p>}
      {msg && <p role="status" className="text-base">{msg}</p>}
    </li>
  );
}
export function AdminDrawer({ open, onClose, menu }: { open: boolean; onClose: () => void; menu: MenuItem[] }) {
  return (
    <ChalkDrawer open={open} onClose={onClose} title="Board Edits" desc="Admin only. Changes show on the wall right away." testId="drawer-admin">
      <ul className="space-y-4">{menu.map((m) => <AdminRow key={`${m.id}-${m.priceCents}-${m.available}-${m.name}`} item={m} />)}</ul>
    </ChalkDrawer>
  );
}
