# Purr & Pour — admin operations backend design

**Status: proposed, not implemented.** This document accompanies the isolated admin frontend prototype. It does not change the live café, database, API contracts, authentication, payments, or existing order events.

## 1. Confirmed product rules

- Four statuses: `placed`, `inprogress`, `complete`, `cancelled`.
- **Complete means ready for pickup**, not picked up or paid.
- Customers may place orders and cancel only their own orders that are still placed.
- Admins may change an order to any of the four statuses, including reopening complete or cancelled orders. A same-status update is an idempotent no-op.
- Queue scheduling is manual priority ordering, not time slots. The active queue contains placed and in-progress orders only.
- Complete and cancelled orders remain in searchable history. Reopened orders join the queue at its end.
- Menu removal means archiving: hide it from ordering, but preserve order history and sales attribution.
- Guest contact information is for contact, never proof of order ownership.

### Decisions that must not be silently inferred

Complete does not authorize a charge, refund, or loyalty stamp. Existing loyalty is based on paid, collected orders; preserve old pickup facts when migrating. Until a separate pickup-confirmation policy is approved, do not award new loyalty just because an admin marks an order complete. A cancelled paid order is an operational cancellation, not a refund confirmation; show those facts separately.

The prototype uses America/Los_Angeles as a labeled demo timezone. Production must configure the actual shop timezone explicitly; a USA location alone is not enough to infer it.

## 2. Current implementation versus proposed changes

The existing Spring service already persists orders/menu in PostgreSQL, protects staff/admin routes, and writes order events to an outbox in the same transaction as order changes. A publisher forwards outbox events through RabbitMQ when configured, or explicitly uses a local practice-only transport when not configured.

The existing model has accepted → preparing → ready → collected, plus cancelled, with forward-only transitions. Staff listing excludes collected/cancelled and is limited to the latest 100 records. The existing menu editor only changes existing items. The customer stream refetches orders after reconnecting but has no version-based stale-event guard or retained replay log. No queue priority or sales reporting endpoints exist.

The frontend prototype uses deterministic local sample state and simulated notifications. **It does not create a new SSE service or make existing requests behave as the future contract.**

## 3. Service boundary and permissions

Retain the public Node authentication edge and the Java/Spring Boot domain service. The edge verifies the existing identity/session, overwrites internal identity headers, rejects cross-site mutations, and forwards to the private Java service. Do not expose Java's internal port or let a browser select its trusted identity or role.

| Action | Guest/customer | Staff | Admin |
| --- | --- | --- | --- |
| Browse current menu | Yes | Yes | Yes |
| Place order | Own identity | Own identity | Own identity |
| Read customer order | Own only | Own only through customer API | Own only through customer API |
| Cancel through customer API | Own placed order only | Same ownership rule | Same ownership rule |
| Read staff queue/order details | No | Yes | Yes |
| Forward operational status changes | No | Placed → in progress → complete | Any status |
| Override/reopen/cancel through admin API | No | No by default | Yes |
| Reorder queue | No | No by default | Yes |
| Add/edit/archive menu or read analytics | No | No | Yes |

Staff permissions above preserve a narrow operational role; broad status overrides and priority scheduling are the explicitly requested admin capabilities. Any broader staff powers should be a separate approved policy, not inherited from a client-side toggle.

Authorization belongs in Spring's service methods as well as route guards. Mutations must receive the authenticated principal, not trust an owner field in their bodies. For customer order lookups, return 404 for unknown and unowned IDs to avoid existence leaks. Role grants remain explicitly owner-authorized; never promote the first signup. Reject body attempts to set role, owner, prices, payment flags, or audit actor.

Guest identity remains a server-issued signed, HTTP-only, same-site cookie from the edge. Clearing it loses access to those guest orders; email matching must not silently claim them. Preserve the existing anti-CSRF/origin checks, validate any future cookie-authenticated mutation route, rate-limit sensitive changes, and revalidate/expire long-lived privileged streams when roles change.

## 4. Proposed persistence

Use explicit versioned database migrations rather than startup DDL. Keep the existing database.

### Orders and immutable lines

