# Senior Engineering Explanation: `src/app/(app)/reports/page.js`

**Role:** `/reports`: headcount by country, payroll totals, turnover and recent runs.

## Walkthrough

- `:6-10` three reports in parallel.
- `:33-35` and `:65-66` format money with `Number(...) / 100` and `.toFixed(2)`.

## Review notes

- No `reports.view` check; throws for the platform admin.
- Department grouping is computed (`src/services/report.service.js:20-31`) but not displayed.

## Check

**Check:** the "Recent Payroll Runs" table has one row per run, up to 24.
