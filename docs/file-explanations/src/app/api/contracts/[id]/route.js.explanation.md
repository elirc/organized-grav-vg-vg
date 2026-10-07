# Senior Engineering Explanation: `src/app/api/contracts/[id]/route.js`

**Contract:**
- `GET`: permission `contracts.view`; contract with employee, contractor, template and amendments
  (`src/services/contract.service.js:123-140`).
- `PATCH`: permission `contracts.manage`, body `contractUpdateSchema`
  (`src/lib/validators.js:112-116`).

## Review notes

- `PATCH` can set any `status` (including `SIGNED`) and replace `renderedContent` after signing.
- `GET` is open to every role with `contracts.view`, including `EMPLOYEE`, for every contract in
  the tenant, not just their own.

## Check

**Check:** `PATCH` a `DRAFT` contract with `{"status":"SIGNED"}`; it returns 200 with
`signedAt: null` and no `signatureData`, which a status guard should reject.
