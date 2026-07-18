# Automation Opportunities (Codebase Scan)

## Already Implemented This Round
- Employee CSV automation
  - Form autofill from first CSV row
  - Bulk employee import with per-row validation and result reporting
  - Relevant files:
    - `src/components/panels/employees-panel.js`
    - `src/app/api/employees/import-csv/route.js`
    - `src/lib/csv.js`
    - `src/services/employee.service.js`

## Highest-Value Next Automations

1. Payroll one-click orchestration
- Current behavior: separate manual actions (`Calculate`, `Approve`, `Process`) in `src/components/panels/payroll-panel.js`.
- Opportunity: add policy-based auto-approve + auto-process (for low-risk runs) with one-click or scheduled mode.
- Backend hooks:
  - `src/services/payroll.service.js`
  - `src/app/api/payroll/[id]/calculate/route.js`
  - `src/app/api/payroll/[id]/approve/route.js`
  - `src/app/api/payroll/[id]/process/route.js`

2. Auto contract draft generation after employee creation
- Current behavior: employee creation and contract creation are separate manual flows.
- Opportunity: after `createEmployee`, auto-generate contract draft if matching template exists, then optionally auto-send.
- Backend hooks:
  - `src/services/employee.service.js`
  - `src/services/contract.service.js`
  - `src/app/api/contracts/route.js`

3. Leave auto-approval policy
- Current behavior: leave requests require manual action in `src/components/panels/leave-panel.js`.
- Opportunity: auto-approve by rules (days threshold, balance threshold, no overlap, manager delegation).
- Backend hooks:
  - `src/services/leave.service.js`
  - `src/app/api/leave/requests/route.js`
  - `src/app/api/leave/requests/[id]/route.js`

4. Monthly billing cron + dunning automation
- Current behavior: invoice generation is button-triggered in `src/components/panels/billing-panel.js`.
- Opportunity: cron-driven invoice generation, overdue reminders/escalation, suspension triggers.
- Backend hooks:
  - `src/services/billing.service.js`
  - `src/app/api/billing/invoices/generate/route.js`
  - `src/services/notification.service.js`

5. Contract lifecycle automations
- Current behavior: manual send/sign actions from contracts table.
- Opportunity:
  - Auto-send contract when prerequisites satisfied
  - Reminder cadence for unsigned contracts
  - Auto-activate at effective date
- Backend hooks:
  - `src/services/contract.service.js`
  - `src/app/api/contracts/[id]/send/route.js`
  - `src/app/api/contracts/[id]/sign/route.js`

## Medium-Value Automations

6. CSV import for contractors and leave policies
- Current behavior: manual panel forms.
- Opportunity: replicate employee CSV flow for:
  - `src/components/panels/contractors-panel.js`
  - `src/components/panels/admin-panel.js` (leave/tax bulk setup)

7. Notification digest and smart bundling
- Current behavior: event-level notifications only.
- Opportunity: daily/weekly digest, dedupe by category, escalation on unresolved critical tasks.
- Backend hooks:
  - `src/services/notification.service.js`
  - `src/app/api/notifications/route.js`

8. Payroll preflight validator
- Current behavior: missing compensation fails during calc.
- Opportunity: preflight check with actionable fixes before starting payroll run.
- Backend hooks:
  - `src/services/payroll.service.js`
  - `src/components/panels/payroll-panel.js`

## Platform/Integration Automations

9. Outbox-driven webhook delivery retries
- Current behavior: worker logs outbox events but no provider fan-out yet.
- Opportunity: full webhook subscription dispatch + retry/backoff + signatures.
- Backend hooks:
  - `src/workers/domain-events-worker.cjs`
  - `src/lib/events.js`
  - `src/services/notification.service.js`
  - Prisma models: `DomainEvent`, `WebhookSubscription`, `IntegrationLog`

10. Auto classification-to-conversion playbook for contractors
- Current behavior: conversion is manual button action.
- Opportunity: score-triggered workflow creates recommended conversion task and draft employee profile.
- Backend hooks:
  - `src/services/contractor.service.js`
  - `src/components/panels/contractors-panel.js`
