# Senior Engineering Explanation: `src/app/api/contract-templates/route.js`

**Contract:**
- `GET`: permission `contracts.view`, optional `?organizationId=`; global plus tenant templates
  (`src/services/contract.service.js:49-58`).
- `POST`: permission `templates.manage`, body `contractTemplateCreateSchema`
  (`src/lib/validators.js:88-96`); creates the next version (`contract.service.js:60-100`).

## Review notes

- No API call can create a global template (`organizationId = null`): the service always
  resolves a tenant (`src/services/contract.service.js:61`), using the payload's
  `organizationId` for the platform admin and the caller's own otherwise. Global templates can
  only be inserted directly into the database.
- Templates are never deactivated or edited; a "change" is always a new version.

## Check

**Check:** posting the same `name` twice yields versions 1 and 2, both listed by `GET`.