- Order: stable ID/number, server-owned owner ID, customer display/contact details, status constrained to the four values, integer total cents, payment status, practice flag, created/updated timestamps, and an incrementing `version`.
- Normalized immutable order lines: order/line ID, stable menu item ID when known, name/category snapshot, quantity, integer unit price cents, and milk/temperature/customization snapshot. Recalculate the total from authoritative menu prices when placing an order.
- History entries: order ID, before/after status, actor identity/role, reason for admin override/reopening, committed timestamp, resulting order version, and request/idempotency ID. History is append-only.
- Track first and latest preparation/ready timestamps, plus any existing pickup fact separately. Full history remains authoritative for multiple preparation cycles; never overwrite original placement time when reopening.
- Keep operational status separate from payment/refund state. Admin status updates never bypass payment authorization or manufacture a payment webhook.

### Queue

- One queue metadata row per shop: `queue_version`.
- Queue entries: order ID (unique foreign key) and integer rank. Require unique ranks within a queue, using a deferrable uniqueness constraint when resequencing.
- All queue membership/order operations use the same queue lock. New/reopened active orders append to the tail; completed/cancelled orders lose their queue entry in the same order transaction.
- Default initialization is FIFO by `(created_at, id)`, not newest first. Active membership is never derived from a capped page of orders.

### Menu and events

- Menu item: immutable ID, name, description, category, integer price cents, available flag, archived timestamp, version, created/updated timestamps. Maintain a catalog revision incremented by every catalog write.
- Archiving is not an order-line cascade deletion. Availability and archive are different: a sold-out item may return later; an archived item is hidden from the customer catalog.
- A transactional outbox records immutable event ID, event type, aggregate ID/version, audience, payload, created time, publish attempts/backoff, and delivery claim/lease.
- Keep audit/history separately from the delivery outbox. Deleting a successfully published outbox record must not erase operational audit history.
- Add indexes for owner/date, status/date, active queue rank, item/archive/category, history by order/version, and report date/item/category access.

### Migrating existing five-state orders

| Old state | New state | Preservation |
| --- | --- | --- |
| accepted | placed | Keep original placement timestamp |
| preparing | inprogress | Keep history; mark unavailable old preparation time unknown |
| ready | complete | Ready for pickup; not collected |
| collected | complete | Preserve `legacy_collected` and existing pickup/loyalty eligibility |
| cancelled | cancelled | Preserve cancellation history |

Old order lines currently lack item IDs/category snapshots. Backfill only when attribution is unambiguous; otherwise mark the item/category as legacy unknown rather than guess by a renamed item. Do not fabricate pickup timestamps from an unrelated update time. Preserve historical loyalty eligibility for paid legacy-collected orders without treating all migrated ready orders as collected.

Roll out schema expansion first, pause writes briefly during status/queue cutover, deploy regenerated clients and four-state server contracts together, then retire the legacy constraint/fields only after verification. Take a recoverable backup and test migration/rollback on a copy. Existing practice auto-advance must be disabled for staff-controlled queues or explicitly isolated to a demo lane.

## 5. Proposed API surface

All paths below are under the artifact-aware `/api` prefix and are **proposals**, not routes implemented by this task. Maintain the contract in OpenAPI and regenerate hooks/schemas when implementing.

| Method / path | Purpose and permission |
| --- | --- |
| GET /menu | Public active catalog, with catalog revision; exclude archived items |
| POST /orders | Place own order with owner-scoped request ID; server-priced lines |
| GET /orders | Paginated own orders, status/date filters |
| GET /orders/{id} | Own order detail and customer-safe status timeline |
| POST /orders/{id}/cancel | Cancel own placed order with expected version/request ID |
| GET /staff/orders | Paginated active/history/all orders with search/status/date filters |
| GET /staff/orders/{id} | Operational details and audit timeline |
| PATCH /staff/orders/{id}/status | Narrow staff forward transition, expected version |
| PATCH /admin/orders/{id}/status | Any four-state transition, expected version/request ID/reason |
| GET /staff/queue | Complete active ordered queue or consistent paginated snapshot, queue revision |
| PUT /admin/queue | Atomic full-list reorder with expected queue revision |
| POST /admin/menu | Create valid item with request ID |
| PATCH /admin/menu/{id} | Edit allowed fields with expected item version |
| DELETE /admin/menu/{id} | Idempotent archive with expected version; not hard deletion |
| GET /admin/analytics | Date-filtered sales/item/category/time aggregations |
| GET /events | Authenticated, audience-filtered SSE with reconnect resynchronization |

