# Senior Engineering Explanation: `src/app/api/contractors/[id]/route.js`

**Contract:** `PATCH /api/contractors/:id`, permission `contractors.manage`, body
`contractorUpdateSchema` (`src/lib/validators.js:182-190`). Calls `updateContractor`
(`src/services/contractor.service.js:53-83`).

## Review notes

- There is no `GET` for a single contractor and no UI that calls this `PATCH`.
- The body is written as-is; the schema allows `status` and classification fields.

## Check

**Check:** `PATCH` with `{"status":"SUSPENDED"}` returns the updated row and an `AuditLog` row
`contractor.updated` with `before.status` and `after.status`.
