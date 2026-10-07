# Senior Engineering Explanation: `src/services/context.js`

**Role:** tenant resolution. Nearly every service calls `resolveOrganizationId` before touching
tenant data.

## Walkthrough

- `isPlatformAdmin` (`:4-6`): role-name check.
- `requireOrganizationAccess(user, orgId)` (`:8-16`): platform admin passes; anyone else must
  belong to `orgId` or gets 403. Used only by `src/services/org.service.js`.
- `resolveOrganizationId(user, explicitId)` (`:18-36`):
  - platform admin: must name an organization, else 400 (`:19-24`);
  - user without an organization: 400 (`:27-29`);
  - explicit id that is not the user's own: 403 (`:31-33`);
  - otherwise the user's organization (`:35`).

## How it is used

Two shapes appear across the services:

1. **Scope a list or create:** `resolveOrganizationId(user, payload.organizationId)` and use the
   result as the `where`/`data` tenant (for example `src/services/employee.service.js:36`).
2. **Authorize a loaded row:** load by id, then `resolveOrganizationId(user, row.organizationId)`
   and ignore the return value (for example `src/services/payroll.service.js:194`). A mismatch
   throws 403.

## Review notes

- The function only sees the ids it is given. Secondary ids in a body (`employeeId`,
  `templateId`, `policyId`, `managerId`) are never passed in, which is the root of the cross-tenant
  findings in `fable/02-bugs-and-security.md#a3`.
- For platform admins the "must name an organization" rule makes every page that calls a list
  service without an id throw, which is why `/payroll`, `/employees`, `/admin` and others fail for
  that account.
- `getEmployee` repeats the comparison after calling this function
  (`src/services/employee.service.js:110-113`); the extra check can never fire.

## Check

**Goal:** see both error branches. **Check:** as a client admin, `GET /api/payroll?organizationId=<another org id>`
returns 403 `Tenant access denied`; as the platform admin, `GET /api/payroll` with no query returns
400 `organizationId is required for platform admin operations`.
