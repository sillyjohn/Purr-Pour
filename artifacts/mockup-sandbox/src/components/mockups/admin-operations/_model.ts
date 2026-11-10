export type OrderStatus = "placed" | "inprogress" | "complete" | "cancelled";
export type MenuCategory = "coffee" | "tea" | "treats";
export type DateRange = "today" | "7days" | "all" | "custom";

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  category: MenuCategory;
  available: boolean;
  archived: boolean;
};

export type OrderLine = {
  menuItemId: string;
  name: string;
  category: MenuCategory;
  priceCents: number;
  quantity: number;
  temperature: "hot" | "iced";
  milk: "whole" | "oat" | "almond" | "none";
  notes: string;
};

export type OrderHistoryEvent = {
  status: OrderStatus;
  at: string;
};

export type CafeOrder = {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  status: OrderStatus;
  practice: boolean;
  paid: boolean;
  notes: string;
  lines: OrderLine[];
  createdAt: string;
  updatedAt: string;
  history: OrderHistoryEvent[];
};

export type CafeState = {
  menu: MenuItem[];
  orders: CafeOrder[];
  queueOrderIds: string[];
  nextOrderNumber: number;
  nextClockMinute: number;
  events: { id: string; text: string; at: string }[];
};

export type NewOrderLine = {
  menuItemId: string;
  quantity: number;
  temperature: "hot" | "iced";
  milk: "whole" | "oat" | "almond" | "none";
  notes: string;
};

export type CafeAction =
  | { type: "set-status"; orderId: string; status: OrderStatus }
  | { type: "customer-cancel"; orderId: string; customerId: string; expectedStatus: OrderStatus }
  | { type: "move-queue"; orderId: string; direction: -1 | 1 }
  | { type: "place-order"; customerId: string; customerName: string; lines: NewOrderLine[]; notes: string }
  | { type: "save-menu-item"; item: MenuItem }
  | { type: "toggle-menu-availability"; itemId: string }
  | { type: "archive-menu-item"; itemId: string }
  | { type: "reset" };

export const DEMO_CLOCK = "2026-11-10T20:00:00.000Z";
export const DEMO_CUSTOMER_ID = "customer-mira";

const menuSeed: MenuItem[] = [
  { id: "cloud-latte", name: "Cloud Nine Latte", description: "Silky steamed milk meets our cozy house espresso.", priceCents: 500, category: "coffee", available: true, archived: false },
  { id: "maple-oat-cortado", name: "Maple Oat Cortado", description: "A little maple, a double shot, and oat milk.", priceCents: 475, category: "coffee", available: true, archived: false },
  { id: "midnight-mocha", name: "Midnight Mocha", description: "Dark cocoa, espresso, and a soft cap of cream.", priceCents: 575, category: "coffee", available: true, archived: false },
  { id: "iced-honey-matcha", name: "Iced Honey Matcha", description: "Stone-ground matcha, honey, and cold milk.", priceCents: 550, category: "tea", available: true, archived: false },
  { id: "porchlight-chai", name: "Porchlight Chai", description: "Black tea steeped with our warm spice blend.", priceCents: 450, category: "tea", available: true, archived: false },
  { id: "lemon-sugar-cookie", name: "Lemon Sugar Cookie", description: "A bright, buttery cookie from the morning bake.", priceCents: 325, category: "treats", available: true, archived: false },
  { id: "pixel-brownie", name: "Pixel Brownie", description: "Fudgy middle, crisp edges, sea salt on top.", priceCents: 400, category: "treats", available: false, archived: false },
  { id: "old-fashioned-drip", name: "Old-Fashioned Drip", description: "Our daily rotating single-origin pot.", priceCents: 325, category: "coffee", available: false, archived: true },
];

const line = (menuItemId: string, quantity: number, temperature: OrderLine["temperature"] = "hot", milk: OrderLine["milk"] = "whole", notes = ""): OrderLine => {
  const item = menuSeed.find((entry) => entry.id === menuItemId);
  if (!item) throw new Error(`Unknown sample menu item: ${menuItemId}`);
  return { menuItemId, name: item.name, category: item.category, priceCents: item.priceCents, quantity, temperature, milk, notes };
};

