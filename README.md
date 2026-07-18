# Velocity Grid

Employer-of-record (EOR) platform MVP built with Next.js, Node.js, and PostgreSQL.

## What Is Included
- Multi-tenant architecture with RBAC and org isolation
- Authentication with secure JWT cookie sessions
- Employee + contractor lifecycle modules
- Employee CSV automation (autofill first row + bulk import)
- Contract template rendering and e-signature workflow
- Payroll engine with tax rules, approval, processing, and payslip PDF generation
- Leave policies, requests, approvals, and balances
- Billing plans and monthly invoice generation
- Notifications, audit logs, reporting, and domain-event outbox
- Admin controls for tax rules/templates/organizations

## Tech Stack
- Next.js App Router (JavaScript)
- PostgreSQL + Prisma
- Redis + BullMQ (fallback inline mode when Redis is unavailable)
- Tailwind CSS

## Quick Start
1. Install dependencies:
   - `npm install`
2. Copy env file:
   - `cp .env.example .env`
3. Start infrastructure:
   - `docker compose up -d`
4. Apply schema:
   - `npm run db:push`
5. Seed data:
   - `npm run db:seed`
6. Start app:
   - `npm run dev`

Optional worker:
- `npm run worker:events -- --loop`

## Seed Accounts
- Platform admin:
  - `platform.admin@example.com`
  - `ChangeMe!123`
- Client admin:
  - `client.admin@acme-global.example`
  - `ChangeMe!123`

## Scripts
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:push`
- `npm run db:seed`
- `npm run db:reset`
- `npm run worker:events`

## CSV Import (Employees)
- Open `/employees`
- Use `Download CSV Template`
- Upload CSV and either:
  - `Autofill Form` (first row to form fields), or
  - `Import CSV Rows` (bulk create employees with row-level validation results)

## Documentation
- Improved plan: `docs/improved-implementation-plan.md`
- Codebase architecture: `docs/architecture.md`
