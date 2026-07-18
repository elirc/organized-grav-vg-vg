import { withRoute } from "@/lib/api";
import { getPayrollRun } from "@/services/payroll.service";

export const GET = withRoute({ permission: "payroll.view" }, async ({ user, params }) => {
  return getPayrollRun(user, params.id);
});
