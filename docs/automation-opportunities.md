# Automation Opportunities (Codebase Scan)

Each idea below states the current behavior with file:line references, the automation, and the
**prerequisites**: things in the current code that would make the automation unsafe if it were
built first. Automating a manual step removes the human who would otherwise notice a wrong
result, so the prerequisites matter more than the feature.

## Already implemented: employee CSV automation

- Template download, built client-side: `src/lib/csv.js:202-230`,
  `src/components/panels/employees-panel.js:67-76`.
- Autofill the form from the first row (browser only): `employees-panel.js:216-236`.
- Bulk import with per-row results: `src/app/api/employees/import-csv/route.js:8-41` ->
  `src/services/employee.service.js:417-483`. Each valid row calls the normal `createEmployee`
  and `inviteEmployeeNotification`, so every imported employee gets the same checklist, audit
  row and outbox event as one created by hand.

Limits worth knowing:

- Rows are created one by one with no surrounding transaction. A failure on row 300 leaves
  rows 1-299 created; the per-row `results` array is how the caller finds out
  (`employee.service.js:427-482`).
- The 500-row cap (`:418-425`) is checked after the whole file has been read into memory
  (`import-csv/route.js:21-22`); there is no request size limit.
- `parseCsv` splits on newlines before handling quotes (`src/lib/csv.js:34-39`), so a quoted
  field containing a line break is split into two rows.
- The template's sample salary is `85000` with `MONTHLY` (`csv.js:223-225`). Payroll treats
  `amountMinor` as the amount paid per run (`src/services/payroll.service.js:340-346`).
- For a platform admin every row fails: the payload built at `employee.service.js:445-457` has no
  `organizationId`, and `resolveOrganizationId` requires one for that role
  (`src/services/context.js:19-24`).

**Check:** import a two-row CSV where row 2 has no `personal_email`. Expect
`{ totalRows: 2, createdCount: 1, failedCount: 1 }` and a result for `rowNumber: 3` with
`Missing required columns/values: personalEmail`.

## Highest-value next automations

### 1. Payroll one-click orchestration

- **Today:** three buttons in `src/components/panels/payroll-panel.js:89-139` call
  `/calculate`, `/approve`, `/process` separately.
- **Automation:** policy-based auto-approve and auto-process for low-risk runs, or a scheduled
  mode.
- **Hooks:** `src/services/payroll.service.js:254-655`; routes under `src/app/api/payroll/[id]/`.
- **Prerequisites:**
  - Status guards. `approvePayrollRun` (`:525-568`) and `processPayrollRun` (`:570-655`) never
    check the run's current status; an orchestrator retrying a step would re-approve or
    re-process.
  - Idempotent processing. Processing twice regenerates PDFs and creates a second set of
    "Payslip available" notifications (`:597-623`).
  - A definition of "low risk". Today a run with `FAILED` items still reaches
    `PENDING_APPROVAL` (`:460-468`); an auto-approver must refuse runs with failed items.
  - Integer tax math. The float conversion at `:16-18` and `:73` is fine for review by a human,
    less so for unattended runs.

### 2. Draft a contract when an employee is created

- **Today:** `createEmployee` (`src/services/employee.service.js:118-184`) and `createContract`
  (`src/services/contract.service.js:142-224`) are separate manual steps.
- **Automation:** after `createEmployee`, render a draft from the matching template.
- **Better hook than a direct call:** the `employee.created` outbox event already written at
  `employee.service.js:171-180`. A consumer of that event keeps employee creation fast and makes
  contract drafting retryable.
- **Prerequisites:**
  - `resolveTemplateForContract` without a `templateId` only searches templates owned by the
    tenant (`contract.service.js:35-46`); global templates (`organizationId = null`) are listed
    in the UI but never auto-selected.
  - The outbox worker has to actually dispatch events to handlers; today it only logs them
    (`src/workers/domain-events-worker.cjs:5-15`).

### 3. Leave auto-approval

- **Today:** approve/reject buttons in `src/components/panels/leave-panel.js:105-138`.
- **Automation:** auto-approve by rule (days threshold, enough balance, no overlap).
- **Hooks:** `src/services/leave.service.js:117-322`.
- **Prerequisites:**
  - An accrual job. Nothing writes `LeaveBalance.balanceDays`, so every balance is 0 and every
    request is rejected with "Insufficient leave balance" (`leave.service.js:150-167`).
  - Overlap detection. There is no check for overlapping requests.
  - Server-side day counts. `totalDays` from the client is trusted when present (`:140`).
  - Atomic balance updates. `pendingDays` is read and written back as an absolute (`:185-192`),
    so concurrent requests can lose an increment.

### 4. Monthly billing cron and dunning

- **Today:** a button in `src/components/panels/billing-panel.js:19-43` posts to
  `/api/billing/invoices/generate`.
