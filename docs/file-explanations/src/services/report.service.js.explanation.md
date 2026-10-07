# Senior Engineering Explanation: `src/services/report.service.js`

**Role:** headcount, payroll summary, turnover, and the platform admin's cross-tenant summary.

## Walkthrough

- `headcountReport` (`:4-38`): `groupBy` country and department for current employees.
- `payrollSummaryReport` (`:40-68`): last 24 runs and their summed totals.
- `turnoverReport` (`:70-103`): hires by `createdAt`, terminations by `status = TERMINATED` and
  `updatedAt`, optionally in a date range.
- `platformAdminSummary` (`:105-134`): counts across all tenants; `null` for anyone else.

## Review notes

- Totals are summed as `Number` (`:55-57`), losing precision above 2^53 minor units.
- Runs of every status are summed, so draft and recalculated runs inflate the totals.
- "Hires" counts rows created in the period, not `startDate`; CSV imports and conversions all
  count as hires on the day they ran. "Terminations" uses `updatedAt`, so any later edit to a
  terminated employee moves their termination date.
- `reports.export` exists as a permission, but there is no export.

## Check

**Goal:** see the `updatedAt` problem. **Check:** terminate an employee, run the turnover report
for this month (1 termination), edit that employee's phone number next month, and run next
month's report: it now counts the termination again.
