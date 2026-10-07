# Senior Engineering Explanation: `prisma/schema.prisma`

**Role:** the data model: 39 models and their enums, PostgreSQL datasource from `DATABASE_URL`
(`:5-8`).

## Map of the file

- Enums (`:10-250`): statuses for organizations, users, employment, onboarding, contracts,
  payroll runs and items, invoices, events and more.
- Tenancy and identity: `Organization` (`:252-296`), `User` (`:298-340`), `Role`,
  `Permission`, `RolePermission`, `UserRole` (`:342-392`), `Invitation`.
- People: `Employee` (`:414-455`), `OnboardingChecklist`, `Compensation` (`:468-484`),
  `Contractor`, `ContractorInvoice`.
- Contracts: `ContractTemplate` (`:533-551`), `Contract`.
- Payroll: `PayrollRun` (`:589-614`), `PayrollItem` (`:616-653`), `TaxRule` (`:655-671`),
  `ExchangeRate`.
- Benefits, leave (`:743-809`), time entries, compliance, billing (`:875-913`), documents,
  notifications, integrations, audit, terminations, `DomainEvent` (`:1065-1084`),
  `IdempotencyKey` (`:1086-1097`).

## Design points worth knowing

- Money is `BigInt` minor units everywhere; leave days and rates are `Decimal`.
- Tenant-owned tables carry `organizationId` with `onDelete: Cascade`; audit, events and
  integration logs use `SetNull` so history survives a deleted tenant.
- Useful uniques: one item per employee per run (`:651`), one run per tenant and period
  (`:612`), one balance per employee and policy (`:781`), template versions (`:549`).

## Review notes

- `Organization.billingEmail` (`:261`) is not unique, but `prisma/seed.js:157-158` upserts on it.
- `TaxRule` and `PricingPlan` are global; there is no per-tenant override or plan assignment.
- About fifteen models have no code behind them (listed in `docs/improved-implementation-plan.md`).
- No `prisma/migrations/`; the schema is applied with `db push`.

## Check

**Check:** `npx prisma validate` passes, and `npx prisma format` produces no diff.
