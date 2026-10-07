# Senior Engineering Explanation: `src/app/api/contractors/route.js`

**Contract:**
- `GET`: permission `contractors.view`; the whole query object is passed as filters, so
  `?status=` and `?organizationId=` work (`src/services/contractor.service.js:6-18`).
- `POST`: permission `contractors.manage`, body `contractorCreateSchema`.

## Review notes

- No duplicate-email check for contractors within a tenant.
- Contractor creation writes an audit row but no domain event.

## Check

**Check:** `GET /api/contractors?status=ACTIVE` returns only the seeded Jamie Contractor.
