# Senior Engineering Explanation: `src/app/api/employees/[id]/compensation/route.js`

**Contract:** `POST /api/employees/:id/compensation`, permission `employees.edit`, body
`compensationCreateSchema` (`src/lib/validators.js:81-86`). Calls `addCompensationRecord`
(`src/services/employee.service.js:321-387`).

## Review notes

- No UI calls this route.
- The new row's `amountMinor` is a `BigInt`, so the JSON response fails after the record is saved.
- A future `effectiveDate` still becomes `isCurrent` immediately.

## Check

**Check:** after posting `{"amount":5000,"currency":"USD","payFrequency":"MONTHLY","effectiveDate":"2026-01-01T00:00:00.000Z"}`,
the employee has a new current compensation of `500000` minor units and the old one is no longer
current.
