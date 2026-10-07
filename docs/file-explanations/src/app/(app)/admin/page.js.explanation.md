# Senior Engineering Explanation: `src/app/(app)/admin/page.js`

**Role:** `/admin`, described as "Platform controls for tax rules, templates, and tenants".

## Walkthrough

- `:8-13` loads tax rules, templates and organizations in parallel, then renders `AdminPanel`.

## Review notes

- No permission check: any logged-in role sees every tax rule, the tenant's templates and their
  own organization.
- For the platform admin, `listContractTemplates(user)` (`:11`) calls `resolveOrganizationId`
  without an id and throws 400, so the page meant for platform control does not render for the
  platform admin.
- The create forms post to routes that a `CLIENT_ADMIN` is allowed to call, including global tax
  rules.

## Check

**Check:** log in as `platform.admin@example.com` and open `/admin`; Next.js shows its error page
(in dev, with `organizationId is required for platform admin operations`).
