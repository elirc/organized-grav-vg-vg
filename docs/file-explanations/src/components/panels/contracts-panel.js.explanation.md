# Senior Engineering Explanation: `src/components/panels/contracts-panel.js`

**Role:** create contracts, list them, Send and Sign buttons.

## Walkthrough

- `:30-52` create form: template, employee or contractor, effective date.
- `:114-150` Send and Sign. Sign posts a fixed `signature: "typed-signature"` and
  `typedName: "Accepted in app"` (`:137-140`).

## Review notes

- The admin signs on the worker's behalf; there is no signer-facing view.
- `event.currentTarget.reset()` after an await (`:46`).
- Only the template and effective date are `required` (`:54`, `:62`); the employee and
  contractor selects are optional, so the API's "Either employeeId or contractorId is required"
  400 is the only guard.

## Check

**Check:** submit with a template and date but no worker; the panel shows
"Either employeeId or contractorId is required".
