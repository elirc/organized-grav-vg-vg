import { LeavePanel } from "@/components/panels/leave-panel";
import { requirePageUser } from "@/lib/page-auth";
import { listLeavePolicies, listLeaveRequests } from "@/services/leave.service";
import { listEmployees } from "@/services/employee.service";

export default async function LeavePage() {
  const user = await requirePageUser();
  const [policies, requests, employees] = await Promise.all([
    listLeavePolicies(user),
    listLeaveRequests(user),
    listEmployees(user),
  ]);

  return (
    <section>
      <header className="panel mb-4 p-5">
        <h1 className="text-2xl font-semibold">Leave Management</h1>
        <p className="text-sm text-zinc-600">Requests, approvals, and policy enforcement.</p>
      </header>
      <LeavePanel policies={policies} requests={requests} employees={employees} />
    </section>
  );
}
