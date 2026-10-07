# Senior Engineering Explanation: `src/components/panels/billing-panel.js`

**Role:** plan cards, a "Generate Monthly Invoice" button and the invoice table.

## Walkthrough

- `:19-43` posts an empty body to `/api/billing/invoices/generate`, shows the error or refreshes.
- `:47-56` plan cards; `:75-86` invoice rows. Money is shown as `Number(minor) / 100`.

## Review notes

- Because the generate endpoint likely returns 500 after storing the invoice (BigInt in the JSON
  response), the user sees an error, clicks again, and gets a second invoice.

## Check

**Check:** after one click, count the rows in the invoice table and the "Internal server error"
message; the row count tells you whether the invoice was stored despite the error.
