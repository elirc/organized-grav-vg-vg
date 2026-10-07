# Senior Engineering Explanation: `src/app/api/documents/payslips/[id]/route.js`

**Contract:** `GET /api/documents/payslips/:id`, permission `payroll.view`. Streams
`storage/payslips/<id>.pdf` from the working directory.

## Walkthrough

- `:6` builds the path from `params.id`; `:7-9` 404 when missing; `:11-18` reads the whole file
  and returns it as `application/pdf`, inline.

## Review notes

- No lookup of the `PayrollItem` and no tenant check: any user with `payroll.view` in any tenant
  can fetch any payslip by item id (`fable/02-bugs-and-security.md#a2`).
- The path uses the raw id; `.pdf` is appended, but the id should come from a database row.
- `readFileSync` blocks the event loop; a stream would be kinder for large files.
- Employees have no permission to see their own payslip, and the "Payslip available"
  notification links to `/my/payslips`, which does not exist.

## Check

**Check:** after processing a run in tenant A, log in as a client admin of tenant B and request
`/api/documents/payslips/<A's item id>`; it returns the PDF.
