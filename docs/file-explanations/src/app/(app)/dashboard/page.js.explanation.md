# Senior Engineering Explanation: `src/app/(app)/dashboard/page.js`

**Role:** `/dashboard`, with a platform view and a tenant view.

## Walkthrough

- `:4-11` `MetricCard` helper.
- `:17-43` platform view: organization counts, headcount and the five newest organizations.
- `:45-69` tenant view: four cards and the latest payroll period. Dates are `Date` objects here,
  so `.toISOString()` works directly (`:61-62`).

## Review notes

- One of only two pages that render for the platform admin.
- "Recent Onboardings" counts the five newest organizations, whatever their status.

## Check

**Check:** as the platform admin, the "Organizations" card equals `SELECT count(*) FROM "Organization"`.