Use bounded cursor pagination with a stable tie-breaker, for example `(created_at, id)`. Never silently cap history at 100 and present it as complete. Queue reorder is limited to a consistent full queue snapshot: if the queue grows beyond a practical full-list limit, offer version-checked move-before/after operations rather than submitting a truncated list.

Representative inputs:

```json
{"status":"complete","expectedVersion":8,"requestId":"client-generated-id","reason":"Drinks ready"}
```

```json
{"expectedQueueVersion":21,"orderIds":["order-b","order-a","order-c"],"requestId":"queue-change-id"}
```

Canonical mutation responses include current entity/version, queue revision when affected, and server timestamps. Return 400 for invalid inputs, 401 for missing required login, 403 for role failures, 404 for absent/unowned orders, 409 for stale versions or no-longer-placed cancellation, 429 for throttling, and 503 for unavailable required infrastructure. Include machine-readable error codes and safe messages.

Validate price as an integer number of cents between 50 and 10,000; reject fractional cents, nonfinite numbers, blank names, overlong strings, unknown categories/statuses, and duplicate item IDs. Menu creation and edits must share validation. Contact information should have bounded format validation but not become an identity key.

## 6. Race-safe writes and queue ordering

Use one documented lock order for every order creation/status/cancellation/reorder path: **queue metadata first, then affected order rows in sorted ID order**. This prevents deadlocks between a reorder and a status transition; do not lock an order first in one path and the queue first in another.

Within one transaction:

1. Resolve the trusted principal and require the operation's permission.
2. Deduplicate by owner/actor plus request ID and operation. Persist a request fingerprint; reject reuse with different content. Return the recorded result for a successful retry.
3. Lock the queue metadata and applicable order rows. Check `expectedVersion` and, for reorders, `expectedQueueVersion` against current database values.
4. Recheck customer ownership and `status = placed` inside the lock before cancelling. A prior UI check is insufficient.
5. Apply the order change and queue membership/rank change, update timestamps/version, append history, and insert audience-specific events in the outbox.
6. Commit before sending external notifications. Return the committed representation; RabbitMQ publication failure must not roll back a committed order or incorrectly tell the user to place it again.

For a reorder, require the supplied order IDs to be unique and an exact permutation of the current active queue. Reject missing, extra, completed, or cancelled IDs. Resequence ranks atomically and increment the queue revision once. A placement, completion, cancellation, reopening, or reorder always invalidates the previous queue revision. A stale reorder returns 409 and the client reloads before retrying; do not silently overwrite another operator.

If the admin starts preparation before a customer's cancel transaction acquires the lock, cancellation fails with 409 and displays the current in-progress status. If cancellation wins, a stale admin request also fails with 409; the admin may explicitly refresh and reopen it, with an audit reason.

## 7. Reliable RabbitMQ → SSE design

### Commit and publish

The database is the source of truth. The business change, audit entry, and outbox insertion commit atomically. A publisher claims rows with a lease/`FOR UPDATE SKIP LOCKED`, publishes persistent messages with publisher confirms, and marks delivery only after acknowledgement. Reclaim expired leases after crashes; retry with bounded exponential backoff. Use dead-letter/alert handling for poison messages without silently discarding them or blocking the whole outbox forever.

Keep a durable exchange and a per-running-replica fanout subscription so every process can notify its own browsers. A per-replica queue is an ephemeral notification channel, not the durable source of truth: missed browser events are recovered from the database. Confirm/routing failures and outbox lag must be observable. A shared competing-consumer queue is wrong for multiple SSE replicas because only one replica would see each event.

An order commit can produce `order.updated` and, when membership changes, `queue.updated`. Priority-only changes produce `queue.updated`; menu changes produce `menu.updated`. Do not emit customer events with other customers' IDs, names, order contents, contact information, or the full queue.

### Event envelope and routing

```json
{
  "eventId":"opaque-event-id",
  "type":"order.updated",
  "aggregateId":"order-a",
  "aggregateVersion":9,
  "occurredAt":"2026-11-10T18:15:00Z",
  "data":{"id":"order-a","status":"complete","version":9}
}
```

