import { EmployeesPanel } from "@/components/panels/employees-panel";
import { requirePageUser } from "@/lib/page-auth";
import { listEmployees } from "@/services/employee.service";

export default async function EmployeesPage() {
  const user = await requirePageUser();
  const employees = await listEmployees(user, {});

  return (
    <section>
      <header className="panel mb-4 p-5">
        <h1 className="text-2xl font-semibold">Employees</h1>
        <p className="text-sm text-zinc-600">Manage onboarding, status, and compensation history.</p>
      </header>
      <EmployeesPanel employees={employees} />
    </section>
  );
}
