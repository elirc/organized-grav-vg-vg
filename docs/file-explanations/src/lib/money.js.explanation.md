# Senior Engineering Explanation: `src/lib/money.js`

**Role:** conversions between decimal amounts and integer minor units (cents), which is how
every money column is stored (`BigInt`, for example `prisma/schema.prisma:620-640`).

## Walkthrough

- `toMinorUnits(value)` (`:3-15`): `null`, `undefined` and `""` become `0n` (`:4-6`); strings are
  parsed with `parseFloat`; `NaN` becomes `0n` (`:10-12`); otherwise
  `BigInt(Math.round(value * 100))`.
- `fromMinorUnits` (`:17-23`): `Number(value) / 100`.
- `sumMinor` (`:25-27`) and `minorToCurrency` (`:29-36`): a BigInt sum and an `Intl.NumberFormat`
  currency formatter. Neither has a caller.

## Review notes

- Returning `0n` for unparseable input (`:10-12`) turns a bad salary into a zero salary with no
  error. Throwing would be safer for money.
- The multiplier is fixed at 100 (`:1`). Currencies with zero (JPY) or three (KWD) minor digits
  would be stored wrongly, and `Compensation.currency` is free text.
- `value * 100` happens in floating point before rounding. `Math.round` hides the usual cases
  (`0.29 * 100 = 28.999...`), which is why it is there.
- The UI prints money with ad-hoc `Number(x) / 100` in several panels instead of
  `minorToCurrency`, so formatting is inconsistent.

## Check

**Goal:** pin the edge cases. **Check:** a unit test asserting `toMinorUnits("19.99") === 1999n`,
`toMinorUnits(0.29) === 29n`, `toMinorUnits("abc") === 0n` (documenting current behavior), and
`minorToCurrency(123456n)` equals `"$1,234.56"`.
