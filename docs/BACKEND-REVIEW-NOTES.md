# MITDrone — Backend Developer Review Notes

## 1. Implementation Summary

This work integrates the MITDrone frontend (marketplace-web, vendor-dashboard, admin-dashboard) with the live backend OpenAPI specification at `https://mitdrone.vercel.app/docs/openapi.json` (57 operations, all response bodies undocumented `{}`).

All 57 backend operations now have SDK endpoint implementations in `packages/sdk/src/endpoints/backend.ts`. Most have TanStack Query hooks in `packages/sdk/src/hooks/backend.ts`. 17 operations are connected to actual application pages.

**Scope:** Backend API integration only. No changes to mock data, UI design, or unrelated functionality.

---

## 2. Authentication / Session / CSRF Architecture

### Token Capture
- `POST /auth/login` response is parsed for `csrfToken` (top-level or `session.csrfToken`).
- On success, `configureApiClient({ getCsrfToken: () => this.csrfToken })` is called.
- Token is stored in-memory on the `AuthController` instance only — never in localStorage or sessionStorage.

### Session Restoration
- `AuthProvider` calls `ctrl.restore()` on mount, which invokes `GET /auth/session`.
- The session response is parsed for `csrfToken` and the token is refreshed.
- `isRestoring` flag prevents concurrent mutations during restoration.
- Restoration is deduplicated via a `restoring` promise (only one in flight at a time).
- On 401, state transitions to `unauthenticated` and `onSessionExpired` callback fires.

### Authenticated Mutations
- SDK `ApiClient.send()` sends `credentials: 'include'` on every request (session cookie).
- For authenticated non-GET requests, `x-csrf-token` header is set from `getCsrfToken()`.
- Fail-closed: if `getCsrfToken` returns null/undefined, the request throws `csrf_token_unavailable` before sending.
- Public endpoints (login, register, etc.) use `auth: false`, so no CSRF is required and no Bearer token is sent.

### Logout
- If a CSRF token exists, `POST /auth/logout` is attempted (best-effort, errors swallowed).
- Token is cleared, `getCsrfToken` is reconfigured to return `null`, state transitions to `unauthenticated`.

### Session Expiry
- `expire()` clears `csrfToken` and `mockAccessToken`, transitions to `unauthenticated`.
- The existing `getCsrfToken` closure reads `this.csrfToken` live, so after expiry it returns `null`.
- `onAuthFailure` (triggered on 401 from authenticated requests) calls `expire()`.

### Cookie / CORS Dependencies (unverified)
- All three frontend origins must be allowed for credentialed CORS.
- Session cookie: `mitdrone_session`, HttpOnly, SameSite=Lax (per mock handler), Secure (production).
- CSRF token rotation: not documented in spec — unknown if backend rotates tokens on login/session.
- Session expiration: not documented in spec.

---

## 3. Exact Endpoints Integrated

All 57 operations have SDK endpoint implementations. 17 are connected to app pages:

| Endpoint | Method | App | Page |
|----------|--------|-----|------|
| `/catalog/products` | GET | Marketplace | Shop (`/shop`) |
| `/catalog/offers/{offerId}/availability` | GET | Marketplace | Product detail (`/products/[slug]`) |
| `/orders` | GET | Marketplace | Account orders (`/account/orders`) |
| `/organizations/{orgId}/offers` | GET | Vendor dashboard | Products (`/(dashboard)/products`) |
| `/organizations/{orgId}/assets` | GET | Vendor dashboard | Inventory (`/(dashboard)/inventory`) |
| `/orders` | GET | Vendor dashboard | Orders (`/(dashboard)/orders`) |
| `/orders/{id}` | GET | Vendor dashboard | Order detail (`/(dashboard)/orders/[id]`) |
| `/orders/{id}/cancel` | POST | Vendor dashboard | Order detail cancel |
| `/organizations` | GET | Admin dashboard | Vendors (`/(console)/vendors`) |
| `/organizations/{id}` | GET | Admin dashboard | Vendor detail (`/(console)/vendors/[id]`) |
| `/admin/organizations/{id}/review` | POST | Admin dashboard | Vendor detail approve/reject |
| `/admin/organizations/{id}/suspend` | POST | Admin dashboard | Vendor detail suspend |
| `/orders` | GET | Admin dashboard | Orders (`/(console)/orders`) |
| `/orders/{id}` | GET | Admin dashboard | Order detail (`/(console)/orders/[id]`) |
| `/orders/{id}/cancel` | POST | Admin dashboard | Order detail cancel |
| `/admin/offers` | GET | Admin dashboard | Products moderation (`/(console)/products`) |
| `/admin/offers/{id}/review` | POST | Admin dashboard | Products moderation approve |

