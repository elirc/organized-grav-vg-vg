# Senior Engineering Explanation: `src/app/(app)/leave/page.js`

**Role:** `/leave`: request form and the request table with approve/reject.

## Walkthrough

- `:8-12` loads policies, requests and employees in parallel.

## Review notes

- `totalDays` (`LeaveRequest`) and `accrualRate` (`LeavePolicy`) are Prisma `Decimal` objects.
  Passing class instances as props to a client component is not supported by RSC serialization;
  see `fable/02-bugs-and-security.md#c2` for how to confirm and fix.
- Any role can see all requests in the tenant and the approve buttons; the API still enforces
  `leave.approve` when clicked.

## Check

**Check:** load `/leave` with the seeded policy present. Either it renders (the Decimal concern
does not apply to your versions) or the dev error overlay names the non-plain object.
