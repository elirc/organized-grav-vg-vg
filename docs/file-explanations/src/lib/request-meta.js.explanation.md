# Senior Engineering Explanation: `src/lib/request-meta.js`

**Role:** extracts the client IP and user agent for audit rows and contract signatures.

## Walkthrough

- `:2-3` IP is the first entry of `x-forwarded-for`, else `x-real-ip`, else `null`.
- `:4` user agent header or `null`.

## Review notes

- `x-forwarded-for` is set by the client unless a trusted proxy overwrites it. Without such a
  proxy, the IP recorded in audit logs and in `Contract.signatureData`
  (`src/services/contract.service.js:336-342`) is whatever the caller claims.
- On a direct connection with neither header (plain `npm run dev`), the IP is `null`; the socket
  address is never consulted.

## Check

**Goal:** see the spoofing. **Check:** sign a contract with header `X-Forwarded-For: 1.2.3.4`;
the stored `signatureData.ipAddress` is `1.2.3.4`.
