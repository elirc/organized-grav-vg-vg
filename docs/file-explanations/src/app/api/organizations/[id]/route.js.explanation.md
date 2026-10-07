# Senior Engineering Explanation: `src/app/api/organizations/[id]/route.js`

**Contract:**
- `GET`: permission `organizations.view`, own organization only unless platform admin
  (`src/services/org.service.js:23-37`).
- `PATCH`: permission `organizations.manage`, body `organizationUpdateSchema`
  (`org.service.js:68-98`).

## Review notes

- The update schema includes `status` and `settings`; a tenant admin can change both for their
  own organization.

## Check

**Check:** as the seeded client admin, `GET /api/organizations/<another org id>` returns 403
`Tenant access denied`.
