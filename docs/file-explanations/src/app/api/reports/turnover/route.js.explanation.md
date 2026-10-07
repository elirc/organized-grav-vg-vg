# Senior Engineering Explanation: `src/app/api/reports/turnover/route.js`

**Contract:** `GET /api/reports/turnover?startDate=&endDate=`, permission `reports.view`
(`src/services/report.service.js:70-103`).

## Review notes

- Without `startDate`, "hires" is the total number of employees ever created and "terminations"
  the total currently terminated.
- Invalid dates produce `Invalid Date` filters, which Prisma rejects as a 500.

## Check

**Check:** `?startDate=2000-01-01` returns the same `hires` as no query at all.
