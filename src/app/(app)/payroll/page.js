import { PayrollPanel } from "@/components/panels/payroll-panel";
import { requirePageUser } from "@/lib/page-auth";
import { listPayrollRuns } from "@/services/payroll.service";

export default async function PayrollPage() {
  const user = await requirePageUser();
  const runs = await listPayrollRuns(user);

  return (
    <section>
      <header className="panel mb-4 p-5">
        <h1 className="text-2xl font-semibold">Payroll</h1>
        <p className="text-sm text-zinc-600">
          Run gross-to-net calculations, approve runs, and process payslips.
        </p>
      </header>
      <PayrollPanel runs={runs} />
    </section>
  );
}
