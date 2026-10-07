# Senior Engineering Explanation: `src/services/contractor.service.js`

**Role:** contractor CRUD and conversion of a contractor into an employee.

## Walkthrough

- `listContractors` (`:6-18`), `createContractor` (`:20-51`, `ONBOARDING`/`INVITED`, audit).
- `updateContractor` (`:53-83`): tenant check, `data: payload`, before/after audit.
- `convertContractorToEmployee` (`:85-134`): in one transaction, create an employee from the
  contractor's name, email and country plus the payload's title, department and start date; set
  the contractor to `TERMINATED`; audit.

## Review notes

- No status guard: converting an already `TERMINATED` contractor creates another employee.
- The converted employee gets no onboarding checklist, no compensation, no audit/event of its own
  as an `Employee`, and no notification, unlike `createEmployee`
  (`src/services/employee.service.js:118-184`). The next payroll run marks them `FAILED`.
- Contractor changes write no domain events.
- `classificationScore` and `classificationRisk` are whatever the caller sends; nothing computes
  them.

## Check

**Goal:** see the missing guard. **Check:** click "Convert to Employee" twice on the same
contractor; `/employees` lists two "Converted Role" employees with the same email.
