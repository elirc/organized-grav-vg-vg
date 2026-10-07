# Senior Engineering Explanation: `src/app/api/contracts/[id]/send/route.js`

**Contract:** `POST /api/contracts/:id/send`, permission `contracts.manage`, no body. Calls
`sendContractForSignature` (`src/services/contract.service.js:258-316`).

## Review notes

- Sending a `SIGNED` contract sets it back to `SENT`.
- The notification goes only to an employee with a linked user account; contractors are never
  notified, and the seed employee has no user, so nobody is notified in the demo.

## Check

**Check:** after Send, the contract shows `SENT` and `sentAt` is set; a `contract.sent` row
appears in `DomainEvent`.
