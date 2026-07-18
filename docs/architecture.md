# Architecture Guide

## Stack
- Runtime: Node.js
- Framework: Next.js App Router (JavaScript)
- Database: PostgreSQL via Prisma ORM
- Queue/Jobs: BullMQ + Redis (with inline fallback)
- Auth: JWT cookie sessions

## Codebase Layout
- `prisma/schema.prisma`
  - Full multi-tenant EOR schema (core, payroll, leave, billing, compliance, integrations, audit, outbox).
- `src/lib`
  - Infrastructure primitives: DB client, auth/session, API wrapper, errors, money, crypto, queue, audit, events.
- `src/services`
  - Domain business logic:
    - `auth.service.js`
    - `org.service.js`
    - `employee.service.js`
    - `contract.service.js`
    - `payroll.service.js`
    - `leave.service.js`
    - `contractor.service.js`
    - `billing.service.js`
    - `report.service.js`
    - `dashboard.service.js`
    - `tax.service.js`
- `src/app/api`
  - REST API handlers; thin layer calling services with validation + permission checks.
- `src/app/(app)`
  - Authenticated UI pages (dashboard, employees, contracts, payroll, leave, contractors, billing, reports, notifications, admin).
- `src/components/panels`
  - Client-side operational panels/forms per domain.
- `src/workers/domain-events-worker.cjs`
  - Outbox event processor.
- `docs/improved-implementation-plan.md`
  - Updated plan and architecture improvements over the original document.

## Request Lifecycle
1. Route receives request in `src/app/api/**/route.js`.
2. `withRoute` wrapper (`src/lib/api.js`) handles:
   - session resolution
   - permission checks
   - zod body validation
   - normalized success/error responses
3. Domain service executes and writes:
   - business state
   - `AuditLog`
   - `DomainEvent` (when applicable)
4. Response is returned to UI/API client.

## Multi-Tenancy Model
- Tenant key: `organizationId` on domain tables.
- Tenant control at service layer:
  - `resolveOrganizationId(...)`
  - `requireOrganizationAccess(...)`
- Platform admins can operate cross-tenant; all other roles are scoped to their org.

## RBAC Model
- Dynamic RBAC tables: `Role`, `Permission`, `RolePermission`, `UserRole`.
- Permissions use `resource.action` naming.
- API route guards specify required permission, for example:
  - `employees.view`
  - `payroll.approve`
  - `tax_rules.manage`

## Payroll Engine Design
- Main logic in `src/services/payroll.service.js`.
- Flow:
  1. Create run (`DRAFT`)
  2. Calculate:
     - load active employees + current compensation
     - apply tax rules by country
     - compute gross/tax/net per item
     - persist `PayrollItem` with YTD snapshots
     - set run `PENDING_APPROVAL`
  3. Approve run (`APPROVED`)
  4. Process run:
     - generate PDF payslip per item
     - mark items `PAID`
     - set run `COMPLETED`

## Contracts and Templates
- Templates are versioned in `ContractTemplate`.
- Contract rendering resolves merge tags from org/worker context.
- Lifecycle endpoints support create/update/send/sign and amendment chaining.

## Leave and Balances
- Policies in `LeavePolicy`.
- Requests in `LeaveRequest`.
- Running balances in `LeaveBalance`.
- Approval decisions adjust pending/used days atomically.

## Billing
- Plans in `PricingPlan`.
- Invoices in `ClientInvoice`.
- Monthly invoice generation includes:
  - base fee
  - per-employee fee
  - payroll-derived service fee

## Events and Worker
- Mutating services can write `DomainEvent`.
- Worker (`npm run worker:events`) processes pending events and records `IntegrationLog`.
- Failed events transition through retry states and eventually `DEAD_LETTER`.

## Local Runbook
1. Copy `.env.example` to `.env` and adjust values.
2. Start infra:
   - `docker compose up -d`
3. Apply schema:
   - `npm run db:push`
4. Seed data:
   - `npm run db:seed`
5. Start app:
   - `npm run dev`
6. Optional worker:
   - `npm run worker:events -- --loop`

## Seeded Accounts
- Platform admin:
  - `platform.admin@example.com`
  - `ChangeMe!123`
- Client admin:
  - `client.admin@acme-global.example`
  - `ChangeMe!123`
