import { withRoute } from "@/lib/api";
import { calculatePayrollRun } from "@/services/payroll.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const POST = withRoute({ permission: "payroll.process" }, async ({ user, params, request }) => {
  return calculatePayrollRun(user, params.id, requestMetaFromHeaders(request));
});
