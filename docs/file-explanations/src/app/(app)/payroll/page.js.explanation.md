# Senior Engineering Explanation: `src/app/(app)/payroll/page.js`

**Role:** `/payroll`: create runs and drive calculate/approve/process.

## Review notes

- No `payroll.view` check (`fable/02-bugs-and-security.md#a0`).
- Throws for the platform admin.
- Runs are shown but their items are not; there is no run detail page, although notifications
  point to `/payroll/<id>`.

## Check

**Check:** as an `EMPLOYEE`, `/payroll` renders the run table even though `GET /api/payroll`
returns 403.
