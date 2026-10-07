# Senior Engineering Explanation: `src/app/api/billing/plan/route.js`

**Contract:** `GET /api/billing/plan`, permission `billing.view`. Returns all active pricing
plans (`src/services/billing.service.js:6-15`).

## Review notes

- The route name is singular but it returns a list, and there is no per-organization plan to
  return; plans are global.
- Plan rows have `BigInt` prices, so this response has the same serialization issue as invoices.

## Check

**Check:** `GET /api/billing/plan` as the client admin returns the seeded "Growth" plan once
BigInt serialization is handled.
