# Senior Engineering Explanation: `src/services/tax.service.js`

**Role:** list, create and update global tax rules.

## Walkthrough

- `listTaxRules` (`:4-19`): optional country and active filters, ordered by country then newest
  effective date.
- `createTaxRule` (`:21-36`): maps the body to columns, dates parsed with `new Date`.
- `updateTaxRule` (`:38-48`): 404 if missing, then `data: payload`.

## Review notes

- `user` is accepted by every function and used by none: no tenant scoping (the model has no
  `organizationId`, `prisma/schema.prisma:655-671`) and no audit log. Combined with
  `CLIENT_ADMIN` holding `tax_rules.manage`, any tenant admin can change every tenant's taxes
  (`fable/02-bugs-and-security.md#a7`).
- `updateTaxRule` passes date strings straight to Prisma, while `createTaxRule` converts them;
  the two paths handle `effectiveDate` differently.
- `regionCode` is stored but the engine matches only on `countryCode`
  (`src/services/payroll.service.js:352`).
- Overlapping rules for the same country and tax type are all applied; nothing prevents two
  active US income rules from both being charged.

## Check

**Goal:** see rule stacking. **Check:** create a second active US `INCOME` `FLAT_RATE` rule at
10%; recalculating a run for a US employee charges 30% in total (20% seeded + 10%).
