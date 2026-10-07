# Improved EOR Platform Implementation Plan

This is the author's plan for Velocity Grid. Each section keeps the original intent and adds a
**Status in code** note checked against this repository, so the plan can be read as a record of
what shipped rather than as a claim. Where a phase was marked "completed", the note says which
parts exist and which do not.

## Objectives

- Deliver a production-ready modular monolith MVP on Node.js + Next.js + PostgreSQL.
- Preserve enterprise upgrade paths (event-driven integrations, advanced compliance, payment rails).
- Keep tenant isolation and auditability as hard constraints from day one.

**Status in code:** the monolith exists (Next.js 16 App Router with route handlers and server
pages, Prisma on PostgreSQL). "Production-ready" does not hold yet: there are no tests, no
migrations folder, no CI workflow, and the defects catalogued in
[`fable/02-bugs-and-security.md`](../fable/02-bugs-and-security.md) include tenant-isolation gaps.

## Key architecture upgrades over the original plan

- **Domain module boundaries** (`auth`, `org`, `people`, `contracts`, `payroll`, `leave`,
  `contractors`, `billing`, `reporting`, `platform`).
  *Status:* realized as one service file per area in `src/services/` (`auth.service.js`,
  `org.service.js`, `employee.service.js`, `contract.service.js`, `payroll.service.js`,
  `leave.service.js`, `contractor.service.js`, `billing.service.js`, `report.service.js`,
  `dashboard.service.js`, `tax.service.js`, `notification.service.js`, `rbac.service.js`). The
  boundaries are by file only; services import each other freely (for example
  `payroll.service.js:10` imports `createNotification`).
- **Transactional outbox via `DomainEvent`.**
  *Status:* `publishDomainEvent(tx, ...)` (`src/lib/events.js:1-21`) is called inside the same
  `$transaction` as the business write in 10 places across the employee, contract, leave and
  payroll services. Contractor, billing, org and tax changes publish no events.
- **Service-layer-first, thin routes.**
  *Status:* true for the API. 41 of the 42 route files are a single `withRoute(...)` call
  (`src/lib/api.js:16`); `src/app/api/employees/import-csv/route.js` re-implements the wrapper by
  hand because it needs `formData()`.
- **Money in minor units (`BigInt`).**
  *Status:* every money column is a `*Minor` `BigInt` in the schema (for example
  `PayrollItem`, `prisma/schema.prisma:620-640`). Tax computation converts to floats and back
  (`src/services/payroll.service.js:16-18`, `:73`), so storage is deterministic but calculation
  is not.
- **Centralized tenant security** with `resolveOrganizationId` and `requireOrganizationAccess`.
  *Status:* both exist (`src/services/context.js:8-36`) and guard the primary record of each
  service call. They are not applied to secondary ids in request bodies, and server pages do not
  check permissions at all.
- **Operational resilience:** dedicated event worker, queue abstraction with Redis/BullMQ
  "fallback to inline mode", structured audit logging.
  *Status:*
  - The worker exists (`src/workers/domain-events-worker.cjs`) and records each event as an
    `IntegrationLog` row; it delivers nothing externally and never retries `FAILED` events.
  - The queue abstraction (`src/lib/queue.js`) switches on whether `REDIS_URL` is **set**, not
    on whether Redis is reachable. "Inline mode" means `enqueue` returns
    `{ queued: false, mode: "inline" }` and does nothing (`:38-47`). No consumer exists for the
    one queue that is used (`notification.dispatch`).
  - Audit logging: `writeAuditLog(tx, ...)` has 23 call sites. Tax-rule create/update and
    notification reads write none. Most calls store the raw request payload as `changes`.

## Data model changes and rationale

- Added `DomainEvent` and `IdempotencyKey` to support reliable async workflows and safe retries.
  *Status:* `DomainEvent` is used. `IdempotencyKey` (`prisma/schema.prisma:1086-1097`) is never
  read or written.
- Extended system models: `Integration`, `WebhookSubscription`, `IntegrationLog`, richer
  `AuditLog`, full role/permission graph.
  *Status:* `IntegrationLog`, `AuditLog`, `Role`, `Permission`, `RolePermission` and `UserRole`
  are used. `Integration` and `WebhookSubscription` are not.
- Standardized money fields as `*Minor` bigints.
  *Status:* done in the schema.

