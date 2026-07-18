import { withRoute } from "@/lib/api";
import { listPayrollItems } from "@/services/payroll.service";

export const GET = withRoute({ permission: "payroll.view" }, async ({ user, params }) => {
  return listPayrollItems(user, params.id);
});
