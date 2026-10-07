# Senior Engineering Explanation: `src/app/api/reports/headcount/route.js`

**Contract:** `GET /api/reports/headcount`, permission `reports.view`. Grouped counts by country
and department (`src/services/report.service.js:4-38`).

## Check

**Check:** on a fresh seed, `byCountry` is `[{ employmentCountry: "US", _count: { _all: 1 } }]`.