Models with no code behind them today: `Invitation`, `ContractorInvoice`, `ExchangeRate`,
`BenefitsPackage`, `BenefitItem`, `BenefitEnrollment`, `TimeEntry`, `CountryConfig`,
`ComplianceDocument`, `Document`, `NotificationPreference`, `Integration`,
`WebhookSubscription`, `Termination`, `IdempotencyKey`.

**Check:** for each name in that list, `grep -rn "\.<camelCaseName>\." src` (for example
`grep -rn "\.timeEntry\." src`) returns nothing.

## Execution model

Synchronous request path, as planned:

1. Route validation and permission check
2. Domain service execution in a transaction
3. Audit + outbox event persistence
4. API response

*Status:* matches the API routes (`src/lib/api.js:16-60` followed by, for example,
`src/services/employee.service.js:121-183`). Two exceptions: payroll calculation does reads
through `db` rather than the transaction client inside its transaction
(`payroll.service.js:303`, `:350`), and notifications are created after the transaction commits
(`payroll.service.js:496-520`), so a crash between the two loses the notification.

Asynchronous path, as planned:

1. Worker consumes pending `DomainEvent`
2. Integration/webhook side effects logged in `IntegrationLog`
3. Retries and dead-letter state handled via event status transitions

*Status:* steps 1 and 2 happen (with "side effect" meaning only the log row). Step 3 does not:
see the worker notes above.

## Security and governance

| Planned | Status in code |
|---|---|
| JWT session cookies (`HttpOnly`, `SameSite=Lax`, secure in prod) | Done: `src/lib/auth.js:44-58`. The secret silently defaults to a public string when `AUTH_SECRET` is unset (`:9-12`). |
| Login lockout after repeated failures | Done: 5 failures lock for 15 minutes (`src/services/auth.service.js:149-162`). The user's `status` (`LOCKED`, `DISABLED`) is never checked. |
| Permission-gated API routes | Done for API routes. Server pages bypass it. |
| Tenant isolation at the service boundary | Partial: primary ids only. Global `TaxRule` rows are editable by every tenant admin. |
| Optional AES-256-GCM field encryption | The utility exists (`src/lib/crypto.js:23-66`); `encryptField` has no callers. |

## Delivery phasing (revised), annotated

- **Phase 1: core platform and security foundation.** Marked completed. Auth, RBAC, tenancy
  resolution and the API wrapper exist. Missing: status enforcement, page-level permissions,
  config validation.
- **Phase 2: employee/contract lifecycle and onboarding.** Marked completed for MVP scope.
  Employees, checklists, compensation history, CSV import, templates and send/sign exist.
  Missing: transition guards, signer verification, invitations (model unused).
- **Phase 3: payroll and tax rules with approvals and payslips.** Marked completed for MVP scope.
  The calculate/approve/process flow and PDF payslips exist. Missing: pay-frequency handling,
  overtime/bonus/deductions (hard-coded to zero at `payroll.service.js:341-347`), tenant-owned tax
  rules, transition guards, exchange rates (model unused).
- **Phase 4: leave, contractor lifecycle, billing.** Marked completed for MVP scope. Requests,
  decisions, contractor CRUD/convert and invoice generation exist. Missing: leave accrual (no
  code writes `balanceDays`), payment collection (`stripe` unused), contractor invoices (model
  unused).
- **Phase 5: reporting, admin controls, event worker, hardening.** Marked completed for MVP scope.
  Three reports, an admin page and the worker exist. The admin page throws for the platform
  admin (`src/app/(app)/admin/page.js:11` -> `src/services/contract.service.js:50`), and the
  hardening items listed in `fable/` remain open.

## Deferred enhancements (explicitly future)

- External payment rail execution (Wise/Bank API).
- Region-specific legal pack expansion and policy packs.
- Deep MFA lifecycle, SSO/SAML, and enterprise SCIM provisioning.
- Full OpenAPI contract generation and typed SDK distribution.
- Advanced observability stack (metrics/traces/log correlation dashboards).

Items that belong on this list based on the code, though the original plan did not name them:
an automated test suite, versioned Prisma migrations, CI, startup validation of required
environment variables, pagination for list endpoints, and BigInt-safe JSON responses.

## Exercise

**Goal:** turn one "completed" phase into a verified one. Pick Phase 3. **Check:** a short list
in which every item is either a passing automated test you wrote (for example "approving a
`DRAFT` run returns 409") or an issue link, with no item backed only by reading the code.
