# Senior Engineering Explanation: `src/app/api/leave/policies/route.js`

**Contract:**
- `GET`: permission `leave.request`; global plus tenant active policies.
- `POST`: permission `settings.manage`, body `leavePolicyCreateSchema`
  (`src/lib/validators.js:131-141`).

## Review notes

- No UI creates policies; the seed creates "Standard PTO".
- Accrual settings are stored but nothing applies them.

## Check

**Check:** as `CLIENT_MANAGER`, `POST` returns 403 `Missing permission: settings.manage`;
as `CLIENT_ADMIN` it returns the new policy.
