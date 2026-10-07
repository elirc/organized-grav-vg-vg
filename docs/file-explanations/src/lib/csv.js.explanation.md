# Senior Engineering Explanation: `src/lib/csv.js`

**Role:** a small CSV parser plus the employee-specific column mapping used by both the browser
autofill and the server import.

## Walkthrough

- `splitCsvLine` (`:1-31`): handles quoted fields and doubled quotes (`""`), trims each cell.
- `parseCsv` (`:33-66`): normalizes line endings, drops blank lines, requires a header plus at
  least one row, and builds one object per row keyed by header text. Missing cells become `""`.
- `normalizeKey` (`:68-72`): lower-cases and strips non-alphanumerics, so `First Name`,
  `first_name` and `firstname` all match.
- `EMPLOYEE_ALIASES` (`:101-113`): accepted header names per field.
- `mapEmployeeCsvRow` (`:136-162`): picks the first non-empty alias per field, lower-cases emails,
  upper-cases country, currency and pay frequency, normalizes dates to `YYYY-MM-DD`, and defaults
  currency to `USD` and frequency to `MONTHLY`.
- `validateMappedEmployeeRow` (`:164-200`): required fields, a basic `@` check, non-negative
  salary, allowed pay frequencies.
- Template (`:202-230`): headers and one sample row.

## Review notes

- Lines are split before quotes are considered (`:34-39`), so a quoted value containing a newline
  breaks the row. A byte-order mark is not stripped, so a BOM-prefixed first header no longer
  matches `first_name`.
- `normalizeDateInput` (`:74-90`) falls back to `new Date(text)`. JavaScript engines read a
  slash date as month/day, so `03/04/2026` becomes March 4, a common surprise for non-US files.
  The result also goes through `toISOString()` (`:89`), so a parsed local midnight can shift to
  the previous day in time zones east of UTC.
- The sample row's `85000` with `MONTHLY` (`:223-225`) reads like an annual salary; payroll pays
  `amountMinor` per run (`src/services/payroll.service.js:340-346`).
- The same module runs in the browser (imported by `src/components/panels/employees-panel.js:5`)
  and on the server, so it must stay free of Node-only imports.

## Check

**Goal:** see the multiline limitation. **Check:** `parseCsv('a,b\n"x\ny",z\n').rows.length`
is `2`, not `1`.