function order(
  id: string, number: string, day: string, hour: string, customerId: string, customerName: string,
  status: OrderStatus, lines: OrderLine[], options: { practice?: boolean; paid?: boolean; notes?: string; updatedAt?: string } = {},
): CafeOrder {
  const createdAt = `${day}T${hour}:00.000Z`;
  const updatedAt = options.updatedAt ?? createdAt;
  return {
    id, number, customerId, customerName, status, practice: options.practice ?? false, paid: options.paid ?? true,
    notes: options.notes ?? "", lines, createdAt, updatedAt,
    history: [{ status: "placed", at: createdAt }, ...(status !== "placed" ? [{ status, at: updatedAt }] : [])],
  };
}

export function createInitialState(): CafeState {
  const orders: CafeOrder[] = [
    order("ord-108", "0108", "2026-11-10", "19:43", DEMO_CUSTOMER_ID, "Mira", "placed", [line("cloud-latte", 1, "iced", "oat"), line("lemon-sugar-cookie", 1)], { notes: "Name on cup: Mira" }),
    order("ord-107", "0107", "2026-11-10", "19:36", "customer-eli", "Eli", "inprogress", [line("midnight-mocha", 1), line("pixel-brownie", 1)], { paid: false, notes: "No sleeve, please" }),
    order("ord-106", "0106", "2026-11-10", "19:22", "customer-jo", "Jo", "complete", [line("maple-oat-cortado", 2, "hot", "oat")], { updatedAt: "2026-11-10T19:34:00.000Z" }),
    order("ord-105", "0105", "2026-11-10", "18:58", "customer-sam", "Sam", "cancelled", [line("porchlight-chai", 1)], { paid: false, updatedAt: "2026-11-10T19:02:00.000Z" }),
    order("ord-104", "0104", "2026-11-10", "18:14", "customer-pip", "Pip", "complete", [line("cloud-latte", 1), line("iced-honey-matcha", 1, "iced", "almond")], { practice: true, paid: false, updatedAt: "2026-11-10T18:30:00.000Z" }),
    order("ord-103", "0103", "2026-11-09", "21:15", "customer-lee", "Lee", "complete", [line("lemon-sugar-cookie", 2), line("porchlight-chai", 1)], { updatedAt: "2026-11-09T21:29:00.000Z" }),
    order("ord-102", "0102", "2026-11-07", "17:42", "customer-nia", "Nia", "complete", [line("midnight-mocha", 1), line("cloud-latte", 1, "iced", "whole")], { updatedAt: "2026-11-07T17:55:00.000Z" }),
    order("ord-101", "0101", "2026-11-05", "16:20", "customer-kai", "Kai", "complete", [line("maple-oat-cortado", 1), line("lemon-sugar-cookie", 1)], { updatedAt: "2026-11-05T16:34:00.000Z" }),
    order("ord-100", "0100", "2026-11-03", "20:07", "customer-ivy", "Ivy", "complete", [line("porchlight-chai", 2), line("midnight-mocha", 1)], { updatedAt: "2026-11-03T20:21:00.000Z" }),
    order("ord-099", "0099", "2026-10-29", "18:52", "customer-max", "Max", "complete", [line("cloud-latte", 1)], { updatedAt: "2026-10-29T19:06:00.000Z" }),
    order("ord-098", "0098", "2026-10-24", "17:31", "customer-rue", "Rue", "complete", [line("iced-honey-matcha", 2, "iced", "oat")], { updatedAt: "2026-10-24T17:46:00.000Z" }),
    order("ord-097", "0097", "2026-10-15", "15:08", "customer-bo", "Bo", "complete", [line("pixel-brownie", 1), line("maple-oat-cortado", 1)], { practice: true, paid: false, updatedAt: "2026-10-15T15:17:00.000Z" }),
    order("ord-096", "0096", "2026-09-22", "21:11", "customer-wren", "Wren", "complete", [line("porchlight-chai", 1), line("cloud-latte", 1)], { updatedAt: "2026-09-22T21:25:00.000Z" }),
  ];
  return {
    menu: menuSeed.map((item) => ({ ...item })),
    orders,
    queueOrderIds: orders.filter((entry) => entry.status === "placed" || entry.status === "inprogress").sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((entry) => entry.id),
    nextOrderNumber: 109,
    nextClockMinute: 0,
    events: [
      { id: "evt-1", at: "2026-11-10T19:43:00.000Z", text: "Mira placed #0108 · Cloud Nine Latte" },
      { id: "evt-2", at: "2026-11-10T19:36:00.000Z", text: "Eli's #0107 is on the bar" },
      { id: "evt-3", at: "2026-11-10T19:34:00.000Z", text: "Jo's #0106 is ready for pickup" },
    ],
  };
}

