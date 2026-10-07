# Senior Engineering Explanation: `src/services/billing.service.js`

**Role:** pricing plans and monthly client invoices.

## Walkthrough

- `listPricingPlans` (`:6-15`): active plans, cheapest first.
- `listInvoices` (`:17-31`): tenant invoices with plan, newest first.
- `generateMonthlyInvoice` (`:33-114`):
  - period = the calendar month before `invoiceDate` (`:36-38`);
  - in parallel: count of `ACTIVE` and `ON_LEAVE` employees now, payroll runs starting in the
    period, the first active plan, the organization (`:40-60`);
  - base fee + per-employee fee x count + 1% of each run's employer cost (`:62-71`);
  - creates the invoice as `SENT`, due in 14 days, with three line items, plus an audit row.

## Review notes

- Every click creates another invoice for the same period: no unique constraint, no
  idempotency key.
- The plan is the first active plan in the table (`:58`); organizations have no plan.
- The employee count is today's, not the billed month's.
- Runs of any status are billed, including `DRAFT` and un-approved runs.
- `BigInt(x) / BigInt(100)` (`:65`) truncates; the service fee rounds down per run.
- Invoice currency is the organization's `defaultCurrency`, but plan amounts are in the plan's
  currency (`USD` in the seed); there is no conversion.
- The returned invoice has `BigInt` columns, so `POST /api/billing/invoices/generate` hits the
  JSON serialization problem in `src/lib/api.js`.

## Check

**Goal:** compute one invoice by hand. **Check:** with the seeded Growth plan (99000 + 4900 per
employee) and one active employee and no runs last month, the stored invoice has
`subtotalMinor = 103900` and line items `99000`, `4900`, `0`.
