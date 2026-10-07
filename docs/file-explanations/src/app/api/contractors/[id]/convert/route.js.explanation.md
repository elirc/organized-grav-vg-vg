# Senior Engineering Explanation: `src/app/api/contractors/[id]/convert/route.js`

**Contract:** `POST /api/contractors/:id/convert`, permission `contractors.manage`, body
`contractorConvertSchema` (`src/lib/validators.js:192-197`). Calls
`convertContractorToEmployee` (`src/services/contractor.service.js:85-134`).

## Review notes

- No guard against converting twice or converting a terminated contractor.
- The UI always sends `jobTitle: "Converted Role"` and today's date
  (`src/components/panels/contractors-panel.js:96-99`).

## Check

**Check:** after converting, the contractor shows `TERMINATED` and a new `ONBOARDING` employee
with the contractor's email appears on `/employees`.
