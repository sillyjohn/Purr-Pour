import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialState, cafeReducer, deriveAnalytics, DEMO_CUSTOMER_ID,
  orderTotalCents, parsePriceToCents, validateMenuItem, laDateKey,
} from "../src/components/admin-preview/demo-model.ts";

const statuses = ["placed", "inprogress", "complete", "cancelled"];
const setStatus = (state, id, status) => cafeReducer(state, {type: "set-status", orderId: id, status});
function assertQueue(state) {
  const active = state.orders.filter(order => ["placed", "inprogress"].includes(order.status)).map(order => order.id).sort();
  assert.deepEqual([...state.queueOrderIds].sort(), active);
  assert.equal(new Set(state.queueOrderIds).size, state.queueOrderIds.length);
}

test("queue starts FIFO and priority buttons swap only active tickets", () => {
  const initial = createInitialState();
  assert.deepEqual(initial.queueOrderIds, ["ord-107", "ord-108"]);
  const moved = cafeReducer(initial, {type: "move-queue", orderId: "ord-108", direction: -1});
  assert.deepEqual(moved.queueOrderIds, ["ord-108", "ord-107"]);
  assert.deepEqual(initial.queueOrderIds, ["ord-107", "ord-108"]);
  assert.equal(cafeReducer(moved, {type: "move-queue", orderId: "ord-108", direction: -1}), moved);
  assert.throws(() => cafeReducer(initial, {type: "move-queue", orderId: "ord-106", direction: -1}), /active orders/);
  assertQueue(moved);
});

for (const before of statuses) for (const after of statuses) {
  test(`admin can change ${before} to ${after}; queue stays consistent`, () => {
    const initial = setStatus(createInitialState(), "ord-108", before);
    const next = setStatus(initial, "ord-108", after);
    assert.equal(next.orders.find(order => order.id === "ord-108").status, after);
    assertQueue(next);
    if (before === after) assert.equal(next, initial, "same-status writes must not append history or events");
    else assert.equal(next.orders.find(order => order.id === "ord-108").history.length, initial.orders.find(order => order.id === "ord-108").history.length + 1);
  });
}

test("completion removes a ticket; reopening puts it at the tail without deleting history", () => {
  const initial = createInitialState();
  const complete = setStatus(initial, "ord-107", "complete");
  assert.deepEqual(complete.queueOrderIds, ["ord-108"]);
  const reopen = setStatus(complete, "ord-107", "placed");
  assert.deepEqual(reopen.queueOrderIds, ["ord-108", "ord-107"]);
  assert.equal(reopen.orders.length, initial.orders.length);
  assert.deepEqual(reopen.orders.find(order => order.id === "ord-107").history.slice(-2).map(event => event.status), ["complete", "placed"]);
});

test("customer can cancel their own placed ticket and gets a simulated event", () => {
  const initial = createInitialState();
  const next = cafeReducer(initial, {type: "customer-cancel", orderId: "ord-108", customerId: DEMO_CUSTOMER_ID, expectedStatus: "placed"});
  assert.equal(next.orders.find(order => order.id === "ord-108").status, "cancelled");
  assert.equal(initial.orders.find(order => order.id === "ord-108").status, "placed");
  assert.equal(next.events.length, initial.events.length + 1);
  assertQueue(next);
});

test("customer cannot cancel another person's order", () => {
  assert.throws(() => cafeReducer(createInitialState(), {type: "customer-cancel", orderId: "ord-108", customerId: "someone-else", expectedStatus: "placed"}), /own order/);
});

for (const status of ["inprogress", "complete", "cancelled"]) {
  test(`customer cannot cancel a ${status} ticket, including a stale placed cancellation`, () => {
    const current = setStatus(createInitialState(), "ord-108", status);
    assert.throws(() => cafeReducer(current, {type: "customer-cancel", orderId: "ord-108", customerId: DEMO_CUSTOMER_ID, expectedStatus: "placed"}), /no longer be cancelled/);
    assert.throws(() => cafeReducer(current, {type: "customer-cancel", orderId: "ord-108", customerId: DEMO_CUSTOMER_ID, expectedStatus: status}), /no longer be cancelled/);
  });
}

