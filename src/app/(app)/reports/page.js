import { requirePageUser } from "@/lib/page-auth";
import { headcountReport, payrollSummaryReport, turnoverReport } from "@/services/report.service";

export default async function ReportsPage() {
  const user = await requirePageUser();
  const [headcount, payrollSummary, turnover] = await Promise.all([
    headcountReport(user),
    payrollSummaryReport(user),
    turnoverReport(user),
  ]);

  return (
    <section className="space-y-4">
      <header className="panel p-5">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-zinc-600">Headcount, payroll trends, and turnover KPIs.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5">
          <h2 className="text-lg font-semibold">Headcount by Country</h2>
          <div className="mt-3 space-y-2 text-sm">
            {headcount.byCountry.map((row) => (
              <div className="flex justify-between" key={row.employmentCountry}>
                <span>{row.employmentCountry}</span>
                <span className="tag">{row._count._all}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="text-lg font-semibold">Payroll Totals</h2>
          <p className="mt-2 text-sm">Gross: {(payrollSummary.totals.gross / 100).toFixed(2)}</p>
          <p className="text-sm">Net: {(payrollSummary.totals.net / 100).toFixed(2)}</p>
          <p className="text-sm">Employer Cost: {(payrollSummary.totals.employerCost / 100).toFixed(2)}</p>
          <p className="mt-2 text-xs text-zinc-600">Based on latest 24 payroll runs.</p>
        </div>
        <div className="panel p-5">
          <h2 className="text-lg font-semibold">Turnover</h2>
          <p className="mt-2 text-sm">Hires: {turnover.hires}</p>
          <p className="text-sm">Terminations: {turnover.terminations}</p>
        </div>
      </div>

      <div className="panel p-5">
        <h2 className="text-lg font-semibold">Recent Payroll Runs</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-zinc-600">
                <th className="pb-2">Period</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Gross</th>
                <th className="pb-2">Net</th>
              </tr>
            </thead>
            <tbody>
              {payrollSummary.runs.map((run) => (
                <tr key={run.id} className="border-b border-[var(--line)]">
                  <td className="py-2">
                    {new Date(run.periodStart).toISOString().slice(0, 10)} -{" "}
                    {new Date(run.periodEnd).toISOString().slice(0, 10)}
                  </td>
                  <td className="py-2"><span className="tag">{run.status}</span></td>
                  <td className="py-2">{(Number(run.totalGrossMinor || 0) / 100).toFixed(2)}</td>
                  <td className="py-2">{(Number(run.totalNetMinor || 0) / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
