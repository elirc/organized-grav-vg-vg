# Senior Engineering Explanation: `src/services/leave.service.js`

## Ownership and Intent
This file owns core domain behavior. It is where business invariants, transaction boundaries, and side effects must be coordinated coherently.

## How the Implementation Works
The file is structured around explicit module responsibilities and clear entry points. Import dependencies define collaboration boundaries, while exported symbols provide the public contract consumed by other layers.

Detected imports:
- date-fns
- @/lib/db
- @/lib/errors
- @/lib/audit
- @/lib/events
- @/services/context

Detected exports / entry points:
- listLeavePolicies
- createLeavePolicy
- listLeaveBalances
- listLeaveRequests
- createLeaveRequest
- decideLeaveRequest



## Code-Level Structure
Approximate line count: 323

Top-level declarations (module/global scope candidates):
- None detected in this file.

Function-level structure:
- toDecimal(value) -> function declaration, internal
- totalLeaveDays(startDate, endDate) -> function declaration, internal
- async listLeavePolicies(user, organizationId = null) -> function declaration, exported
- async createLeavePolicy(user, payload, requestMeta = {}) -> function declaration, exported
- async listLeaveBalances(user, employeeId = null) -> function declaration, exported
- async listLeaveRequests(user, filters = {}) -> function declaration, exported
- async createLeaveRequest(user, payload, requestMeta = {}) -> function declaration, exported
- async decideLeaveRequest(user, requestId, payload, requestMeta = {}) -> function declaration, exported

## Scope and State Model
Scope analysis:
- Scope usage is conventional: constants and helpers in module scope, request-specific values inside function scope.

State concepts observed:
- None detected in this file.

## Control Flow and Side Effects
Control-flow profile:
- Conditional branching is used to encode domain/path logic (if-count approx: 15).
- Failures are surfaced with typed application errors, preserving stable API error semantics.

Observed side effects:
- database I/O through Prisma
- domain event outbox side effects

## Why It Is Implemented This Way
Design choices in this file prioritize explicit contracts, predictable side effects, and maintainable layering. This helps the team evolve behavior without hidden coupling.

Cross-cutting concerns currently present:
- transactional consistency
- audit logging
- domain event emission

## Safe Extension Guidance
- Keep business rules in the owning layer (service layer for domain policy, route layer for transport policy, UI layer for interaction policy).
- Preserve existing exported contracts when possible; when changes are required, update all call sites in the same change set.
- Keep module-scope mutable state minimal and intentional; prefer explicit factories for complex lifecycle state.
- For stateful UI files, keep pending/error/success transitions explicit and deterministic.
- For backend files with side effects, maintain idempotency and transactional coherence to avoid partial writes.
