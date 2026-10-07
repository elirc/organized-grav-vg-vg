# Senior Engineering Explanation: `src/app/api/payroll/[id]/calculate/route.js`

**Contract:** `POST /api/payroll/:id/calculate`, permission `payroll.process`, no body. Calls
`calculatePayrollRun` (`src/services/payroll.service.js:254-523`).

## Review notes

- Recalculating a `COMPLETED` run resets it to `PENDING_APPROVAL` and overwrites `PAID` items.
- The response is a run with `BigInt` totals.

## Check

**Check:** after Calculate on a run covering the current month, `GET /api/payroll/:id/items`
(or the database) shows one item per active employee, `CALCULATED` or `FAILED` with an
`errorReason`.
