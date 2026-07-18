import { requirePageUser } from "@/lib/page-auth";
import { getDashboardData } from "@/services/dashboard.service";

function MetricCard({ label, value }) {
  return (
    <div className="panel p-4">
      <p className="text-xs uppercase tracking-[0.1em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requirePageUser();
  const data = await getDashboardData(user);

  if (data.scope === "platform") {
    return (
      <section className="space-y-4">
        <header className="panel p-5">
          <h2 className="text-2xl font-semibold">Platform Dashboard</h2>
          <p className="text-sm text-zinc-600">Cross-tenant operational overview.</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Organizations" value={data.organizations ?? 0} />
          <MetricCard label="Active Clients" value={data.activeClients ?? 0} />
          <MetricCard label="Total Headcount" value={data.totalHeadcount ?? 0} />
          <MetricCard label="Recent Onboardings" value={data.recentOnboardings?.length ?? 0} />
        </div>
        <div className="panel p-5">
          <h3 className="text-lg font-semibold">Recent Organizations</h3>
          <div className="mt-3 space-y-2 text-sm">
            {data.recentOnboardings?.map((org) => (
              <div key={org.id} className="flex justify-between border-b border-[var(--line)] pb-2">
                <span>{org.name}</span>
                <span className="tag">{org.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header className="panel p-5">
        <h2 className="text-2xl font-semibold">Organization Dashboard</h2>
        <p className="text-sm text-zinc-600">Key operating metrics for your tenant.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Headcount" value={data.headcount} />
        <MetricCard label="Pending Onboarding" value={data.pendingOnboarding} />
        <MetricCard label="Payroll Approvals" value={data.pendingPayroll} />
        <MetricCard label="Unread Alerts" value={data.unreadNotifications} />
      </div>
      <div className="panel p-5">
        <h3 className="text-lg font-semibold">Last Payroll Run</h3>
        {data.lastPayrollRun ? (
          <p className="mt-2 text-sm text-zinc-700">
            {data.lastPayrollRun.periodStart.toISOString().slice(0, 10)} to{" "}
            {data.lastPayrollRun.periodEnd.toISOString().slice(0, 10)} ({data.lastPayrollRun.status})
          </p>
        ) : (
          <p className="mt-2 text-sm text-zinc-600">No payroll runs yet.</p>
        )}
      </div>
    </section>
  );
}
