# Senior Engineering Explanation: `src/app/api/billing/invoices/generate/route.js`

**Contract:** `POST /api/billing/invoices/generate`, permission `billing.manage`, body
`invoiceGenerateSchema` (optional `organizationId`, `invoiceDate`). Calls
`generateMonthlyInvoice` (`src/services/billing.service.js:33-114`).

## Review notes

- Not idempotent: each call creates a new invoice for the same period.
- The created invoice has `BigInt` columns, which `withRoute` cannot JSON-encode, so the API
  likely reports 500 after the invoice is stored (`fable/02-bugs-and-security.md#a1`).

## Check

**Check:** click "Generate Monthly Invoice" twice; `/billing` lists two invoices with the same
period.
