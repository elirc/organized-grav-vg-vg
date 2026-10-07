# Senior Engineering Explanation: `src/app/(app)/contracts/page.js`

**Role:** `/contracts`: create contracts from templates, send and sign them.

## Walkthrough

- `:9-14` loads contracts, templates, employees and contractors in parallel for the form's
  select boxes and the table.

## Review notes

- Fetching every employee and contractor to fill a select box does not scale; a search endpoint
  would.
- Visible to any role (no permission check), throws for the platform admin.

## Check

**Check:** the template select lists "US Employment Agreement v1" from the seed.
