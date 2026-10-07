# Senior Engineering Explanation: `src/services/rbac.service.js`

**Role:** creates permission rows and system roles, and assigns roles to users. Called inside
registration and organization creation transactions.

## Walkthrough

- `upsertPermissions` (`:3-11`): one upsert per name in `PERMISSIONS`, sequentially (27 queries).
- `ensureRole` (`:13-67`): find or create the role by `(name, organizationId)`, then add any
  missing `RolePermission` rows. Skipped for the `"*"` wildcard.
- `ensureBaseRbac(tx, organizationId)` (`:69-113`): always ensures the global `PLATFORM_ADMIN`
  role; with an organization, also `CLIENT_ADMIN`, `CLIENT_MANAGER`, `EMPLOYEE`, `CONTRACTOR`.
- `assignRole` (`:115-146`): finds the role by name and tenant and creates the `UserRole` if
  missing. Throws a plain `Error` (a 500) if the role does not exist.

## Review notes

- Every registration runs about 27 permission upserts plus role and grant queries inside its
  transaction. Cheap at this scale, but it is setup work that belongs in a seed or migration.
- `ensureRole` only adds grants; removing a permission from `DEFAULT_ROLE_PERMISSIONS` never
  revokes it from existing roles.
- The global role has `organizationId = null`. PostgreSQL treats NULLs as distinct in the
  `@@unique([organizationId, name])` index (`prisma/schema.prisma:356`), so the find-then-create
  at `:14-30` is the only thing preventing duplicate `PLATFORM_ADMIN` rows, and two concurrent
  registrations can both create one.
- There is no API for custom roles, so the "dynamic RBAC" tables hold only system roles.

## Check

**Goal:** confirm what a new tenant gets. **Check:** after one `/signup`,
`SELECT name FROM "Role" WHERE "organizationId" = '<new org id>'` returns exactly the four
client roles, and the global `PLATFORM_ADMIN` row count is still 1.
