import { withRoute } from "@/lib/api";
import { processPayrollRun } from "@/services/payroll.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const POST = withRoute({ permission: "payroll.process" }, async ({ user, params, request }) => {
  return processPayrollRun(user, params.id, requestMetaFromHeaders(request));
});
