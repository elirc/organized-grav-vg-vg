# Senior Engineering Explanation: `src/app/(app)/billing/page.js`

**Role:** `/billing`: plans and the tenant's invoices.

## Walkthrough

- `:7` loads plans (global) and invoices (tenant) in parallel and renders `BillingPanel`.

## Review notes

- No `billing.view` check; an `EMPLOYEE` can open it.
- Throws for the platform admin (`listInvoices(user)` without an organization).
- `BigInt` money columns are passed as props to a client component; React's RSC serializer
  supports `BigInt`, which is why this page works while the JSON API for the same data does not.

## Check

**Check:** after generating an invoice, `/billing` shows it with subtotal `1039` for the seeded
Growth plan and one active employee.