test("new sample order is unpaid practice, snapshots items, joins queue and stays out of sales", () => {
  const initial = createInitialState();
  const next = cafeReducer(initial, {
    type: "place-order", customerId: DEMO_CUSTOMER_ID, customerName: "Mira",
    notes: " Extra foam ", lines: [{menuItemId: "cloud-latte", quantity: 2, temperature: "iced", milk: "oat", notes: " No ice "}],
  });
  const order = next.orders[0];
  assert.equal(order.id, "ord-0109");
  assert.equal(order.status, "placed");
  assert.equal(order.customerId, DEMO_CUSTOMER_ID);
  assert.equal(order.practice, true);
  assert.equal(order.paid, false);
  assert.equal(orderTotalCents(order), 1000);
  assert.equal(order.notes, "Extra foam");
  assert.equal(order.lines[0].notes, "No ice");
  assert.equal(next.queueOrderIds.at(-1), order.id);
  assert.equal(laDateKey(order.createdAt), "2026-11-10");
  assert.equal(deriveAnalytics(next, {range: "today"}).salesCents, deriveAnalytics(initial, {range: "today"}).salesCents);
  assertQueue(next);
});

test("placement rejects empty carts, unavailable items and invalid quantities", () => {
  const state = createInitialState();
  const draft = {type: "place-order", customerId: DEMO_CUSTOMER_ID, customerName: "Mira", notes: "", lines: []};
  assert.throws(() => cafeReducer(state, draft), /at least one/);
  const sample = {menuItemId: "cloud-latte", quantity: 1, temperature: "hot", milk: "whole", notes: ""};
  for (const quantity of [0, -1, 1.5, 21, NaN]) assert.throws(() => cafeReducer(state, {...draft, lines: [{...sample, quantity}]}), /Quantity/);
  for (const menuItemId of ["old-fashioned-drip", "pixel-brownie", "unknown"]) assert.throws(() => cafeReducer(state, {...draft, lines: [{...sample, menuItemId}]}), /no longer available/);
});

test("menu supports create, edit, availability and archive while preserving order snapshots", () => {
  const initial = createInitialState();
  const originalLines = JSON.stringify(initial.orders.flatMap(order => order.lines));
  const item = {...initial.menu[0], id: "new-tea", name: " New Tea ", categoryKey: "tea", priceCents: 650};
  let next = cafeReducer(initial, {type: "save-menu-item", item});
  assert.equal(next.menu.find(entry => entry.id === item.id).name, "New Tea");
  next = cafeReducer(next, {type: "save-menu-item", item: {...next.menu.find(entry => entry.id === "new-tea"), name: "Renamed", categoryKey: "treats", priceCents: 900}});
  next = cafeReducer(next, {type: "toggle-menu-availability", itemId: "new-tea"});
  assert.equal(next.menu.find(entry => entry.id === "new-tea").available, false);
  next = cafeReducer(next, {type: "archive-menu-item", itemId: "cloud-latte"});
  assert.equal(next.menu.find(entry => entry.id === "cloud-latte").archived, true);
  assert.equal(next.menu.find(entry => entry.id === "cloud-latte").available, false);
  assert.equal(JSON.stringify(next.orders.flatMap(order => order.lines)), originalLines);
  assert.equal(deriveAnalytics(next, {range: "all"}).salesCents, 8775);
  assert.equal(deriveAnalytics(next, {range: "all"}).categoryTotals.find(entry => entry.categoryKey === "coffee").units, deriveAnalytics(initial, {range: "all"}).categoryTotals.find(entry => entry.categoryKey === "coffee").units);
});

test("price parsing rejects blank, nonnumeric, nonfinite and sub-cent entries", () => {
  for (const raw of ["", " ", "abc", "-2", "Infinity", "NaN", "1.001", "1e2", "2.2.3"]) assert.equal(parsePriceToCents(raw), null, raw);
  assert.equal(parsePriceToCents(" 4.75 "), 475);
  assert.equal(parsePriceToCents("0.50"), 50);
  assert.equal(parsePriceToCents("100.00"), 10000);
  const base = createInitialState().menu[0];
  for (const patch of [{name: " "}, {name: "x".repeat(81)}, {priceCents: 49}, {priceCents: 10001}, {priceCents: 500.5}, {priceCents: Infinity}, {categoryKey: "unknown"}, {description: "x".repeat(251)}]) {
    assert.ok(validateMenuItem({...base, ...patch}).length > 0);
    assert.throws(() => cafeReducer(createInitialState(), {type: "save-menu-item", item: {...base, ...patch}}));
  }
});

