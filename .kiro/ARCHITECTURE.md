# Architecture — Second Lap Admin Panel

Detailed reference for the admin panel's design. For the quick start, commands,
and conventions, read [`AGENTS.md`](AGENTS.md) first.

## 1. Purpose & ecosystem

The admin panel is the seller-facing internal tool for Second Lap (a second-hand
clothing store). Sellers manage the **product catalog** and **customer orders**.

Three repositories, siblings on disk:

| Repo | Role | Stack |
|---|---|---|
| `Second-Lap-AdminPanel` (this) | Seller admin panel | Next.js 16 (BFF) |
| `second-hand` | Public storefront (buyers) | Next.js 16 |
| `Second-Lap-Backend` | REST API, source of truth | Java / Spring Boot |

Both frontends consume the same backend. The **backend contract is canonical**:
enum values are the exact Spanish strings the API returns (`pendiente`,
`disponible`, `domicilio`, …) and are never translated in code — only mapped to
display labels in `src/lib/*`.

## 2. Backend-for-Frontend (BFF) model

The browser **never** calls the Spring backend directly. It calls this app's own
route handlers under `/api/admin/*`, which run server-side, hold the admin
session, attach the Basic credential, and call the backend.

```
Browser (client components)
   │  fetch /api/admin/*   (same-origin, cookies)
   ▼
Next.js Route Handlers  (src/app/api/admin/*, Node runtime)
   │  resolveAdminCredentials(cookie) → decrypt Basic cred
   │  apiClient.*()  (attaches Authorization: Basic …)
   ▼
Spring Boot backend  (BACKEND_URL)
```

Why: the backend uses HTTP Basic auth. Exposing those credentials to the browser
would be unsafe, so they are encrypted inside an httpOnly cookie and only ever
decrypted server-side in a route handler. `src/lib/apiClient.ts` is the **single**
boundary to the backend.

## 3. Request lifecycle & the edge proxy

`src/proxy.ts` (Next 16 "proxy" convention, formerly `middleware.ts`) runs on the
**edge runtime** on every request. It does two things:

1. **Route guard.** A valid session cookie OR a still-valid refresh token lets the
   request through; otherwise it redirects to `/login`. It verifies the cookie's
   HMAC signature with Web Crypto (no `node:crypto` on the edge) — it never
   decrypts the credential.
2. **Per-request CSP nonce.** Generates a nonce, forwards it to the app via a
   request header, and sets the `Content-Security-Policy` response header with
   that nonce so framework inline scripts are authorized without `unsafe-inline`
   in production. (See `.kiro/CSP.md` for the dynamic-rendering tradeoff.)

Node-runtime route handlers (login, refresh, anything touching `node:crypto`)
are explicitly marked `export const runtime = "nodejs"`.

## 4. Authentication & session

Files: `src/lib/authSession.ts`, `session.ts`, `sessionCookie.ts`,
`refreshStore.ts`, `refreshSession.ts`, `adminCredentials.ts`, `authConstants.ts`.

- **Login** (`/api/admin/login`): validates credentials against the backend
  (`getAdminMe`), then sets two cookies.
- **Session cookie** (`sl_session`): the Basic credential **encrypted** with
  AES-256-GCM (`SESSION_SECRET`), wrapped in a token **signed** with HMAC-SHA256
  (`SESSION_SIGNING_SECRET`). Signing lets the edge proxy verify presence +
  integrity + expiry without decrypting.
- **Refresh cookie** (`sl_refresh`): a rotating refresh chain
  (`refreshStore.ts`). When the session expires, the BFF transparently rotates
  and reissues both cookies (`withRefreshedCookies` in `bffResponse.ts`).
- **Cookie hardening** (`cookieOptions`): `httpOnly` always; `SameSite=Lax` (so
  the cookie rides the top-level post-login navigation); `Secure` gated to
  production (`NODE_ENV === "production"`) so dev works over plain HTTP on a LAN
  IP. See `.kiro/DEV-LAN-LOGIN.md`.
- **401 handling**: on any 401 the client hook redirects to `/login`.

## 5. Security posture (part of "done")

- **CSP**: per-request nonce, `strict-dynamic` in prod, no `unsafe-inline` for
  scripts (`src/lib/securityHeaders.ts`, applied by `proxy.ts`). Static hardening
  headers set in `next.config.ts`.
- **Rate limiting**: per-IP + global caps on login/refresh (`src/lib/rateLimit.ts`,
  `clientKey.ts`).
- **Input sanitization**: `src/lib/sanitize.ts` strips angle brackets etc. on
  user input (product form, login).
- **Image uploads**: client-side type/size validation (`imageUpload.ts`) as
  defense-in-depth; the backend re-validates.
- **Accessibility**: WCAG 2 AA — labels on all controls, keyboard-navigable,
  color contrast ≥ 4.5:1 (accent token darkened for this; see git history).
- **Secrets**: never in git; env-only. `.env.example` documents the shape.

## 6. Data layer & client hooks

| Module | Responsibility |
|---|---|
| `src/lib/apiClient.ts` | Single server-side boundary to the backend. Typed methods per endpoint; attaches Basic cred; builds list query strings (`buildListQuery`). |
| `src/lib/useAdminResource.ts` | Client hook: fetches a BFF path → `{ state, reload }` with loading/error/ready. `reload({ silent })` refreshes without flipping to loading. 401 → `/login`. |
| `src/lib/useAdminPolling.ts` | Visible-tab-only interval scheduler. Pauses when hidden/`paused`, resumes with an immediate tick. Interval from `NEXT_PUBLIC_ADMIN_POLL_SECONDS` (default 15s, floor 5s). |
| `src/lib/useOrderAction.ts` | Confirm-dialog-driven order transition: PATCHes the action endpoint, surfaces backend 409 messages, 401 → `/login`, refreshes on success. |
| `src/lib/listParams.ts` | BFF-side parse/validate of list query params (status, deliveryMethod, q, sort, page, size) before forwarding to the backend. |
| `src/lib/listSignature.ts` | Stable fingerprints of product/order lists for change detection during polling. |

