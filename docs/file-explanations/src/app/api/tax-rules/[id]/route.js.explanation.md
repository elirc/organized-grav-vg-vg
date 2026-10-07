# Senior Engineering Explanation: `src/app/api/tax-rules/[id]/route.js`

**Contract:** `PATCH /api/tax-rules/:id`, permission `tax_rules.manage`, body
`taxRuleUpdateSchema` (all fields optional). Calls `updateTaxRule`
(`src/services/tax.service.js:38-48`).

## Review notes

- Tax rules are global and every `CLIENT_ADMIN` holds `tax_rules.manage`, so any tenant can edit
  the rules all tenants use (`fable/02-bugs-and-security.md#a7`). No audit row is written.

## Check

**Check:** as a newly registered tenant admin, `PATCH` the seeded US rule with
`{"isActive":false}`; the seeded tenant's next calculation charges no income tax.
