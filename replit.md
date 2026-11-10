# Purr & Pour

A single-page, pixel-art coffee shop where interactive pet baristas accompany guest ordering and announce order status.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/purr-and-pour run dev` — run the storefront through its managed workflow
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API business logic: Java 17+ / Spring Boot, PostgreSQL/JDBC
- Authentication edge: Express 5 with Replit-managed Clerk, private loopback forwarding to Spring
- DB: PostgreSQL (schema explicitly initialized in development)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/purr-and-pour` — public interactive storefront
- `services/coffee-api` — Spring Boot domain backend, SQL schema, and operational documentation
- `artifacts/api-server` — Clerk/auth edge and managed backend entry point
- `lib/api-spec/openapi.yaml` — API source of truth

## Architecture decisions

- Keep the Node auth edge rather than replacing the requested Java business backend: it preserves the canonical managed Clerk browser/proxy setup while Spring owns all coffee-shop behavior.
- Never make the first registering customer an administrator. Privileged roles require an explicit, owner-authorized grant to a verified account.
- Practice mode is deliberate while Stripe and RabbitMQ are not connected. Do not represent practice orders as purchases, award them loyalty, or show fake payment/wallet controls.

## Product

Guest ordering, customizable menu/cart, pet preview and interaction, server-owned milestone eligibility, persisted preferences, SSE order tracking, role-protected staff queue and admin menu editing.

## User preferences

- US coffee shop. Pets unlock through loyalty milestones; incoming orders are managed by staff inside this app rather than an existing POS.
- Single-page consumer experience; settings and checkout use stylized chalkboard side drawers. Most graphics should be pixelized, based on the supplied coffee-counter art and Piskel animations.
- The main page must not scroll: scale the café scene to the viewport on desktop, iPhones, and mainstream phones, with the coffee station and barista anchored bottom-center and the coffee menu above them.
- Preserve the current fonts, pixel button designs, icons, and chalkboard side-drawer styling; the user explicitly approved these.
- Match the supplied concept closely: white/light-gray background, a silver lamp hanging in the middle, and wooden menu slats. Keep chalkboard styling for side drawers.
- Use the supplied coffee-station artwork for the fixed bottom-centered counter, extending its wooden floor to both sides. Preserve the artwork's 2.5D perspective rather than a flat front-view counter.
- User requested Java/Spring Boot with Railway as the eventual backend deployment target, RabbitMQ + SSE order updates, account-optional ordering with contact details, role-based access and admin editing on the same page, and Stripe with Apple Pay/Google Pay where supported.

## Gotchas

- Java port is private and authenticated by the Node edge. Never expose it directly or trust browser-supplied identity headers.
- A Railway deployment, Stripe payment integration, RabbitMQ connection, guest email-claim flow, and outbound notifications are not configured. See the backend README for honest capability boundaries.
- Managed workflows inject the correct service ports; root API start also launches the private JVM.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