export function resetDemo(): CafeState {
  return createInitialState();
}

export function validateMenuItem(item: MenuItem): string[] {
  const errors: string[] = [];
  if (!item.id.trim()) errors.push("Menu item ID is required.");
  const name = item.name.trim();
  if (!name || name.length > 80) errors.push("Name must be 1–80 characters.");
  if (item.description.length > 250) errors.push("Description must be 250 characters or fewer.");
  if (!Number.isInteger(item.priceCents) || item.priceCents < 50 || item.priceCents > 10000) errors.push("Price must be a whole number of cents from $0.50 to $100.00.");
  if (!["coffee", "tea", "treats"].includes(item.category)) errors.push("Choose coffee, tea, or treats.");
  return errors;
}

export function parsePriceToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(trimmed)) return null;
  const cents = Math.round(Number(trimmed) * 100);
  return Number.isFinite(cents) ? cents : null;
}

function stampFor(state: CafeState): string {
  return new Date(Date.parse(DEMO_CLOCK) + state.nextClockMinute * 60000).toISOString();
}

function appendEvent(events: CafeState["events"], id: string, text: string, at: string) {
  return [{ id, text, at }, ...events].slice(0, 30);
}

function updateStatus(state: CafeState, target: CafeOrder, status: OrderStatus, at: string): CafeState {
  const wasActive = target.status === "placed" || target.status === "inprogress";
  const isActive = status === "placed" || status === "inprogress";
  const queue = state.queueOrderIds.filter((id) => id !== target.id);
  if (isActive) queue.push(target.id);
  const changed: CafeOrder = { ...target, status, updatedAt: at, history: [...target.history, { status, at }] };
  return {
    ...state,
    orders: state.orders.map((entry) => entry.id === target.id ? changed : entry),
    queueOrderIds: wasActive && isActive && state.queueOrderIds.includes(target.id)
      ? state.queueOrderIds.map((id) => id)
      : queue,
    nextClockMinute: state.nextClockMinute + 1,
    events: appendEvent(state.events, `evt-${at}`, `#${target.number} ${status === "complete" ? "ready for pickup" : `marked ${status}`}`, at),
  };
}