**Live refresh pattern.** List views (`ProductsView`, `OrdersView`) poll via
`useAdminPolling`. In a **neutral** view (no filter/search, first page) a change
triggers a silent `reload`. With a filter/search/page active, a change instead
raises a discreet "Hay cambios" notice (`RefreshNotice`) so the view is never
moved under the user. Polling pauses while an order action/dialog is in flight.

## 7. Features

### Products
- **List** (`/productos`): paginated table (10/25/50/100), server-side **status
  filter** and **sort** (recent/old by `createdAt`, price asc/desc). Rows link to
  a read-only detail; "Editar" link per row.
- **Detail** (`/productos/[id]`): read-only view (fields + images).
- **Create** (`/productos/nuevo`): form with live price preview (`$1,500.00`),
  **image upload up front** (create → then upload with the new id), and a
  discard-confirmation guard (dialog + `beforeunload`) when the form is dirty.
- **Edit** (`/productos/[id]/editar`): form + `ProductManagePanel` (image upload
  with progress/success feedback, status dropdown, delete). Same discard guard.
- Images are backend-relative (`/uploads/…`); `src/lib/imageUrl.ts` resolves them
  to the backend origin for the browser.

### Orders
- **List** (`/pedidos`): paginated, with **search** (`q`: order number or customer
  name, debounced 350ms), **status** + **delivery-method** filters, and **sort**
  (createdAt / total). All server-side.
- **Detail** (`/pedidos/[id]`): full order, milestones, status-change timeline,
  "Contactar por WhatsApp" in the Cliente section.
- **Status workflow** (`src/lib/orders.ts`, mirrors backend `OrderStatus.ALLOWED`):
  linear forward (`pendiente → confirmado → completado → entregado`) + **cancel
  from any non-terminal state** (reverts inventory). The card exposes a status
  dropdown for the forward transition and a separate "Cancelar pedido" button.
  Each transition confirms via dialog and surfaces the backend's 409 on invalid
  moves.

## 8. BFF routes (`src/app/api/admin/`)

| Route | Methods | Notes |
|---|---|---|
| `login` | POST | Validates creds, sets session+refresh cookies. Rate-limited. Node runtime. |
| `logout` | POST | Clears cookies. |
| `refresh` | POST | Rotates the refresh chain. Rate-limited. |
| `categories` | GET | Proxies backend categories. |
| `products` | GET, POST | GET = paginated admin list (status/sort/page/size). POST = create. |
| `products/[id]` | GET, PUT, DELETE | Single product read/update/delete. |
| `products/[id]/images` | POST | Multipart image upload. |
| `products/[id]/status` | PATCH | Product status change. |
| `orders` | GET | Paginated list (status/deliveryMethod/q/sort/page/size). |
| `orders/[id]` | GET | Single order. |
| `orders/[id]/{confirm,complete,deliver,cancel}` | PATCH | Per-action transitions; the status dropdown drives these. |

> The backend also exposes a generic workflow-validated `PATCH /admin/orders/{id}/status`,
> but the panel's BFF does **not** currently proxy it — the UI uses the four
> per-action routes above. Wire a `status` BFF route if you migrate the dropdown
> to the generic endpoint.

All GET/mutation routes gate on `resolveAdminCredentials` (401 if no valid
session) and pass through backend errors via `errorResponse` (preserving the
backend's Spanish 409 messages and correlation refs on 5xx).

## 9. Testing

- **Framework**: Vitest + Testing Library + jsdom; V8 coverage.
- **Pattern**: every `src/lib/*.ts` has a colocated `*.test.ts`; components have
  `*.test.tsx`. ~56 test files.
- **Techniques**: `fetch`/hook mocking, **fake timers** for debounce and polling,
  `act()` around timer advances, capturing callbacks from mocked hooks
  (`useAdminPolling`, `useAdminResource`) to drive deterministic assertions.
- **Rule**: `react-hooks/set-state-in-effect` is strict — fetch-on-mount sets
  state only in async continuations (never synchronously); the one justified
  `eslint-disable` documents why.

## 10. CI & tooling

- **CI**: `.github/workflows/ci.yml` runs the quality gate.
- **Pre-commit**: Husky + lint-staged run lint/tests on staged files.
- **Static analysis** (local, optional): SonarQube target 0 bugs / 0 vulns /
  0 smells, A/A/A — see `.kiro/SONARQUBE.md`. Config in `sonar-project.properties`.

## 11. Gotchas (learned the hard way)

- **Login over LAN IP**: dev uses plain HTTP, so `Secure` cookies are dropped by
  the browser → `Secure` is gated to production. `SameSite=Lax` (not Strict) so
  the cookie survives the post-login navigation.
- **`Cannot write to a CLOSED writable stream`** in dev over a LAN IP is the
  Next HMR hot-reloader, not app code — gone in `pnpm build && pnpm start`.
- **Enter-to-submit** on the login form is handled explicitly
  (`requestSubmit()`), because the browser's implicit submit was observed not to
  fire in this setup.
- **`next/image` + localhost backend**: optimizing images from a private IP is
  blocked (SSRF guard); `dangerouslyAllowLocalIP` is enabled in **dev only**
  (storefront). Backend-relative image paths must be prefixed with the backend
  origin before rendering.
- **Pagination contract**: list endpoints return a `Page<T>` envelope
  `{ content, totalElements, totalPages, number, size }` — read `.content`.