- Owner subscribers receive only their customer-safe order representation and their own queue position/queue revision.
- Staff/admin receive appropriate operational order/queue snapshots or invalidations, never unrestricted contact fields by default.
- Everyone browsing the menu may receive a catalog-revision invalidation. Guests still have an issued identity/session for event access.
- Analytics is admin-only. Order/payment/menu events invalidate the relevant analytics query, not increment arbitrary counters from messages.
- Re-evaluate or expire privileged subscriptions on role revocation/session expiry; an old stream must not retain admin access indefinitely.

Use at-least-once delivery. Order and catalog version numbers, not UUID event IDs or arrival order, determine freshness. Ignore duplicate event IDs and aggregate versions no newer than the cached version. Replace snapshots or invalidate/refetch affected queries; never increment unit, revenue, or loyalty counters per event.

### Reconnect strategy: snapshots first, optional replay later

The initial implementation should explicitly use **full snapshot resynchronization**, not claim durable SSE replay. Open the stream, buffer received events, fetch the authorized order/queue/menu snapshots and revisions, install them, then apply newer buffered events. Subscribe before taking snapshots so a change during the GET is not lost.

Keep `Last-Event-ID` for diagnostics/deduplication, but opaque IDs are not a monotonic database cursor. The current deleted-on-publish outbox cannot replay missing events. Every reconnect performs snapshot recovery; native EventSource listeners can observe a `connected` event without showing stale data as current.

If replay is later required, add an audience-filtered retained event log with a commit-ordered cursor and retention policy; an ordinary sequence allocated before commit does not by itself guarantee commit order. Return `resync.required` when a requested cursor is outside retention or has unknown ordering, then fetch snapshots. Do not implement replay by querying UUIDs or a deleted outbox.

Use one stream per frontend session/role context, with named-event listeners shared by its views. Add 20-second comment heartbeats, cleanup on timeout/error/unmount/logout, jittered exponential reconnect backoff, explicit offline/reconnecting/resyncing/connected labels, and appropriate connection limits with retry guidance on 429. Preserve proxy streaming/no buffering; client and intermediary timeouts must exceed heartbeat intervals.

Do not silently use local-only delivery in a multi-replica production deployment. If RabbitMQ is required for the configured deployment, fail readiness or surface a clearly degraded capability rather than claim cross-replica live updates work.

## 8. Reactive frontend integration

After approval, graduate the prototype into the role-protected single-page café. Admin links remain hidden from customers, but hiding links is not authorization.

- Mutation success installs the returned versioned order/menu/queue, then refreshes related lists and aggregates. Display errors and keep unsaved edits when writes fail.
- `order.updated` refreshes customer order trackers, operational lists/details, queue membership, and admin analytics. The pet speaks only about its customer's changed order.
- `queue.updated` refreshes authorized queue order and each customer's own queue position.
- `menu.updated` refreshes the wall menu, drawer, catalog editor, and validates pending cart lines. Do not overwrite an unsaved edit silently; mark it stale and offer refresh.
- A menu price or availability change does not alter submitted order snapshots. Checkout reprices server-side and asks the user to review changed/unavailable items instead of quietly changing the bill.
- Reset identity-scoped caches/subscriptions on sign-out or account switching. Avoid opening one EventSource per tab within the same UI; multiple browser tabs need documented connection limits.

## 9. Analytics definitions

All metrics must expose their period, shop timezone, filters, and data freshness. UTC `timestamptz` is storage; shop-local calendar boundaries are converted to UTC for query predicates. Treat the end date as exclusive next-local-midnight, accounting for daylight saving, not a hardcoded 24-hour interval.

| Metric | Definition |
| --- | --- |
| Eligible sales | Paid, non-practice, non-cancelled orders; readiness is not payment |
| Units sold | Sum eligible line quantities, not number of transitions or number of orders |
| Most/least sold | Rank item IDs by units; left-join the catalog to include zero sales |
| Category mix | Eligible line units grouped by immutable category snapshot |
| Gross item sales | Sum quantity × unit price snapshot; USD cents, before tax/refunds/fees |
| Order volume | All non-practice placed orders, including cancellations; show the status breakdown |
| Order-time patterns | Bucket original placement timestamps by shop-local hour and calendar day |
| Preparation timing | Placement/first start/latest ready/update timestamps and audit timeline; unknown values remain null |

