# Improved EOR Platform Implementation Plan

## Objectives
- Deliver a production-ready modular monolith MVP on Node.js + Next.js + PostgreSQL.
- Preserve enterprise upgrade paths (event-driven integrations, advanced compliance, payment rails).
- Keep tenant isolation and auditability as hard constraints from day one.

## Key Architecture Upgrades Over Original Plan
- Domain-driven module boundaries: `auth`, `org`, `people`, `contracts`, `payroll`, `leave`, `contractors`, `billing`, `reporting`, `platform`.
- Transactional outbox via `DomainEvent` table: all critical writes can emit events in the same DB transaction.
- Service-layer-first architecture: API routes are thin wrappers around domain services.
- Monetary values in minor units (`BigInt`) for deterministic payroll and billing calculations.
- Multi-tenant security centralized with explicit org-resolution and tenant guards.
- Operational resilience:
  - Dedicated event worker (`src/workers/domain-events-worker.cjs`)
  - Queue abstraction with Redis/BullMQ fallback to inline mode
  - Structured audit logging on mutating operations

## Data Model Changes and Rationale
- Added `DomainEvent` and `IdempotencyKey` to support reliable async workflows and safe retries.
- Extended system models for:
  - `Integration`, `WebhookSubscription`, `IntegrationLog`
  - Richer `AuditLog` metadata
  - Full role/permission graph (`Role`, `Permission`, `RolePermission`, `UserRole`)
- Standardized payroll/billing money fields as `*Minor` bigints to prevent floating-point drift.

## Execution Model
- Synchronous request path:
  1. Route validation and permission check
  2. Domain service execution in transaction
  3. Audit + outbox event persistence
  4. API response
- Asynchronous path:
  1. Worker consumes pending `DomainEvent`
  2. Integration/webhook side effects logged in `IntegrationLog`
  3. Retries and dead-letter state handled via event status transitions

## Security and Governance
- JWT session cookies (`HttpOnly`, `SameSite=Lax`, secure in prod).
- Login lockout after repeated failures.
- Permission-gated API routes.
- Tenant isolation at service boundary (`resolveOrganizationId`, `requireOrganizationAccess`).
- Optional AES-256-GCM field encryption utility for sensitive values.

## Delivery Phasing (Revised)
- Phase 1: Core platform and security foundation (completed in this build).
- Phase 2: Employee/contract lifecycle and onboarding automation (completed for MVP scope).
- Phase 3: Payroll and tax rule execution engine with approvals and payslips (completed for MVP scope).
- Phase 4: Leave, contractor lifecycle, and billing automation (completed for MVP scope).
- Phase 5: Reporting, admin controls, event worker, and architecture hardening (completed for MVP scope).

## Deferred Enhancements (Explicitly Future)
- External payment rail execution (Wise/Bank API).
- Region-specific legal pack expansion and policy packs.
- Deep MFA lifecycle, SSO/SAML, and enterprise SCIM provisioning.
- Full OpenAPI contract generation and typed SDK distribution.
- Advanced observability stack (metrics/traces/log correlation dashboards).
