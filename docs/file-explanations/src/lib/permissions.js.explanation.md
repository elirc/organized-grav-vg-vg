# Senior Engineering Explanation: `src/lib/permissions.js`

**Role:** the list of permission names (`:1-29`) and the default grants per system role
(`:31-74`). `rbac.service.js` turns these into database rows for every new organization.

## Walkthrough

- 27 permission strings in `resource.action` form.
- `PLATFORM_ADMIN: ["*"]` (`:32`). The wildcard is never stored; `normalizeUserContext` adds it
  in memory (`src/lib/auth.js:109-112`).
- `CLIENT_ADMIN` (`:33-59`) gets nearly everything, including `tax_rules.manage` (`:57`) and
  `organizations.manage` (`:56`), but not `notifications.manage` or `admin.platform`.
- `CLIENT_MANAGER` (`:60-67`), `EMPLOYEE` (`:68-72`), `CONTRACTOR` (`:73`).

## Review notes

- `tax_rules.manage` on `CLIENT_ADMIN` is a cross-tenant problem because `TaxRule` is global
  (`fable/02-bugs-and-security.md#a7`).
- `admin.platform`, `compliance.view`, `compliance.manage`, `reports.export`,
  `employees.terminate` and `notifications.manage` are granted but no route checks them.
- The same lists are copied into `prisma/seed.js:6-68`. Existing organizations do not pick up a
  new permission until `ensureBaseRbac` runs for them again.

## Check

**Goal:** list unused permissions. **Check:** for each name here, `grep -rn "permission: \"<name>\"" src/app/api`
returns a hit or not; the six names above return none.
