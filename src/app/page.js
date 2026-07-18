import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-14">
      <main className="panel grid gap-8 p-8 md:grid-cols-2 md:p-12">
        <div className="space-y-4">
          <p className="tag inline-flex">Velocity Grid</p>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            EOR operations in one system.
          </h1>
          <p className="max-w-xl text-base text-zinc-700">
            Multi-tenant employer-of-record platform for onboarding, contracts, payroll, leave,
            compliance, billing, and reporting. Built on Node.js, Next.js, and PostgreSQL.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/signup" className="button-primary">
              Create Organization
            </Link>
            <Link href="/login" className="button-secondary">
              Sign In
            </Link>
          </div>
        </div>
        <div className="panel bg-white/80 p-6">
          <h2 className="text-lg font-semibold">Core Modules</h2>
          <ul className="mt-4 space-y-2 text-sm text-zinc-700">
            <li>Employee and contractor lifecycle</li>
            <li>Contract templates and e-signature</li>
            <li>Payroll engine with tax rule data model</li>
            <li>Leave policies, requests, and balances</li>
            <li>Billing plans, invoicing, and reports</li>
            <li>Audit log, domain events, and background jobs</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
