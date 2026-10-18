# AGENTS.md — Second Lap Admin Panel

Entry point for any agent (or human) working this repo. Read this first; it lets
you be productive without reading the whole codebase. Deep detail lives in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## What this is

The **admin panel** for Second Lap, a second-hand clothing store. A seller-facing
internal tool to manage the product catalog and customer orders. It is a
**Backend-for-Frontend (BFF)**: the browser never talks to the Spring Boot
backend directly — it talks to this app's own API routes, which hold the admin
session and call the backend server-side.

Part of a three-repo ecosystem (sibling folders):

- **`Second-Lap-AdminPanel`** — this repo (Next.js admin panel).
- **`second-hand`** — the public storefront (Next.js, buyer-facing).
- **`Second-Lap-Backend`** — the API (Java / Spring Boot) both frontends consume.

The backend contract is the source of truth. When a feature needs new backend
behavior, it is requested and verified in `Second-Lap-Backend` first, then this
panel consumes it. Enum string values (statuses, methods) are the **exact
Spanish strings** the API uses — never translate them in code.

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js **16.4.1** (App Router, Turbopack, React Compiler) |
| Language | TypeScript 5 (strict) |
| UI | React **19.3**, Tailwind CSS **4** (CSS-var design tokens) |
| State | Zustand 5 (minimal; most state is local/server) |
| Tests | Vitest 5 + Testing Library + jsdom, V8 coverage |
| Package manager | **pnpm 12.11.2** (pinned via `packageManager`) |
| Lint/format | ESLint (`eslint-config-next`), lint-staged + Husky pre-commit |
| Runtime split | Edge for the route guard (`proxy.ts`); Node for API routes needing `node:crypto` |

## Commands (the quality gate)

Run with **pnpm**. The full gate must be green before any commit/merge:

```bash
pnpm install            # install deps
pnpm dev                # local dev server (http://localhost:3000)
pnpm lint               # ESLint — must be 0 errors
pnpm build              # Next build + typecheck — must compile
pnpm test:run           # Vitest once — all tests must pass
pnpm test:coverage      # Vitest + V8 coverage
```

A Husky pre-commit hook runs lint-staged + tests on staged files. Do **not**
bypass it (`--no-verify`) unless explicitly asked.

## Environment

Copy `.env.example` to `.env` and fill values. Four vars (details in
`.kiro/SECRETS-AND-DEPLOYMENT.md`, local-only):

- `BACKEND_URL` — backend base URL the BFF calls server-side (prod: required).
- `BACKEND_PUBLIC_ORIGIN` / `NEXT_PUBLIC_BACKEND_PUBLIC_ORIGIN` — backend origin
  for product image URLs (CSP `img-src` + client image resolution).
- `SESSION_SECRET` — AES-256-GCM key (must decode to **32 bytes**) encrypting the
  Basic credential inside the session cookie.
- `SESSION_SIGNING_SECRET` — HMAC-SHA256 key signing the cookie so the edge
  proxy can verify it without decrypting. Must differ from `SESSION_SECRET`.
- `NEXT_PUBLIC_ADMIN_POLL_SECONDS` — live-refresh poll interval (default 15,
  floor 5).

Generate secrets: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
Secrets live ONLY in the environment, never in git.

## Where things live

```
src/
  app/
    page.tsx                 redirect entry
    login/                   login page
    productos/               product list, /nuevo (create), /[id] (detail), /[id]/editar
    pedidos/                 order list + /[id] detail
    api/admin/               BFF route handlers (the only thing the browser calls)
      login, logout, refresh, categories
      products/ (+ [id], [id]/images, [id]/status)
      orders/   (+ [id], [id]/{confirm,complete,deliver,cancel,status})
  components/                presentational + client view components
  lib/                       data boundary, auth/session, helpers, hooks (all unit-tested)
  types/                     domain types mirroring the backend contract
  data/                      static branding/config
  proxy.ts                   edge route guard + per-request CSP nonce (Next 16 "proxy" convention)
```

Every `src/lib/*.ts` has a colocated `*.test.ts`. Follow that pattern.

## How to work here (conventions)

- **BFF boundary is absolute.** Client components fetch only `/api/admin/*`
  (this app's routes), never the backend directly. `src/lib/apiClient.ts` is the
  single server-side boundary to the backend; it attaches the Basic credential.
- **Data fetching** on the client goes through `useAdminResource<T>(path)`
  (loading/error/ready + 401→/login). It supports `reload({ silent })` for
  background refresh. Live lists poll via `useAdminPolling` (visible-tab-only).
- **Server-side filtering/sorting/pagination.** Lists pass query params to the
  BFF route, which forwards them to the backend. Never filter in the client.
- **Enum values are backend Spanish strings** (e.g. `pendiente`, `disponible`,
  `domicilio`). Labels for display live in `src/lib/*` label maps.
- **Security is part of done** (see ARCHITECTURE): per-request CSP nonce, signed
  httpOnly cookies, rate limiting, input sanitization, WCAG AA. Don't weaken
  these; `Secure`/`SameSite` cookie flags are environment-gated for a reason.
- **Clean code, small atomic commits, Conventional Commits in English.** One
  logical change per commit; the commit builds and passes on its own.
- **Comments explain _why_, not _what_.** No narration of what you just did.
- **Tests with every change.** Add/adjust the colocated test; keep coverage up.

## Git / PR workflow

Trunk-based. For each change:

1. Branch from `main`: `feat/…`, `fix/…`, `chore/…`, `docs/…`.
2. Implement + tests; run the full gate green.
3. Commit (Conventional Commits), then merge to `main` with `--no-ff`.
4. Delete the branch; `git push origin main`; confirm `origin/main` is in sync.

High-risk actions (destructive git, prod, auth/CSP/cookie/limiter layers) warrant
pausing to confirm intent before acting.

## Verifying UI changes

`pnpm build && pnpm start` serves a production build (no dev HMR noise) — use it
for faithful manual/browser checks, especially over a LAN IP from a phone.
Unit/integration tests (Vitest + Testing Library, fake timers for debounce/
polling) are the primary gate; cite their output as evidence.

## Local operational notes (`.kiro/`, git-ignored)

Not versioned, but useful background if present locally:

- `SECRETS-AND-DEPLOYMENT.md` — env vars & secret handling per environment.
- `CSP.md` — the nonce-based CSP + dynamic-rendering tradeoff.
- `SONARQUBE.md` — local static-analysis setup (0/0/0, A/A/A target).
- `DEV-LAN-LOGIN.md` — why login over a LAN IP needed cookie `Secure`/`SameSite`
  gating and the HMR-over-IP caveat.
