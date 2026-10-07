# Senior Engineering Explanation: `src/app/api/contracts/[id]/sign/route.js`

**Contract:** `POST /api/contracts/:id/sign`, permission `contracts.view`, body
`contractSignSchema` (signature and typed name). Calls `signContract`
(`src/services/contract.service.js:318-380`).

## Review notes

- `contracts.view` is the read permission; every `EMPLOYEE` and `CLIENT_MANAGER` holds it, and the
  service does not check that the caller is the counterparty (`fable/02-bugs-and-security.md#a6`).
- No status guard: `DRAFT` and already-`SIGNED` contracts can be signed.

## Check

**Check:** sign the same contract twice; the second call returns 200 and overwrites
`signatureData.signedAt`.
