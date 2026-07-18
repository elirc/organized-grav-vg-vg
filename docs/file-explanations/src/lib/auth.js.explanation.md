# Senior Engineering Explanation: `src/lib/auth.js`

## Ownership and Intent
This file provides shared infrastructure primitives. Its contracts are reused widely, so compatibility discipline is important.

## How the Implementation Works
The file is structured around explicit module responsibilities and clear entry points. Import dependencies define collaboration boundaries, while exported symbols provide the public contract consumed by other layers.

Detected imports:
- next/headers
- jose
- @/lib/db
- @/lib/errors

Detected exports / entry points:
- createSessionToken
- setSession
- clearSession
- readSessionFromRequest
- readSessionFromCookies
- normalizeUserContext
- getRequestUser
- getServerUser
- hasRole
- hasPermission
- requirePermission
- requireAuth



## Code-Level Structure
Approximate line count: 175

Top-level declarations (module/global scope candidates):
- const SESSION_COOKIE -> `const SESSION_COOKIE = "vg_session";`
- const MAX_AGE_SECONDS -> `const MAX_AGE_SECONDS = 60 * 60 * 8;`

Function-level structure:
- getAuthSecret() -> function declaration, internal
- async loadUserContext(userId) -> function declaration, internal
- async createSessionToken(payload) -> function declaration, exported
- async setSession(response, payload) -> function declaration, exported
- clearSession(response) -> function declaration, exported
- async readSessionFromRequest(request) -> function declaration, exported
- async readSessionFromCookies() -> function declaration, exported
- normalizeUserContext(user) -> function declaration, exported
- async getRequestUser(request) -> function declaration, exported
- async getServerUser() -> function declaration, exported
- hasRole(user, roleName) -> function declaration, exported
- hasPermission(user, permission) -> function declaration, exported
- requirePermission(user, permission) -> function declaration, exported
- requireAuth(user) -> function declaration, exported

## Scope and State Model
Scope analysis:
- Module scope declarations are used for reusable constants/helpers: SESSION_COOKIE, MAX_AGE_SECONDS.
- Session constants are module-scoped to keep auth contract names centralized and non-duplicated.

State concepts observed:
- request/session state via HTTP cookies
- configuration state sourced from environment variables

## Control Flow and Side Effects
Control-flow profile:
- Structured error boundaries are present (try: 2, catch: 2).
- Conditional branching is used to encode domain/path logic (if-count approx: 9).
- Iterative control flow is present for batch or aggregation behavior (loop-count approx: 2).
- Failures are surfaced with typed application errors, preserving stable API error semantics.

Observed side effects:
- database I/O through Prisma
- HTTP cookie mutation
- session cookie issuance/clear

## Why It Is Implemented This Way
Design choices in this file prioritize explicit contracts, predictable side effects, and maintainable layering. This helps the team evolve behavior without hidden coupling.

Cross-cutting concerns currently present:
- None detected in this file.

## Safe Extension Guidance
- Keep business rules in the owning layer (service layer for domain policy, route layer for transport policy, UI layer for interaction policy).
- Preserve existing exported contracts when possible; when changes are required, update all call sites in the same change set.
- Keep module-scope mutable state minimal and intentional; prefer explicit factories for complex lifecycle state.
- For stateful UI files, keep pending/error/success transitions explicit and deterministic.
- For backend files with side effects, maintain idempotency and transactional coherence to avoid partial writes.
