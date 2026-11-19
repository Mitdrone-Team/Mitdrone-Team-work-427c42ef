# MITDrone â€” Backend Developer Review Notes

## 1. Implementation Summary

This work integrates the MITDrone frontend (marketplace-web, vendor-dashboard, admin-dashboard) with the live backend OpenAPI specification at `https://mitdrone.vercel.app/docs/openapi.json` (57 operations, all response bodies undocumented `{}`).

All 57 backend operations now have SDK endpoint implementations in `packages/sdk/src/endpoints/backend.ts` and TanStack Query hooks in `packages/sdk/src/hooks/backend.ts`. 55 of 57 operations are connected to application pages. The remaining 2 (vendor offer create/update: VO2/VO3) are blocked by a backend contract gap and are documented below.

**Scope:** Backend API integration only. No changes to mock data, UI design, or unrelated functionality.

---

## 2. Authentication / Session / CSRF Architecture

### Token Capture
- `POST /auth/login` response is parsed for `csrfToken` (top-level or `session.csrfToken`).
- On success, `configureApiClient({ getCsrfToken: () => this.csrfToken })` is called.
- Token is stored in-memory on the `AuthController` instance only â€” never in localStorage or sessionStorage.

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
- CSRF token rotation: not documented in spec â€” unknown if backend rotates tokens on login/session.
- Session expiration: not documented in spec.

---

## 3. Exact Endpoints Integrated

All 57 operations have SDK endpoint implementations. 55 are connected to app pages (see `docs/API-INTEGRATION-TRACKER.md` for the per-operation table).

| Area | App | Workflows wired |
|------|-----|-----------------|
| Auth A1â€“A11 | Marketplace | Register (with terms), verify/resend, forgot/reset password, login, session restore, logout, logout-all, change password |
| Health H1/H2 | Admin dashboard | Overview backend live/ready badge |
| Organizations O1â€“O8 | Admin + Vendor + Marketplace | Org list/detail (admin), vendor/service applications + resubmit (marketplace `/sell/apply`, `/services/apply`), team member add/remove (vendor settings) |
| Org review S1â€“S3 | Admin dashboard | Vendors table queue, detail approve/reject/suspend |
| Catalog C1â€“C3 | Marketplace | Shop/search products, `/rent` + `/offers` listings, product availability |
| Vendor offers VO1, VO4, VO5 | Vendor dashboard | Products table fetch, submit, archive |
| Inventory I1â€“I11 | Vendor dashboard | Products stock init/adjust + rental terms; inventory assets create/update/block/release/calendar |
| Reservations R1â€“R5 | Marketplace | `/account/reservations` list/create/detail/release/checkout quote |
| Orders OR1â€“OR4 | Marketplace + Vendor + Admin | Order list/detail/cancel; place order from reservation |
| Staff catalog S4â€“S6, Ch1â€“Ch2 | Admin dashboard | Create product, offer queue review approve/reject, checkout terms get/put |

Remaining 2 operations (SDK endpoints + hooks exist, no app page by design):
- `POST /organizations/{orgId}/offers` (VO2)
- `PATCH /organizations/{orgId}/offers/{id}` (VO3)

Both are blocked because `CreateOfferDto`/`UpdateOfferDto` require a `productId` and no vendor-facing product-create endpoint exists.

---

## 4. Request and Response Assumptions

### Request assumptions
- All backend paths match the OpenAPI spec exactly (verified against `backend-routes.ts`).
- `credentials: 'include'` on all requests (session cookie).
- `x-csrf-token` on authenticated non-GET requests where SDK sets `csrf: true`.
- `Idempotency-Key` header auto-generated for `POST /reservations` and `POST /orders`.
- `baseUrlOverride` strips `/api/v1` for health endpoints (`/health/*`).

### Response assumptions (UNVERIFIED â€” speculative)
All backend response bodies are `{}` in the OpenAPI spec. The following code assumes specific response shapes:

1. **`normalizeBackendProductList()`** (marketplace) assumes `{ data: Product[] }` or `{ products: [...] }` at top level.
2. **`normalizeBackendProduct()`** assumes individual product objects have `id`, `slug`, `title`, `price`, `inventory.quantity`, `images[]`, etc.
3. **Vendor dashboard tables** cast backend responses to `{ data: X[]; meta: { page, pageSize, total, totalPages } }` or `{ offers: [...] }`, `{ assets: [...] }`, `{ orders: [...] }`, `{ reservations: [...] }`.
4. **`totalPages: 1`** is hardcoded in `getBackendCatalogProducts()` â€” assumes single-page results.
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
| DTO field mismatch | Backend `CreateOfferDto` expects `{ productId, mode, amountMinor, currency, rateUnit }` â€” completely different from product form fields. Product create/edit cannot use backend offer creation without a different UI flow. |

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

