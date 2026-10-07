# Senior Engineering Explanation: `src/app/api/dashboard/route.js`

**Contract:** `GET /api/dashboard`, any authenticated user (no permission). Returns
`getDashboardData` (`src/services/dashboard.service.js:5-64`).

## Review notes

- No UI calls it; `/dashboard` uses the service directly.
- Once the latest run has totals, `lastPayrollRun` carries `BigInt` values and the JSON response
  fails.

## Check

**Check:** as the platform admin the response has `scope: "platform"`; as the client admin,
`scope: "organization"`.
