# Senior Engineering Explanation: `src/app/api/tax-rules/route.js`

**Contract:**
- `GET`: permission `payroll.view`; filters `countryCode` and `isActive` (string `"true"` from the
  query is passed as-is).
- `POST`: permission `tax_rules.manage`, body `taxRuleCreateSchema`.

## Review notes

- `?isActive=true` passes the string `"true"` to a Boolean filter
  (`src/services/tax.service.js:11-13`), which Prisma rejects; the filter only works when omitted.
- Same global-scope problem as the `[id]` route.

## Check

**Check:** `GET /api/tax-rules?countryCode=US` returns the seeded 20% income rule;
`GET /api/tax-rules?isActive=true` returns 500.
