# Senior Engineering Explanation: `src/app/api/payroll/route.js`

**Contract:**
- `GET`: permission `payroll.view`, optional `?organizationId=`.
- `POST`: permission `payroll.process`, body `payrollCreateSchema` (period start, end, pay date,
  currency) (`src/services/payroll.service.js:222-252`).

## Review notes

- A duplicate period violates `@@unique([organizationId, periodStart, periodEnd])` and returns a
  generic 500.
- `periodEnd < periodStart` is accepted.

## Check

**Check:** creating the same period twice returns 200 then 500, with a `P2002` error in the
server log.