Use the order's original placement time for date cohort filtering, then current payment/cancellation eligibility for sales. A reopened order counts once, not once per preparation cycle. Cancelling a paid order removes it from operational sales metrics under this definition, but does not automatically issue a refund or change financial settlement totals. Label this distinction prominently; a full finance/refund ledger is outside this scope.

Include archived items with historical sales in rankings and retain their snapshots; zero-sale active items are visible. Flag legacy-unknown attribution separately so category and item totals reconcile to eligible line quantities rather than silently dropping old orders. Return complete relevant ranks with bounded pagination or explicitly disclose top-N truncation.

Suggested analytics response: `period`, `timezone`, `definitions`, `generatedAt`, `eligibleOrders`, `unitsSold`, `grossItemSalesCents`, item ranking with ID/name/category/units, category totals, hourly/day counts, and exclusions/practice counts. Empty ranges produce zeros and empty chart states, not fabricated sample values.

## 10. Implementation sequence

1. Approve the prototype and this contract, especially the distinct readiness/pickup/loyalty policy.
2. Add migrations, immutable snapshots, audit and version checks; test backfills on a database copy.
3. Update OpenAPI and generated schemas/hooks together with Spring customer/admin/staff APIs.
4. Add queue priority transactions and menu lifecycle APIs.
5. Extend outbox/audience/version semantics and client snapshot recovery; validate with a real broker and multiple service replicas before claiming production SSE reliability.
6. Add reporting queries and explicit timezone configuration; compare every aggregate to underlying order lines.
7. Graduate the approved UI into the main app, preserving role gates and the no-page-scroll café; verify actual customer/admin sessions.
8. Configure and deploy separately only after explicit approval. No Railway service, real broker, payment integration, or deployment was provisioned by this prototype task.

## 11. Verification and acceptance cases for implementation

- All customer/staff/admin API permission combinations; forged owner/role/price fields; guessed/unowned order IDs; guest session loss and CSRF rejection.
- Every admin four-state transition, same-state no-op, reopening from complete/cancelled, history visibility, timestamps, and queue-tail reinsertion.
- Customer cancellation before preparation, after preparation, and raced against preparation; exactly one winning write for the same expected version.
- Concurrent reorders, placement during reorder, completion during reorder, duplicate/missing/foreign IDs, FIFO tie-breaks, and queues longer than one history page.
- Menu create/edit/archive/availability, invalid price/name/category/description, concurrent edit conflicts, archived-item checkout rejection, and unchanged historical line snapshots.
- A dropped or duplicated broker message, delayed/out-of-order events, publisher crash before/after confirm, poison message, replica restart, disconnected client, and rehydration while another order changes.
- Customer A never receives Customer B's order/contact/queue information; role revocation closes privileged access.
- Analytics quantities greater than one, zero-sale items, archive/rename/category changes, practice/unpaid/cancelled exclusions, repeated reopen cycles, mixed legacy attribution, and empty ranges.
- Timezone midnight, daylight-saving transitions, and invalid date ranges; displayed charts/tables match canonical aggregates.
- Legacy collected orders keep pickup/loyalty facts; legacy ready orders do not gain collected eligibility. No payment/refund is triggered by a status write.
- Desktop/phone navigation, internally scrolling panels, keyboard reorder controls, focus/escape in dialogs, and accessible chart values.

## 12. Files to extend later

- API contracts: `lib/api-spec/openapi.yaml`
- Java rules/storage: `services/coffee-api/src/main/java/com/purrandpour/CoffeeController.java`, `CoffeeStore.java`, and `SecurityConfig.java`
- Event delivery: `services/coffee-api/src/main/java/com/purrandpour/OrderEvents.java`
- Schema baseline: `services/coffee-api/src/main/resources/schema.sql` (use versioned migrations for future changes)
- Public identity/proxy boundary: `artifacts/api-server/src/middlewares/coffeeGateway.ts`
- Existing customer/staff UI: `artifacts/purr-and-pour/src/pages/cafe.tsx` and `src/components/drawers.tsx`
- Isolated frontend prototype: `artifacts/mockup-sandbox/src/components/mockups/admin-operations/`
