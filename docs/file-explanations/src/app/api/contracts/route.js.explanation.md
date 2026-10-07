# Senior Engineering Explanation: `src/app/api/contracts/route.js`

**Contract:**
- `GET`: permission `contracts.view`; query filters `status`, `employeeId`, `contractorId`,
  `organizationId` (`src/services/contract.service.js:102-121`).
- `POST`: permission `contracts.manage`, body `contractCreateSchema`; renders a template into a
  `DRAFT` (`contract.service.js:142-224`).

## Review notes

- `employeeId`, `contractorId` and `templateId` in the body are not tenant-checked
  (`fable/02-bugs-and-security.md#a3`).
- The list includes each contract's employee, contractor and template rows in full.

## Check

**Check:** creating a contract with neither `employeeId` nor `contractorId` returns 400
`Either employeeId or contractorId is required`.
