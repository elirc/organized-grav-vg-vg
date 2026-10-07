# Senior Engineering Explanation: `src/lib/crypto.js`

**Role:** optional AES-256-GCM field encryption with an `enc:v1:` prefix.

## Walkthrough

- `:3` reads `FIELD_ENCRYPTION_KEY` once at module load; `getKeyBuffer` (`:5-19`) accepts only a
  64-hex-character (32-byte) key and returns `null` otherwise.
- `encryptField` (`:23-38`): a random 12-byte IV, AES-256-GCM, and the output
  `enc:v1:` + base64(iv | 16-byte tag | ciphertext). With no key it returns the plaintext.
- `decryptField` (`:40-66`): passes through anything without the prefix, and on any error returns
  the input unchanged (`:63-65`).

## Review notes

- `encryptField` has no callers. The only `decryptField` caller is `sanitizeEmployeeOutput`
  (`src/services/employee.service.js:24-33`), which reads `bankAccountEncrypted`, a column that
  does not exist on `Employee` (`prisma/schema.prisma:414-455`). Nothing in the app is encrypted.
- Both functions fail open: no key means plaintext, a tampered value is returned as-is. For
  sensitive data, both should throw.
- The format is versioned (`v1`), which is the right call: key rotation can add `v2` without
  breaking old rows.

## Check

**Goal:** round-trip once. **Check:** with `FIELD_ENCRYPTION_KEY` set to 64 hex characters, a
script that imports both functions shows `decryptField(encryptField("12345678"))` returns
`"12345678"` and the encrypted value starts with `enc:v1:`.
