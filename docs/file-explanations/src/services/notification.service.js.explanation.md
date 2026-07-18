# Senior Engineering Explanation: `src/services/notification.service.js`

## Ownership and Intent
This file owns core domain behavior. It is where business invariants, transaction boundaries, and side effects must be coordinated coherently.

## How the Implementation Works
The file is structured around explicit module responsibilities and clear entry points. Import dependencies define collaboration boundaries, while exported symbols provide the public contract consumed by other layers.

Detected imports:
- @/lib/db
- @/services/context
- @/lib/queue

Detected exports / entry points:
- createNotification
- listNotifications
- markNotificationRead
- markAllNotificationsRead
- getOrganizationUsers



## Code-Level Structure
Approximate line count: 85

Top-level declarations (module/global scope candidates):
- None detected in this file.

Function-level structure:
- async createNotification({
  userId, type = "IN_APP", category = "SYSTEM", title, body, actionUrl = null, }) -> function declaration, exported
- async listNotifications(user) -> function declaration, exported
- async markNotificationRead(user, id) -> function declaration, exported
- async markAllNotificationsRead(user) -> function declaration, exported
- async getOrganizationUsers(user, explicitOrganizationId = null) -> function declaration, exported

## Scope and State Model
Scope analysis:
- Scope usage is conventional: constants and helpers in module scope, request-specific values inside function scope.

State concepts observed:
- None detected in this file.

## Control Flow and Side Effects
Control-flow profile:
- Control flow is mostly linear and declarative in this file.

Observed side effects:
- database I/O through Prisma
- asynchronous job queue interactions
- user-facing notification side effects

## Why It Is Implemented This Way
Design choices in this file prioritize explicit contracts, predictable side effects, and maintainable layering. This helps the team evolve behavior without hidden coupling.

Cross-cutting concerns currently present:
- notification dispatch

## Safe Extension Guidance
- Keep business rules in the owning layer (service layer for domain policy, route layer for transport policy, UI layer for interaction policy).
- Preserve existing exported contracts when possible; when changes are required, update all call sites in the same change set.
- Keep module-scope mutable state minimal and intentional; prefer explicit factories for complex lifecycle state.
- For stateful UI files, keep pending/error/success transitions explicit and deterministic.
- For backend files with side effects, maintain idempotency and transactional coherence to avoid partial writes.
