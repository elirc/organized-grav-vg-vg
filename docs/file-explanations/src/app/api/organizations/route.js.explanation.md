# Senior Engineering Explanation: `src/app/api/organizations/route.js`

**Contract:**
- `GET`: permission `organizations.view`; all organizations for the platform admin, otherwise
  the caller's own.
- `POST`: permission `organizations.manage`, body `organizationCreateSchema`; the service also
  requires the platform admin role (`src/services/org.service.js:40-42`).

## Review notes

- Organizations created here get roles but no users and no invitation; `Invitation` is unused.

## Check

**Check:** as the client admin, `POST` returns 403 `Only platform admins can create organizations directly`.
