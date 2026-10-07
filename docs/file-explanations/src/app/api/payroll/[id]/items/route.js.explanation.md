# Senior Engineering Explanation: `src/app/api/payroll/[id]/items/route.js`

**Contract:** `GET /api/payroll/:id/items`, permission `payroll.view`. Items with their employee
rows (`src/services/payroll.service.js:198-220`).

## Review notes

- No UI calls it, and every item has `BigInt` money columns.

## Check

**Check:** for a run whose period ends after the seed ran, Alex Worker's item has
`grossPayMinor = 12000000` and `totalEmployeeTaxMinor = 2400000` (the seeded 20% US rule).
