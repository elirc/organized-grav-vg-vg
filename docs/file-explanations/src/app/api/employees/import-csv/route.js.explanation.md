# Senior Engineering Explanation: `src/app/api/employees/import-csv/route.js`

**Contract:** `POST /api/employees/import-csv`, multipart form with a `file` field, permission
`employees.create`. The only route not wrapped in `withRoute`.

## Walkthrough

- `:10-12` repeats the auth and permission checks by hand.
- `:14-19` reads the form data and requires a file-like `file`.
- `:21-26` reads the whole file into memory and parses it with `parseCsv`.
- `:28-37` imports rows (`src/services/employee.service.js:417-483`) and returns per-row results.
- `:38-40` maps errors exactly as `withRoute` would.

## Review notes

- No size limit before `file.text()`; the 500-row limit is applied after parsing.
- Any future change to `withRoute` (for example BigInt handling or request ids) must be copied
  here by hand.

## Check

**Check:** uploading a file with only a header line returns 400 `CSV file has no importable rows.`
