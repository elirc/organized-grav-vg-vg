# Senior Engineering Explanation: `src/app/api/reports/payroll-summary/route.js`

**Contract:** `GET /api/reports/payroll-summary`, permission `reports.view`. The last 24 runs and
summed totals (`src/services/report.service.js:40-68`).

## Review notes

- `runs` carry `BigInt` totals, so the response fails once a run is calculated; `totals` are
  plain numbers.

## Check

**Check:** with no calculated runs, `totals` is `{ gross: 0, net: 0, employerCost: 0 }`.
