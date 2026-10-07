# Senior Engineering Explanation: `src/services/org.service.js`

**Role:** list, read, create and update organizations.

## Walkthrough

- `listOrganizations` (`:7-21`): all organizations for the platform admin; otherwise only the
  user's own.
- `getOrganization` (`:23-37`): `requireOrganizationAccess` first, then load.
- `createOrganization` (`:39-66`): platform admin only (`:40-42`); creates the organization and its
  roles in one transaction with an audit row.
- `updateOrganization` (`:68-98`): access check, then load, update with the request body, and
  audit the before/after rows.
- `resolveOrg` (`:100-102`): an alias of `resolveOrganizationId` with no callers.

## Review notes

- `createOrganization` writes `data: payload` (`:46`); the create schema
  (`src/lib/validators.js:21-33`) decides which columns that can touch.
- `updateOrganization` also writes `data: payload` (`:77-80`), and the update schema includes
  `status`, so a `CLIENT_ADMIN` (who holds `organizations.manage`) can change a `SUSPENDED` tenant
  back to `ACTIVE`.
- The route also requires `organizations.manage` for `POST /api/organizations`, and
  `CLIENT_ADMIN` holds it, so the explicit platform-admin check at `:40-42` is what actually
  protects creation. Good that it is there.

## Check

**Goal:** see the self-service status change. **Check:** as the seeded client admin,
`PATCH /api/organizations/<own id>` with `{"status":"SUSPENDED"}` returns 200, and the same call
with `"ACTIVE"` restores it.