- **Automation:** generate invoices on a schedule, send reminders, escalate overdue accounts.
- **Hooks:** `src/services/billing.service.js:33-114`, `src/services/notification.service.js`.
- **Prerequisites:**
  - Idempotency. There is no uniqueness on `(organizationId, periodStart)` for `ClientInvoice`
    (`prisma/schema.prisma:890-913`), and the `IdempotencyKey` model (`:1086-1097`) is unused. A
    cron that retries would bill twice.
  - Per-tenant plans. The service picks the first active plan for everyone (`billing.service.js:58`).
  - A status lifecycle. Invoices are born `SENT` (`:82`); nothing ever sets `PAID` or `OVERDUE`.
  - A mail transport. `nodemailer` is in `package.json` but is imported nowhere.

### 5. Contract lifecycle automation

- **Today:** manual Send/Sign buttons (`src/components/panels/contracts-panel.js:114-150`). The
  Sign button posts a fixed `signature: "typed-signature"` and `typedName: "Accepted in app"`
  (`:137-140`), so the admin signs on the worker's behalf.
- **Automation:** auto-send when prerequisites are met, remind unsigned contracts, activate on
  the effective date.
- **Hooks:** `src/services/contract.service.js:258-380`.
- **Prerequisites:**
  - Signer identity. `signContract` does not check that the caller is the contract's employee
    or contractor (`:318-327`).
  - Status guards. Re-sending or re-signing a signed contract is allowed.
  - Effective-date activation already happens, but only at signing time (`:346-353`); a
    contract signed before its effective date stays `SIGNED` forever unless a job flips it.

## Medium-value automations

### 6. CSV import for contractors, leave policies and tax rules

- **Today:** single-record forms in `src/components/panels/contractors-panel.js` and
  `src/components/panels/admin-panel.js:29-80` (tax rules) and `:85-124` (templates).
- **Reuse:** the alias-mapping approach in `src/lib/csv.js:101-162` generalizes.
- **Prerequisite:** decide who may bulk-load tax rules. `TaxRule` is global
  (`prisma/schema.prisma:655-671`) and every `CLIENT_ADMIN` holds `tax_rules.manage`
  (`src/lib/permissions.js:57`); a bulk importer would multiply that exposure.

### 7. Notification digests

- **Today:** one notification row per event, read in `/notifications`; the list is capped at
  100 (`src/services/notification.service.js:32-42`).
- **Automation:** daily or weekly digest, de-duplicated by category.
- **Prerequisite:** the `NotificationPreference` model exists (`schema.prisma:960-971`) but no
  code reads it. Also, several `actionUrl` values point at pages that do not exist, such as
  `/payroll/<id>` (`payroll.service.js:517`), `/my/payslips` (`:619`) and
  `/employees/<id>/onboarding` (`employee.service.js:311`); a digest full of dead links would be
  worse than none.

### 8. Payroll preflight validator

- **Today:** a missing compensation only shows up as a `FAILED` item during calculation
  (`payroll.service.js:305-337`).
- **Automation:** before calculating, list employees with no current compensation, no matching
  tax rules for their `employmentCountry`, or a compensation whose `effectiveDate` is after the
  period end (`loadCurrentCompensation`, `:86-99`).
- **Why it is cheap:** every check is a read. It needs no new state and no worker.

## Platform and integration automations

### 9. Outbox-driven webhooks with retries

- **Today:** the worker writes an `IntegrationLog` per event and marks it `PROCESSED`
  (`src/workers/domain-events-worker.cjs:5-50`). `WebhookSubscription` and `Integration`
  (`schema.prisma:974-1002`) are unused.
- **Prerequisites:**
  - Retries. The worker only selects `PENDING` (`:18-29`), so `FAILED` events are never
    retried, and the 10-attempt dead-letter branch (`:52`) is unreachable. Select `FAILED` with
    a backoff on `availableAt` as well.
  - Claiming. Use `UPDATE ... WHERE status = 'PENDING' RETURNING` or `FOR UPDATE SKIP LOCKED` so
    two workers do not deliver the same event.
  - Stuck rows. An event left in `PROCESSING` by a crash is never selected again.

### 10. Contractor classification playbook

- **Today:** `classificationScore` and `classificationRisk` are stored as entered
  (`src/services/contractor.service.js:33-34`); conversion is a manual button.
- **Prerequisites:** `convertContractorToEmployee` (`:85-134`) does not check that the
  contractor is still active, so converting twice creates two employees. The new employee also
  gets no onboarding checklist and no compensation, so the next payroll run marks them
  `FAILED`.

## Suggested order

Fix the prerequisites that several items share first: status guards (items 1, 5), idempotency
(1, 4), a real outbox dispatcher with retries (2, 9). Then the payroll preflight (8), which is
read-only and safe, gives the most value for the least risk.
