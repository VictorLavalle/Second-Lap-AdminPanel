# Second Lap — Admin Panel

The seller-facing admin panel for **Second Lap**, a second-hand clothing store.
It lets sellers manage the product catalog and fulfill customer orders. Built as
a **Backend-for-Frontend (BFF)**: the browser talks only to this app's own API
routes, which hold the admin session and call the Spring Boot backend
server-side — the backend credentials never reach the client.

> Part of a three-repo ecosystem: this panel, the public storefront
> (`second-hand`), and the REST API (`Second-Lap-Backend`). The backend is the
> source of truth for the data contract.

## Features

- **Catalog management** — list, create, edit, and delete products; upload
  images; change availability status. Paginated, with server-side status filter
  and sorting.
- **Order fulfillment** — list and search orders (by order number or customer),
  filter by status and delivery method, and advance each order through its
  lifecycle (`pendiente → confirmado → completado → entregado`, plus cancel) via
  a status dropdown that respects the backend workflow.
- **Live refresh** — lists poll in the background (visible tab only) so sellers
  see new orders and changes without reloading.
- **Secure by design** — encrypted, signed, httpOnly session cookies; a
  per-request Content-Security-Policy nonce; rate limiting on auth endpoints;
  input sanitization; and WCAG 2 AA accessibility.

## Tech stack

Next.js 16 (App Router, Turbopack, React Compiler) · React 19 · TypeScript 5
(strict) · Tailwind CSS 4 · Zustand 5 · Vitest + Testing Library · pnpm.

## Getting started

Requires Node.js and [pnpm](https://pnpm.io) (version pinned via
`packageManager`).

```bash
pnpm install
cp .env.example .env     # then fill in the values (see below)
pnpm dev                 # http://localhost:3000
```

### Environment

| Variable | Purpose |
|---|---|
| `BACKEND_URL` | Backend base URL the BFF calls server-side (required in production). |
| `BACKEND_PUBLIC_ORIGIN` / `NEXT_PUBLIC_BACKEND_PUBLIC_ORIGIN` | Backend origin for product image URLs (CSP + client resolution). |
| `SESSION_SECRET` | AES-256-GCM key (must decode to 32 bytes) that encrypts the session credential. |
| `SESSION_SIGNING_SECRET` | HMAC-SHA256 key that signs the session cookie. Must differ from `SESSION_SECRET`. |
| `NEXT_PUBLIC_ADMIN_POLL_SECONDS` | Live-refresh interval (default 15s, floor 5s). |

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Secrets live only in the environment, never in version control.

## Scripts

```bash
pnpm dev            # local dev server
pnpm lint           # ESLint (must be 0 errors)
pnpm build          # production build + typecheck
pnpm test:run       # run the test suite once
pnpm test:coverage  # run tests with V8 coverage
```

`pnpm build && pnpm start` serves a production build for faithful manual checks
(no dev HMR). A Husky pre-commit hook runs lint-staged and tests on staged files.

## Project structure

```
src/
  app/           pages (login, productos, pedidos) + BFF route handlers (api/admin/*)
  components/    presentational and client view components
  lib/           data boundary, auth/session, hooks, and helpers (all unit-tested)
  types/         domain types mirroring the backend contract
  proxy.ts       edge route guard + per-request CSP nonce
```

## Documentation

- **[AGENTS.md](AGENTS.md)** — quick orientation and working conventions.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — detailed architecture: the
  BFF model, authentication and session handling, security posture, the data
  layer, features, and the full BFF route map.

## Contributing

Trunk-based workflow: branch from `main` (`feat/…`, `fix/…`, `chore/…`,
`docs/…`), implement with tests, keep the quality gate green (lint, build,
tests), and merge back with `--no-ff`. Commits follow Conventional Commits in
English. Security- and accessibility-sensitive areas (auth, CSP, cookies, rate
limiting) are part of "done", not follow-ups.
