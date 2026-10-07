# Senior Engineering Explanation: `src/app/api/billing/invoices/route.js`

**Contract:** `GET /api/billing/invoices`, permission `billing.view`, optional
`?organizationId=` (platform admins). Calls `listInvoices` (`src/services/billing.service.js:17-31`).

## Review notes

- Unpaginated. Every row carries `BigInt` money columns, so a non-empty list hits the JSON
  serialization problem; the `/billing` page reads the same data on the server and is unaffected.

## Check

**Check:** with at least one invoice, compare `GET /api/billing/invoices` (500 until BigInt
handling is added) with `/billing` (renders the row).