export function cafeReducer(state: CafeState, action: CafeAction): CafeState {
  if (action.type === "reset") return resetDemo();
  if (action.type === "save-menu-item") {
    const errors = validateMenuItem(action.item);
    if (errors.length) throw new Error(errors.join(" "));
    const exists = state.menu.some((item) => item.id === action.item.id);
    const menu = exists
      ? state.menu.map((item) => item.id === action.item.id ? { ...action.item, name: action.item.name.trim() } : item)
      : [...state.menu, { ...action.item, name: action.item.name.trim() }];
    return { ...state, menu };
  }
  if (action.type === "toggle-menu-availability") {
    const item = state.menu.find((entry) => entry.id === action.itemId);
    if (!item || item.archived) throw new Error("That menu item is missing or archived.");
    return { ...state, menu: state.menu.map((entry) => entry.id === item.id ? { ...entry, available: !entry.available } : entry) };
  }
  if (action.type === "archive-menu-item") {
    const item = state.menu.find((entry) => entry.id === action.itemId);
    if (!item) throw new Error("That menu item does not exist.");
    return { ...state, menu: state.menu.map((entry) => entry.id === item.id ? { ...entry, archived: true, available: false } : entry) };
  }
  if (action.type === "move-queue") {
    const index = state.queueOrderIds.indexOf(action.orderId);
    if (index < 0) throw new Error("Only active orders can move in the queue.");
    const nextIndex = index + action.direction;
    if (nextIndex < 0 || nextIndex >= state.queueOrderIds.length) return state;
    const queueOrderIds = [...state.queueOrderIds];
    [queueOrderIds[index], queueOrderIds[nextIndex]] = [queueOrderIds[nextIndex], queueOrderIds[index]];
    return { ...state, queueOrderIds };
  }
  if (action.type === "set-status" || action.type === "customer-cancel") {
    const target = state.orders.find((entry) => entry.id === action.orderId);
    if (!target) throw new Error("Order not found.");
    let status: OrderStatus;
    if (action.type === "customer-cancel") {
      if (target.customerId !== action.customerId) throw new Error("You can only cancel your own order.");
      if (target.status !== action.expectedStatus || target.status !== "placed") throw new Error("This order has changed and can no longer be cancelled.");
      status = "cancelled";
    } else {
      status = action.status;
      if (!["placed", "inprogress", "complete", "cancelled"].includes(status)) throw new Error("Unknown order status.");
    }
    if (target.status === status) return state;
    return updateStatus(state, target, status, stampFor(state));
  }
  if (action.type === "place-order") {
    if (!action.lines.length) throw new Error("Add at least one item before placing an order.");
    const lines = action.lines.map((requested) => {
      const item = state.menu.find((entry) => entry.id === requested.menuItemId);
      if (!item || item.archived || !item.available) throw new Error("A selected item is no longer available. Review the menu.");
      if (!Number.isInteger(requested.quantity) || requested.quantity < 1 || requested.quantity > 20) throw new Error("Quantity must be between 1 and 20.");
      return { menuItemId: item.id, name: item.name, category: item.category, priceCents: item.priceCents, quantity: requested.quantity, temperature: requested.temperature, milk: requested.milk, notes: requested.notes.trim() };
    });
    const at = stampFor(state);
    const number = String(state.nextOrderNumber).padStart(4, "0");
    const id = `ord-${number}`;
    const created: CafeOrder = {
      id, number, customerId: action.customerId, customerName: action.customerName.trim() || "Neighbor", status: "placed",
      practice: true, paid: false, notes: action.notes.trim(), lines, createdAt: at, updatedAt: at, history: [{ status: "placed", at }],
    };
    const summary = lines.map((entry) => `${entry.quantity}× ${entry.name}`).join(", ");
    return {
      ...state, orders: [created, ...state.orders], queueOrderIds: [...state.queueOrderIds, id],
      nextOrderNumber: state.nextOrderNumber + 1, nextClockMinute: state.nextClockMinute + 1,
      events: appendEvent(state.events, `evt-${id}`, `${created.customerName} placed #${number} · ${summary}`, at),
    };
  }
  const exhaustive: never = action;
  throw new Error(`Unsupported action: ${String(exhaustive)}`);
}

export function orderTotalCents(order: CafeOrder): number {
  return order.lines.reduce((sum, entry) => sum + entry.priceCents * entry.quantity, 0);
}

export function isActualSale(order: CafeOrder): boolean {
  return order.paid && !order.practice && order.status !== "cancelled";
}