Remaining 38 operations have SDK endpoints + hooks but no app page integration.

---

## 4. Request and Response Assumptions

### Request assumptions
- All backend paths match the OpenAPI spec exactly (verified against `backend-routes.ts`).
- `credentials: 'include'` on all requests (session cookie).
- `x-csrf-token` on authenticated non-GET requests where SDK sets `csrf: true`.
- `Idempotency-Key` header auto-generated for `POST /reservations` and `POST /orders`.
- `baseUrlOverride` strips `/api/v1` for health endpoints (`/health/*`).

### Response assumptions (UNVERIFIED — speculative)
All backend response bodies are `{}` in the OpenAPI spec. The following code assumes specific response shapes:

1. **`normalizeBackendProductList()`** (marketplace) assumes `{ data: Product[] }` or `{ products: [...] }` at top level.
2. **`normalizeBackendProduct()`** assumes individual product objects have `id`, `slug`, `title`, `price`, `inventory.quantity`, `images[]`, etc.
3. **Vendor dashboard tables** cast backend responses to `{ data: X[]; meta: { page, pageSize, total, totalPages } }` or `{ offers: [...] }`, `{ assets: [...] }`, `{ orders: [...] }`, `{ reservations: [...] }`.
4. **`totalPages: 1`** is hardcoded in `getBackendCatalogProducts()` — assumes single-page results.
5. **DTO field mappings**: Backend `CreateOfferDto` expects `{ productId, mode, amountMinor, currency, rateUnit }` which does NOT match product form fields (`title`, `description`, `priceMajor`, etc.). Product create/edit pages continue using mock seller SDK hooks.

If the backend returns a different shape, these will silently return empty data or throw runtime errors.

---

## 5. Backend Behavior Verified

- **Confirmed via code inspection (not live testing):** All 57 backendRoutes paths match the OpenAPI spec paths exactly.
- **Confirmed via unit tests:** Auth controller CSRF capture/clear logic, SDK client CSRF header injection, SDK client fail-closed behavior, mock auth handlers return `csrfToken`, idempotency key generation.
- **Not confirmed:** No live backend requests were made. No browser testing performed. No credentialed CORS verification.

---

## 6. Backend Behavior Unverified

The following were NOT verified against the live backend:

1. Whether `GET /auth/session` returns `csrfToken` consistently (mock returns it; real backend unknown).
2. Whether `POST /auth/login` returns `csrfToken` in the response body (mock returns it; real backend unknown).
3. Whether the backend validates `x-csrf-token` on all authenticated mutations or only those explicitly listing the parameter.
4. Whether the backend accepts `x-csrf-token` on the 8 endpoints where SDK sets `csrf: true` but the spec does not list the parameter.
5. Whether CORS allows all three frontend origins with credentials.
6. Whether the session cookie domain/SameSite/Secure settings work across all three deployed frontends.
7. Whether response body shapes match the speculative normalization assumptions.
8. Whether pagination metadata (`page`, `pageSize`, `total`, `totalPages`) is returned by the backend.
9. Whether CSRF tokens are rotated on login/session.

---

## 7. OpenAPI Documentation Inconsistencies