test("staff-created categories have stable keys and reject case-insensitive duplicates", () => {
  let state = cafeReducer(createInitialState(), {type: "create-menu-category", name: "  Bakery & Bakes  "});
  const bakery = state.categories.find(category => category.label === "Bakery & Bakes");
  assert.deepEqual(bakery, {key: "bakery-bakes", label: "Bakery & Bakes"});
  assert.throws(() => cafeReducer(state, {type: "create-menu-category", name: " bAKERY & BAKES "}), /already exists/);
  assert.throws(() => cafeReducer(state, {type: "create-menu-category", name: " coffee "}), /already exists/);
  assert.throws(() => cafeReducer(state, {type: "create-menu-category", name: ""}), /1–30/);
  assert.throws(() => cafeReducer(state, {type: "create-menu-category", name: "x".repeat(31)}), /1–30/);
  state = cafeReducer(state, {type: "create-menu-category", name: "Bakery Bakes"});
  assert.equal(state.categories.filter(category => category.key.startsWith("bakery-bakes")).length, 2);
  assert.notEqual(state.categories.at(-1).key, bakery.key);
});

test("reset restores the built-in category list and removes custom categories", () => {
  const state = cafeReducer(createInitialState(), {type: "create-menu-category", name: "Seasonal"});
  assert.ok(state.categories.some(category => category.key === "seasonal"));
  const reset = cafeReducer(state, {type: "reset"});
  assert.deepEqual(reset.categories.map(category => category.key), ["coffee", "tea", "treats"]);
  assert.ok(!reset.categories.some(category => category.key === "seasonal"));
});

test("order lines keep category snapshots across recategorization and analytics follows those keys", () => {
  let state = cafeReducer(createInitialState(), {type: "create-menu-category", name: "Bakery"});
  const bakery = state.categories.find(category => category.label === "Bakery");
  const bakedItem = {
    id: "cardamom-cookie", name: "Cardamom Cookie", description: "Warm spice and a crisp edge.",
    priceCents: 350, categoryKey: bakery.key, available: true, archived: false,
  };
  state = cafeReducer(state, {type: "save-menu-item", item: bakedItem});
  const orderInput = {customerId: DEMO_CUSTOMER_ID, customerName: "Mira", lines: [{menuItemId: bakedItem.id, quantity: 2, temperature: "hot", milk: "none", notes: ""}], notes: ""};
  state = cafeReducer(state, {type: "place-order", ...orderInput});
  const firstOrderId = state.orders[0].id;
  const originalSnapshot = state.orders[0].lines[0];
  assert.deepEqual([originalSnapshot.categoryKey, originalSnapshot.categoryName], ["bakery", "Bakery"]);

  state = cafeReducer(state, {type: "save-menu-item", item: {...bakedItem, categoryKey: "treats"}});
  assert.equal(state.menu.find(item => item.id === bakedItem.id).categoryKey, "treats");
  assert.deepEqual(state.orders.find(order => order.id === firstOrderId).lines[0], originalSnapshot);

  state = cafeReducer(state, {type: "place-order", ...orderInput});
  const secondOrderId = state.orders[0].id;
  assert.deepEqual([state.orders[0].lines[0].categoryKey, state.orders[0].lines[0].categoryName], ["treats", "Treats"]);
  const saleIds = new Set([firstOrderId, secondOrderId]);
  state = {...state, orders: state.orders.map(order => saleIds.has(order.id) ? {...order, practice: false, paid: true} : order)};
  const analytics = deriveAnalytics(state, {range: "all"});
  assert.equal(analytics.categoryTotals.find(entry => entry.categoryKey === "bakery").units, 2);
  assert.equal(analytics.categoryTotals.find(entry => entry.categoryKey === "bakery").salesCents, 700);
  assert.equal(analytics.categoryTotals.find(entry => entry.categoryKey === "treats").units, 6);
});

