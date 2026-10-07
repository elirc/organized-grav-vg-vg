# Senior Engineering Explanation: `src/components/panels/employees-panel.js`

**Role:** the largest panel: add-employee form, CSV template download, CSV autofill, bulk import
and the employee table.

## Walkthrough

- `:7-33` form state and the payload builder. A blank salary becomes `0` (`:29`).
- `:67-76` template download through a Blob URL.
- `:88-110` create: controlled inputs, reset by setting state back to `EMPTY_FORM` (no
  `currentTarget` issue here).
- `:216-236` autofill: parse the file in the browser, map the first row into the form.
- `:244-278` import: upload the file as multipart and show the per-row summary
  (`:286-304`, first 10 failures).

## Review notes

- A blank salary sends `compensationAmount: 0`, which fails `z.number().positive()`
  (`src/lib/validators.js:49`), so creating an employee without a salary always fails with
  "Request validation failed".
- Inputs use placeholders instead of labels.
- `URL.revokeObjectURL` right after `anchor.click()` (`:74-75`) works in current browsers but can
  cancel the download in some older ones.

## Check

**Check:** submit the form with the salary left blank; the error "Request validation failed"
appears. Enter a salary and it succeeds.