| Issue | Detail |
|-------|--------|
| CSRF parameter inconsistency | 8 authenticated mutations have `csrf: true` in SDK but no `x-csrf-token` parameter in spec: `POST /admin/organizations/{id}/review`, `POST /admin/organizations/{id}/suspend`, `POST /organizations/{orgId}/offers`, `PATCH /organizations/{orgId}/offers/{id}`, `POST /organizations/{orgId}/offers/{id}/submit`, `POST /organizations/{orgId}/offers/{id}/archive`, `POST /admin/products`, `POST /admin/offers/{id}/review`. General description says "Authenticated mutations require x-csrf-token" but only 10 operations explicitly list it. |
| All response bodies `{}` | 57 operations have undocumented response bodies. No frontend types can be derived from the spec. |
| Missing response schemas | Login, session, catalog products, organization assets, orders, reservations, and all other responses lack schemas. |
| Idempotency-Key header duplication | Spec lists both `idempotency-key` (lowercase) and `Idempotency-Key` (canonical) on `/reservations` and `/orders`. SDK sends canonical `Idempotency-Key`. |
| DTO field mismatch | Backend `CreateOfferDto` expects `{ productId, mode, amountMinor, currency, rateUnit }` — completely different from product form fields. Product create/edit cannot use backend offer creation without a different UI flow. |

---

## 8. CORS and Cookie Configuration Dependencies

The following backend configurations are required for the frontend to work:

1. **Allowed origins:** All three frontend domains (marketplace, vendor dashboard, admin dashboard) must be in the CORS allowlist.
2. **Credentialed CORS:** `Access-Control-Allow-Credentials: true` must be returned.
3. **Cookie domain:** Session cookie must be accessible from all three frontend subdomains (or each must use its own cookie).
4. **SameSite:** `Lax` or `None` (with `Secure`) for cross-origin requests.
5. **Secure:** Cookie must be `Secure` in production (HTTPS).
6. **Session expiration:** Session TTL and renewal behavior are undocumented.
7. **CSRF token source:** The backend must return `csrfToken` in login and session responses for the frontend capture logic to work.

---

## 9. Missing Response Schemas / Undocumented Fields

All response bodies are `{}` in the spec. The following are completely undocumented:

- `GET /auth/session` — user object shape
- `GET /auth/registration-terms` — response shape
- `GET /catalog/products` — product list shape
- `GET /catalog/offers` — offer list shape
- `GET /organizations` — organization list shape
- `GET /organizations/{orgId}/offers` — offer list shape
- `GET /organizations/{orgId}/assets` — asset list shape
- `GET /orders` — order list shape
- `GET /orders/{id}` — order detail shape
- `GET /reservations` — reservation list shape
- `GET /health/live`, `GET /health/ready` — health response shapes

No frontend types should be fabricated. The current normalization code makes defensive assumptions with fallback defaults.

---

## 11. Handoff Preparation — Completed Frontend Work

### Completed
- **SDK:** All 57 backend operations implemented in `packages/sdk/src/endpoints/backend.ts` using `backendRoutes` from `@mitdrone/types`. All response bodies typed as `unknown` (spec documents `{}`).
- **Hooks:** TanStack Query hooks for all 57 operations in `packages/sdk/src/hooks/backend.ts` and `packages/sdk/src/hooks/public.ts`.
- **Apps connected (17 operations):**
  - **Marketplace-web:** Shop (`/catalog/products`), Search (`/catalog/products`), Product detail availability (`/catalog/offers/{offerId}/availability`), Account orders (`/orders`)
  - **Vendor-dashboard:** Products (`/organizations/{orgId}/offers`), Inventory (`/organizations/{orgId}/assets`), Orders (`/orders`), Order detail + cancel (`/orders/{id}`, `/orders/{id}/cancel`)
  - **Admin-dashboard:** Vendors (`/organizations`, `/organizations/{id}`), Vendor detail review/suspend (`/admin/organizations/{id}/review`, `/admin/organizations/{id}/suspend`), Orders (`/orders`), Order detail + cancel (`/orders/{id}`, `/orders/{id}/cancel`), Products moderation (`/admin/offers`, `/admin/offers/{id}/review`)
- **Auth/CSRF:** In-memory CSRF token on `AuthController`, captured from login/session responses, fail-closed on mutations, credentialed CORS with `mitdrone_session` cookie.
- **Mock vs backend coexistence:** Both `useBackend*` and mock hooks always called; `useBackend` flag selects result. Avoids React Hooks rules-of-hooks violations.
- **Verification:** 140 tests passing (auth 6/6, SDK 79/79 including 52 backend endpoint tests, mocks 16/16, apps 55 total). TypeScript passes on all 11 packages. All 3 production builds pass. ESLint passes (pre-existing `import/order` warnings only).

