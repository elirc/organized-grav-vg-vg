import { withRoute } from "@/lib/api";
import { listLeaveBalances } from "@/services/leave.service";

export const GET = withRoute({ permission: "leave.request" }, async ({ user, query }) => {
  return listLeaveBalances(user, query.employeeId || null);
});
