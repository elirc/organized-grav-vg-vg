# Senior Engineering Explanation: `src/services/contract.service.js`

**Role:** contract templates, merge-tag rendering, and the contract lifecycle (create, update,
send, sign).

## Walkthrough

- `renderMergeFields` (`:8-28`): replaces `{{ a.b.c }}` with the value at that path in the
  context; missing paths render as `""`.
- `resolveTemplateForContract` (`:30-47`): by explicit `templateId` (no tenant filter), else the
  tenant's newest active template of the requested type, preferring a country match.
- `listContractTemplates` (`:49-58`): global (`organizationId = null`) plus tenant templates.
- `createContractTemplate` (`:60-100`): `version = latest + 1` per tenant and name.
- `createContract` (`:142-224`): requires an employee or contractor, resolves the template, builds
  the render context from the employee (selected fields), the full contractor row, the full
  organization row and payload extras, renders, and stores a `DRAFT` with audit and event.
- `updateContract` (`:226-256`): `data: payload` with before/after audit.
- `sendContractForSignature` (`:258-316`): `SENT`, audit, event, then a notification to the
  employee's linked user.
- `signContract` (`:318-380`): `SIGNED` with signature data (typed signature, name, IP, user
  agent), then `ACTIVE` if the effective date has passed, audit, event.

## Review notes

- Tenant gaps: `templateId` (`:31-33`), `employeeId` and `contractorId` (`:154-160`) are loaded
  without a tenant filter (`fable/02-bugs-and-security.md#a3`).
- No status guards on send or sign; `updateContract` can set any status.
- `signContract` returns the row from `:330-344`, so when it flips to `ACTIVE` at `:346-353` the
  caller still sees `SIGNED`.
- Signing does not check who the signer is (`fable/02-bugs-and-security.md#a6`).
- Template versioning reads the latest version and inserts `+1`; two concurrent creates with the
  same name hit `@@unique([organizationId, name, version])` (`prisma/schema.prisma:549`) and one
  gets a 500.
- Without a `templateId`, global templates are never chosen (`:35-46` filters by the tenant id).

## Check

**Goal:** render one contract. **Check:** with the seeded template
(`Agreement between {{organization.legalName}} and {{employee.fullName}}.`), creating a contract
for Alex Worker stores `renderedContent` = `Agreement between Acme Global Inc. and Alex Worker.`