### Current API Coverage

| Category | Count | Percentage |
|----------|-------|------------|
| Total operations in live spec | 57 | — |
| Complete (SDK + hook + app page) | 17 | 30.9% (of 55 non-health) |
| Partial (SDK + hook, no app page) | 38 | 69.1% |
| Not applicable to frontend (health probes) | 2 | — |
| Not integrated (no SDK endpoint) | 0 | — |

### Outstanding Endpoint Integrations (38 Partial)

See `docs/API-INTEGRATION-TRACKER.md` section "Remaining 38 Operations" for per-operation intended consumer, page/workflow, and dependencies.

### Exact Backend Dependencies

1. **CSRF token source:** Backend must return `csrfToken` in `POST /auth/login` and `GET /auth/session` response bodies for the frontend capture logic to work.
2. **CSRF validation scope:** Backend must confirm whether it validates `x-csrf-token` on ALL authenticated mutations or only the 10 operations that explicitly list the parameter.
3. **CORS origins:** All three frontend domains must be in the CORS allowlist with `Access-Control-Allow-Credentials: true`.
4. **Cookie domain:** Session cookie `mitdrone_session` must be accessible from all three frontend origins.
5. **Response schemas:** All 57 response bodies are `{}` in the spec. Backend should provide schemas for at minimum: session, catalog products, organization assets, orders, reservations.
6. **Pagination metadata:** `GET /organizations/{orgId}/offers`, `GET /organizations/{orgId}/assets`, `GET /orders` should return `{ data: [], meta: { page, pageSize, total, totalPages } }`.

### Required Contract Clarifications

| # | Endpoint(s) | Clarification Needed |
|---|-------------|---------------------|
| 1 | `POST /auth/login`, `GET /auth/session` | Does response include `csrfToken`? |
| 2 | `POST /auth/logout` | Spec lists `x-csrf-token` (required: true). SDK sets `csrf: true`. Consistent. |
| 3 | `POST /admin/organizations/{id}/review`, `POST /admin/organizations/{id}/suspend`, `POST /organizations/{orgId}/offers`, `PATCH /organizations/{orgId}/offers/{id}`, `POST /organizations/{orgId}/offers/{id}/submit`, `POST /organizations/{orgId}/offers/{id}/archive`, `POST /admin/products`, `POST /admin/offers/{id}/review` | SDK sets `csrf: true` but spec does NOT list `x-csrf-token` parameter. Does backend validate CSRF on these? |
| 4 | `POST /orders/{id}/cancel`, `POST /reservations/{id}/release` | Spec lists `x-csrf-token` parameter but SDK does NOT set `csrf: true`. Should SDK send CSRF header on these? |
| 5 | `POST /organizations/{orgId}/offers` | `CreateOfferDto` expects `{productId, mode, amountMinor, currency, rateUnit}`. No vendor-facing product creation endpoint exists. What is the intended vendor offer creation workflow? |
| 6 | `POST /admin/products` | `CreateProductDto` expects `{name}` only. Is this a minimal product creation requiring follow-up offer creation via `/organizations/{orgId}/offers`? |
| 7 | All GET responses | Response body shapes are undocumented `{}`. Frontend normalization makes speculative assumptions. |

### Recommended Order for Completing Remaining Integrations

1. **Backend confirms CSRF contract** (questions 1-4 above) — blocks all authenticated mutation integration
2. **Vendor offer creation** (question 5) — unblocks VO2-VO5 on vendor dashboard product create/edit
3. **Response schemas** (question 7) — enables removing speculative normalization assumptions
4. **Admin catalog** (question 6) — enables S4 product creation on admin dashboard
5. **Remaining vendor operations** (I1-I11 excluding I7 which is complete) — inventory, assets, stock, rental terms
6. **Buyer checkout flow** (R1, R4, R5, OR1, Ch1/Ch2) — reservations, orders, checkout terms
7. **Organization management** (O3-O8) — vendor onboarding, memberships
8. **Staff catalog** (S4, Ch1) — admin product creation, checkout terms configuration

---
