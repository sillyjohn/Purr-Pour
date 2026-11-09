# Purr & Pour backend

The order, menu, loyalty, preference, outbox, RabbitMQ, and SSE logic runs in **Java 17+ / Spring Boot**. PostgreSQL is the source of truth.

The small Express edge at `artifacts/api-server` handles Replit-managed Clerk's canonical browser/proxy integration, verifies session cookies, resolves roles from trusted Clerk user public metadata, signs guest cookies, checks same-origin mutations, and forwards requests to Spring Boot over loopback. It does not implement the coffee business logic.

## Run

Prerequisites: Node 24, pnpm 10, Java 17 or newer, Maven 3, PostgreSQL.

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start
```

Apply `src/main/resources/schema.sql` explicitly to a **new development database** before first startup. It creates the application schema and seeds example menu items/pet designs. It preserves existing menu data. The application never runs startup DDL. The workspace development database has already been initialized.

Environment:

- `DATABASE_URL`: PostgreSQL connection, consumed by the edge and translated to JDBC configuration at runtime.
- `PORT`: public HTTP port for the auth edge.
- Clerk variables: provisioned by the authentication integration.
- `SESSION_SECRET`: optional dedicated guest-cookie signing secret. If absent, a domain-separated signing key is derived from the existing Clerk secret, so guest cookies survive process restarts.
- `RABBITMQ_URL`: optional AMQP/AMQPS connection for the real RabbitMQ transport.

The edge generates a private internal gateway key at startup and passes it to its child JVM. Spring binds to `127.0.0.1:8091`, and refuses requests without the key. **Do not expose the Spring port publicly or forward client-supplied identity headers.** The public API is the authenticated edge.

## Railway target

The source is portable to Railway, but a Railway deployment has **not** been configured or verified. Configure a build environment containing both the Node and Java toolchains listed above; use the build/start commands above with the working directory `artifacts/api-server` for the start command, or use pnpm's filter as shown.

Keep the auth edge and child JVM together in one service; only expose `PORT`. Provision PostgreSQL and RabbitMQ separately, and supply their connection settings securely. Apply the schema explicitly to that external database before starting. Configure the Clerk instance/custom domain and trusted frontend origin for the Railway-hosted environment. The generated Replit-managed development credentials are not a substitute for production authentication setup.

An external Railway deployment does not inherit Replit's managed database publish flow, secrets, or integration credentials. No account, subscription, deployment, or production database has been created on Railway by this project.

## Authentication and roles

- The homepage, menu, pet previews, and guest practice ordering are public.
- Roles are `customer`, `staff`, and `admin`, stored in Clerk user **public metadata** and read server-side. Unrecognized roles become `customer`.
- Spring Security independently enforces staff and admin endpoints after the trusted edge's identity check.
- `/api/staff/orders` and status changes require staff or admin.
- `/api/admin/menu/{id}` requires admin.
- No first-user-is-admin rule, hardcoded owner account, default password, or browser role override exists.
- To grant a role after creating and verifying an account, the project owner can run the explicit development command documented in `scripts/src/grant-role.ts`. No administrator has been assigned yet. Production identities are separate and need an explicit owner-authorized role grant in their own environment.

## Event delivery

Order mutations and their outbox records commit in one DB transaction. A worker publishes outbox records and removes them only after broker acknowledgement. With `RABBITMQ_URL` set, events go through a durable fanout exchange and per-instance SSE subscriber queue. Publication is at least once; event IDs are stable across retries. Browsers must fetch current order snapshots on reconnect rather than infer loyalty by incrementing counters from events.

Without RabbitMQ configured, the app explicitly uses a single-process **practice transport**, still reading the persisted outbox and delivering actual SSE. `GET /api/shop` exposes `rabbitEnabled: false`. This is not a production multi-replica transport and is not described as a connected RabbitMQ broker.

SSE subscriptions are scoped to the signed-in identity or signed guest cookie. Staff may see all queue events. The stream sends heartbeats and does not expose customer email addresses. Guest tracking survives browser refreshes using an HttpOnly signed cookie, not an order number or email lookup. Guest data is not silently merged into an account on sign-in, and no email claim flow has been implemented.

## Payments and loyalty

Stripe is not connected. Real order attempts return HTTP 503 **without taking payment or creating a fulfillable order**. The interface offers clearly labeled practice orders only. No card inputs, wallet buttons, fake payment completion, outbound email/SMS, or live coffee fulfillment are provided.

Practice orders persist and automatically advance to preparing after about 6 seconds and ready after about 16 seconds. They never become paid orders and never earn loyalty.

Only orders with `practice=false`, `payment_status='paid'`, and `status='collected'` count toward loyalty. Miso is the starter; Mochi unlocks at 5 orders and Biscuit at 10. All designs can be previewed without claiming to own them.

Before accepting money, implement the connected Stripe product/price catalog and webhook-verified payment flow, taxes for the shop's actual locality, refund handling, verified contact notifications, and the chosen guest-to-account claim policy. Wallet eligibility must come from Stripe, not decorative Apple Pay/Google Pay buttons.