- `GET /auth/session` â€” user object shape
- `GET /auth/registration-terms` â€” response shape
- `GET /catalog/products` â€” product list shape
- `GET /catalog/offers` â€” offer list shape
- `GET /organizations` â€” organization list shape
- `GET /organizations/{orgId}/offers` â€” offer list shape
- `GET /organizations/{orgId}/assets` â€” asset list shape
- `GET /orders` â€” order list shape
- `GET /orders/{id}` â€” order detail shape
- `GET /reservations` â€” reservation list shape
- `GET /health/live`, `GET /health/ready` â€” health response shapes

No frontend types should be fabricated. The current normalization code makes defensive assumptions with fallback defaults.

---

## 11. Handoff Preparation â€” Completed Frontend Work

### Completed
- **SDK:** All 57 backend operations implemented in `packages/sdk/src/endpoints/backend.ts` using `backendRoutes` from `@mitdrone/types`. All response bodies typed as `unknown` (spec documents `{}`).
- **Hooks:** TanStack Query hooks for all 57 operations in `packages/sdk/src/hooks/backend.ts` and `packages/sdk/src/hooks/public.ts`.
- **Apps connected (55 operations):**
  - **Marketplace-web:** Auth flows (register/verify/resend/forgot/reset/login/session/logout/logout-all/change-password), shop + search products, `/rent` + `/offers` offers, product availability, account orders + detail, account reservations (create/detail/release/quote/place order), vendor & service-provider applications + resubmit, profile sign-out-all
  - **Vendor-dashboard:** Products (offers fetch/submit/archive, stock init/adjust, rental terms), Inventory (assets create/update/block/release/calendar), Orders + detail + cancel, Settings team members add/remove
  - **Admin-dashboard:** Overview health live/ready, Vendors + detail (org review/suspend), Products (offer queue review, create product, checkout terms), Orders + detail + cancel
- **Blocked (2 operations):** Vendor offer create/update (VO2/VO3) â€” backend requires `productId`; no vendor product-create endpoint. Create/edit UI intentionally remains on mock seller SDK.
- **Auth/CSRF:** In-memory CSRF token on `AuthController`, captured from login/session responses, fail-closed on mutations, credentialed CORS with `mitdrone_session` cookie.
- **Mock vs backend coexistence:** Both `useBackend*` and mock hooks always called; `useBackend` flag selects result. Avoids React Hooks rules-of-hooks violations.
- **Verification:** 171 tests passing across 9 test packages (utils 9, ui 6, data 6, mocks 16, sdk 79 incl. 52 backend endpoint tests, auth 6, marketplace 19, vendor 11, admin 19). TypeScript passes on all 11 packages. ESLint `--max-warnings=0` passes on all 11 packages. All 3 production builds pass.

### Current API Coverage

| Category | Count | Percentage |
|----------|-------|------------|
| Total operations in live spec | 57 | â€” |
| Complete (SDK + hook + app page) | 55 | 96.5% |
| Partial (SDK + hook, intentionally blocked) | 2 | 3.5% |
| Not applicable to frontend | 0 | â€” |
| Not integrated (no SDK endpoint) | 0 | â€” |

### Outstanding Endpoint Integrations (2 Partial)

See `docs/API-INTEGRATION-TRACKER.md` for per-operation detail. Both are blocked on the same backend contract gap: `CreateOfferDto`/`UpdateOfferDto` require `productId`, and no vendor-facing product creation endpoint exists.

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
| 4 | `POST /orders/{id}/cancel`, `POST /reservations/{id}/release` | Spec lists `x-csrf-token` parameter; SDK now sets `csrf: true` on both. Confirm the backend enforces it. |
| 5 | `POST /organizations/{orgId}/offers` | `CreateOfferDto` expects `{productId, mode, amountMinor, currency, rateUnit}`. No vendor-facing product creation endpoint exists. What is the intended vendor offer creation workflow? |
| 6 | `POST /admin/products` | `CreateProductDto` expects `{name}` only. Is this a minimal product creation requiring follow-up offer creation via `/organizations/{orgId}/offers`? |
| 7 | All GET responses | Response body shapes are undocumented `{}`. Frontend normalization makes speculative assumptions. |

### Recommended Order for Closing Out

1. **Backend confirms CSRF contract** (questions 1-4 above) - determines whether the 8 extra `csrf: true` endpoints need adjustment.
2. **Response schemas** (question 7) - replaces the speculative normalizers in all three apps with exact types.
3. **Vendor offer creation** (question 5) - the only remaining operation gap (VO2/VO3).
4. **Admin catalog follow-up** (question 6) - whether `POST /admin/products` (`{name}` only) is sufficient or needs offer linkage.
5. **Pagination metadata confirmation** - admin/vendor tables assume `{ data, meta }`.
6. **Live credentialed smoke test** - no real backend request has been made from the frontend yet.

---