export function laDateKey(timestamp: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export type AnalyticsOptions = { range: DateRange; startDate?: string; endDate?: string };
export type AnalyticsResult = {
  orderCount: number;
  orderVolume: number;
  units: number;
  salesCents: number;
  rankings: { id: string; name: string; category: MenuCategory; units: number; salesCents: number }[];
  categoryTotals: { category: MenuCategory; units: number; salesCents: number }[];
  byHour: { hour: string; orders: number }[];
  byDay: { day: string; orders: number }[];
  orderTimes: { orderId: string; number: string; placedAt: string; updatedAt: string; durationMinutes: number; status: OrderStatus }[];
  excludedCount: number;
};

export function deriveAnalytics(state: CafeState, options: AnalyticsOptions): AnalyticsResult {
  const today = laDateKey(DEMO_CLOCK);
  const allSales = state.orders.filter(isActualSale);
  const start = options.range === "today" ? today
    : options.range === "7days" ? shiftDate(today, -6)
      : options.range === "custom" ? options.startDate ?? today : "0000-01-01";
  const end = options.range === "custom" ? options.endDate ?? today : today;
  if (options.range === "custom" && (!validDate(start) || !validDate(end))) throw new Error("Choose a valid start and end date.");
  if (start > end) throw new Error("Start date must be on or before end date.");
  const within = (timestamp: string) => {
    const key = laDateKey(timestamp);
    return key >= start && key <= end;
  };
  const eligible = allSales.filter((entry) => within(entry.createdAt));
  const traffic = state.orders.filter((entry) => !entry.practice && within(entry.createdAt));
  const excludedCount = state.orders.filter((entry) => within(entry.createdAt) && !isActualSale(entry)).length;
  const stats = new Map(state.menu.map((item) => [item.id, { id: item.id, name: item.name, category: item.category, units: 0, salesCents: 0 }]));
  const categories = new Map<MenuCategory, { category: MenuCategory; units: number; salesCents: number }>([
    ["coffee", { category: "coffee", units: 0, salesCents: 0 }],
    ["tea", { category: "tea", units: 0, salesCents: 0 }],
    ["treats", { category: "treats", units: 0, salesCents: 0 }],
  ]);
  for (const order of eligible) for (const entry of order.lines) {
    const existing = stats.get(entry.menuItemId) ?? { id: entry.menuItemId, name: entry.name, category: entry.category, units: 0, salesCents: 0 };
    existing.units += entry.quantity;
    existing.salesCents += entry.quantity * entry.priceCents;
    stats.set(entry.menuItemId, existing);
    const category = categories.get(entry.category)!;
    category.units += entry.quantity;
    category.salesCents += entry.quantity * entry.priceCents;
  }
  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour: `${String(hour).padStart(2, "0")}:00`, orders: 0 }));
  const dayCounts = new Map<string, number>();
  for (const entry of traffic) {
    const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", hourCycle: "h23" }).format(new Date(entry.createdAt)));
    byHour[hour].orders += 1;
    const day = laDateKey(entry.createdAt);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }
  const dateKeys = Array.from(dayCounts.keys()).sort();
  return {
    orderCount: eligible.length,
    orderVolume: traffic.length,
    units: eligible.reduce((sum, entry) => sum + entry.lines.reduce((lineSum, item) => lineSum + item.quantity, 0), 0),
    salesCents: eligible.reduce((sum, entry) => sum + orderTotalCents(entry), 0),
    rankings: [...stats.values()].sort((a, b) => b.units - a.units || a.name.localeCompare(b.name)),
    categoryTotals: [...categories.values()],
    byHour,
    byDay: dateKeys.map((day) => ({ day, orders: dayCounts.get(day)! })),
    orderTimes: traffic.map((entry) => ({
      orderId: entry.id, number: entry.number, placedAt: entry.createdAt, updatedAt: entry.updatedAt,
      durationMinutes: Math.max(0, Math.round((Date.parse(entry.updatedAt) - Date.parse(entry.createdAt)) / 60000)), status: entry.status,
    })),
    excludedCount,
  };
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T12:00:00Z`))
    && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

function shiftDate(date: string, offset: number): string {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function formatLA(timestamp: string, withDate = true): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", ...(withDate ? { month: "short", day: "numeric" } : {}),
    hour: "numeric", minute: "2-digit",
  }).format(new Date(timestamp));
}
