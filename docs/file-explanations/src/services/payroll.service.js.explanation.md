# Senior Engineering Explanation: `src/services/payroll.service.js`

**Role:** the payroll engine: tax computation, run lifecycle, payslip PDFs.

## Walkthrough

- Helpers: `asBigInt` (`:12-14`), `toMajor` (`:16-18`, minor to float).
- `computeProgressiveTax` (`:20-44`): for each bracket, taxes the slice between `min` and `max`
  (open-ended when `max` is null) at `rate`, plus any `flatAmount` for every bracket the income
  reaches.
- `computeTaxForRule` (`:46-84`): four calculation types; result rounded back to minor units
  (`:73`) and assigned to employee, employer, or both (`BOTH` charges the full amount to each,
  `:83`).
- `loadCurrentCompensation` (`:86-99`), `loadYtd` (`:101-128`): reads through `db`, not a
  transaction.
- `generatePayslip` (`:136-167`): writes `storage/payslips/<itemId>.pdf` with pdfkit and returns
  the download URL.
- Run lifecycle: `createPayrollRun` (`:222-252`), `calculatePayrollRun` (`:254-523`),
  `approvePayrollRun` (`:525-568`), `processPayrollRun` (`:570-655`). Reads:
  `listPayrollRuns`, `getPayrollRun`, `listPayrollItems` (`:169-220`).

## Calculation in detail

For each `ACTIVE`/`ONBOARDING`/`ON_LEAVE` employee (`:265-279`):

1. Current compensation with `effectiveDate <= periodEnd`, or a `FAILED` item (`:303-337`).
2. Gross = `amountMinor`; overtime, bonus, commission and allowances are hard-coded `0n`
   (`:340-346`). Taxable = gross; no pre-tax deductions.
3. YTD gross and employee tax from this calendar year's earlier runs, counting items in
   `APPROVED`, `PAID` or `CALCULATED` (`:101-128`).
4. Every active tax rule whose `countryCode` equals `employmentCountry` (`:352`).
5. Net = gross - employee tax (`:371`); employer cost = gross + employer tax (`:425`).

## Review notes

- Pay frequency is ignored: `amountMinor` is paid per run whatever `payFrequency` says
  (`fable/02-bugs-and-security.md#b6`).
- Floats in the tax path (`:16-18`, `:73`).
- YTD counts `CALCULATED` items of runs that may never be approved, and `periodStart.getFullYear()`
  (`:102`) uses the server's local time zone.
- No status guards on approve, process or recalculate (`fable/02-bugs-and-security.md#a5`).
- `processPayrollRun` writes files inside a database transaction; Prisma's interactive
  transactions have a default timeout of a few seconds, so many employees can exceed it, and a
  rollback leaves the PDFs behind.
- Notification URLs `/payroll/<id>` (`:517`) and `/my/payslips` (`:619`) have no pages.
- All three mutations return rows with `BigInt` columns to `withRoute`, which cannot JSON-encode
  them (`fable/02-bugs-and-security.md#a1`).

## Check

**Goal:** pin the progressive math. **Check:** a unit test for
`brackets = [{min:0,max:1000,rate:0.1},{min:1000,max:null,rate:0.2}]` and a taxable income of
`250000n` minor units (2,500.00) expects `40000n` (100 + 300 = 400.00). Export the function or
copy it into the test to do this.