test("sales quantities, order volume and exclusions have known independent totals", () => {
  const state = createInitialState();
  const today = deriveAnalytics(state, {range: "today"});
  assert.equal(today.orderCount, 2);
  assert.equal(today.orderVolume, 4);
  assert.equal(today.units, 4);
  assert.equal(today.salesCents, 1775);
  assert.equal(today.excludedCount, 3);
  const week = deriveAnalytics(state, {range: "7days"});
  assert.equal(week.orderCount, 5);
  assert.equal(week.orderVolume, 7);
  assert.equal(week.units, 11);
  assert.equal(week.salesCents, 4750);
  const all = deriveAnalytics(state, {range: "all"});
  assert.equal(all.orderCount, 9);
  assert.equal(all.orderVolume, 11);
  assert.equal(all.units, 19);
  assert.equal(all.salesCents, 8775);
  assert.equal(all.excludedCount, 4);
  assert.equal(all.rankings.reduce((sum, entry) => sum + entry.units, 0), all.units);
  assert.equal(all.categoryTotals.reduce((sum, entry) => sum + entry.units, 0), all.units);
  assert.equal(all.byHour.reduce((sum, entry) => sum + entry.orders, 0), all.orderVolume);
  assert.equal(all.byDay.reduce((sum, entry) => sum + entry.orders, 0), all.orderVolume);
  assert.equal(all.orderTimes.length, all.orderVolume);
  assert.equal(all.rankings.find(entry => entry.id === "old-fashioned-drip").units, 0);
});

test("reopening does not count a purchase twice, cancelling removes its sale eligibility", () => {
  let state = createInitialState();
  const before = deriveAnalytics(state, {range: "all"});
  for (const status of ["complete", "placed", "inprogress", "complete"]) state = setStatus(state, "ord-108", status);
  assert.equal(deriveAnalytics(state, {range: "all"}).salesCents, before.salesCents);
  state = setStatus(state, "ord-108", "cancelled");
  assert.equal(deriveAnalytics(state, {range: "all"}).salesCents, before.salesCents - 825);
  state = setStatus(state, "ord-108", "placed");
  assert.equal(deriveAnalytics(state, {range: "all"}).salesCents, before.salesCents);
});

test("Los Angeles dates include late local orders, not the UTC calendar day", () => {
  assert.equal(laDateKey("2026-11-11T07:30:00Z"), "2026-11-10");
  assert.equal(laDateKey("2026-11-10T07:30:00Z"), "2026-11-09");
  const state = createInitialState();
  state.orders.find(order => order.id === "ord-108").createdAt = "2026-11-11T07:30:00Z";
  assert.ok(deriveAnalytics(state, {range: "today"}).orderTimes.some(row => row.orderId === "ord-108"));
  state.orders.find(order => order.id === "ord-108").createdAt = "2026-11-10T07:30:00Z";
  assert.ok(!deriveAnalytics(state, {range: "today"}).orderTimes.some(row => row.orderId === "ord-108"));
});

test("both repeated DST hours count correctly on the same shop-local day", () => {
  const state = createInitialState();
  state.orders = state.orders.slice(0, 2).map((order, index) => ({...order, createdAt: index ? "2026-11-01T09:30:00Z" : "2026-11-01T08:30:00Z"}));
  const data = deriveAnalytics(state, {range: "custom", startDate: "2026-11-01", endDate: "2026-11-01"});
  assert.equal(data.orderVolume, 2);
  assert.equal(data.byHour.find(row => row.hour === "01:00").orders, 2);
});

test("invalid ranges fail explicitly and empty ranges keep zero-sale catalog rows", () => {
  const state = createInitialState();
  for (const [startDate, endDate] of [["2026-11-11", "2026-11-10"], ["", "2026-11-10"], ["2026-02-30", "2026-11-10"], ["bad", "bad"]]) {
    assert.throws(() => deriveAnalytics(state, {range: "custom", startDate, endDate}));
  }
  const empty = deriveAnalytics(state, {range: "custom", startDate: "2026-01-01", endDate: "2026-01-02"});
  assert.equal(empty.salesCents, 0);
  assert.equal(empty.orderVolume, 0);
  assert.equal(empty.rankings.length, state.menu.length);
  assert.ok(empty.rankings.every(entry => entry.units === 0));
});

test("reset restores initial sample state without mutating independent instances", () => {
  const initial = createInitialState();
  const changed = setStatus(initial, "ord-108", "cancelled");
  assert.deepEqual(cafeReducer(changed, {type: "reset"}), createInitialState());
  assert.equal(initial.orders.find(order => order.id === "ord-108").status, "placed");
  assert.throws(() => setStatus(initial, "missing", "complete"), /not found/);
  assert.throws(() => setStatus(initial, "ord-108", "bad-status"), /Unknown order status/);
});
