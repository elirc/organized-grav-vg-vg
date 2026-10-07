# Senior Engineering Explanation: `src/lib/validators.js`

**Role:** every Zod request-body schema used by `withRoute`.

## Walkthrough

- Auth (`:5-19`): login needs an email and any password; register requires 10+ characters
  (`:18`); the service adds the number and symbol rule (`src/services/auth.service.js:8-13`).
- Organizations (`:21-35`): the update schema is the create schema made partial, so it includes
  `status`.
- Employees (`:37-65`): create allows an optional `organizationId` (for platform admins) and a
  positive `compensationAmount`; update allows `status`, `onboardingStatus`, `managerId`, `endDate`.
- Contracts (`:88-121`), payroll (`:123-129`), leave (`:131-155`), tax rules (`:157-170`),
  contractors (`:172-197`), invoices (`:199-202`).

## Review notes

- Fields are validated one at a time; no schema compares fields. `endDate >= startDate` is never
  enforced for leave, payroll or contracts.
- `organizationUpdateSchema` (`:35`) lets a tenant admin set their own organization's `status`.
- `contractUpdateSchema` (`:112-116`) accepts any `status` and arbitrary `renderedContent`,
  bypassing the send/sign flow.
- `employmentCountry` and currency codes are free strings (`:44`, `:50`), so `us` and `US`
  differ for the exact-match tax lookup.
- `taxRuleCreateSchema.brackets` is `z.array(z.record(z.any()))` (`:163`): rates and limits are
  not validated, so `{ rate: "abc" }` is stored and later becomes `NaN` math.
- `z.record(z.any())` with one argument is the Zod 3 form; check it against the installed Zod 4
  if you touch these schemas.

## Check

**Goal:** add one cross-field rule. **Check:** after adding `.refine(d => d.endDate >= d.startDate)`
to `leaveRequestCreateSchema`, a request with `endDate` before `startDate` returns 400 instead of
creating a request with a negative day count.
