# Senior Engineering Explanation: `src/services/payroll.service.js`

## Ownership and Intent
This file owns core domain behavior. It is where business invariants, transaction boundaries, and side effects must be coordinated coherently.

## How the Implementation Works
The file is structured around explicit module responsibilities and clear entry points. Import dependencies define collaboration boundaries, while exported symbols provide the public contract consumed by other layers.

Detected imports:
- node:fs
- node:path
- pdfkit
- @/lib/db
- @/lib/errors
- @/lib/money
- @/lib/audit
- @/lib/events
- @/services/context
- @/services/notification.service

Detected exports / entry points:
- listPayrollRuns
- getPayrollRun
- listPayrollItems
- createPayrollRun
- calculatePayrollRun
- approvePayrollRun
- processPayrollRun



## Code-Level Structure
Approximate line count: 656

Top-level declarations (module/global scope candidates):
- None detected in this file.

Function-level structure:
- asBigInt(value) -> function declaration, internal
- toMajor(minor) -> function declaration, internal
- computeProgressiveTax(brackets, taxableMajor) -> function declaration, internal
- computeTaxForRule(rule, taxableMinor, ytdMinor) -> function declaration, internal
- async loadCurrentCompensation(employeeId, periodEnd) -> function declaration, internal
- async loadYtd(employeeId, organizationId, periodStart) -> function declaration, internal
- ensureStorageDir() -> function declaration, internal
- async generatePayslip(item, employee, run) -> function declaration, internal
- async listPayrollRuns(user, organizationId = null) -> function declaration, exported
- async getPayrollRun(user, id) -> function declaration, exported
- async listPayrollItems(user, runId) -> function declaration, exported
- async createPayrollRun(user, payload, requestMeta = {}) -> function declaration, exported
- async calculatePayrollRun(user, runId, requestMeta = {}) -> function declaration, exported
- async approvePayrollRun(user, runId, requestMeta = {}) -> function declaration, exported
- async processPayrollRun(user, runId, requestMeta = {}) -> function declaration, exported

## Scope and State Model
Scope analysis:
- Scope usage is conventional: constants and helpers in module scope, request-specific values inside function scope.

State concepts observed:
- None detected in this file.

## Control Flow and Side Effects
Control-flow profile:
- Structured error boundaries are present (try: 1, catch: 1).
- Conditional branching is used to encode domain/path logic (if-count approx: 15).
- Iterative control flow is present for batch or aggregation behavior (loop-count approx: 4).
- Failures are surfaced with typed application errors, preserving stable API error semantics.

Observed side effects:
- database I/O through Prisma
- filesystem reads/writes
- user-facing notification side effects
- domain event outbox side effects

## Why It Is Implemented This Way
Design choices in this file prioritize explicit contracts, predictable side effects, and maintainable layering. This helps the team evolve behavior without hidden coupling.

Cross-cutting concerns currently present:
- transactional consistency
- audit logging
- domain event emission
- notification dispatch
- money math using minor units

## Safe Extension Guidance
- Keep business rules in the owning layer (service layer for domain policy, route layer for transport policy, UI layer for interaction policy).
- Preserve existing exported contracts when possible; when changes are required, update all call sites in the same change set.
- Keep module-scope mutable state minimal and intentional; prefer explicit factories for complex lifecycle state.
- For stateful UI files, keep pending/error/success transitions explicit and deterministic.
- For backend files with side effects, maintain idempotency and transactional coherence to avoid partial writes.
