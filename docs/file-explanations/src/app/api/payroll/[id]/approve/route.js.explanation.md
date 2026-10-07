# Senior Engineering Explanation: `src/app/api/payroll/[id]/approve/route.js`

**Contract:** `POST /api/payroll/:id/approve`, permission `payroll.approve`, no body. Calls
`approvePayrollRun` (`src/services/payroll.service.js:525-568`).

## Review notes

- No check that the run is `PENDING_APPROVAL`; a `DRAFT` run can be approved.
- No separation of duties: the user who calculated can approve.
- The returned run carries `BigInt` totals.

## Check

**Check:** approving a freshly created `DRAFT` run changes its status to `APPROVED` with no items,
which a guard should refuse with 409.
