# Senior Engineering Explanation: `src/app/api/payroll/[id]/process/route.js`

**Contract:** `POST /api/payroll/:id/process`, permission `payroll.process`, no body. Calls
`processPayrollRun` (`src/services/payroll.service.js:570-655`).

## Review notes

- No `APPROVED` guard and not idempotent.
- Writes PDFs under `storage/payslips/` relative to the process working directory.

## Check

**Check:** after Process, `storage/payslips/` contains one PDF per `APPROVED` item and those
items are `PAID` with a `payslipUrl`.
