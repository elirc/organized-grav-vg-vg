import { withRoute } from "@/lib/api";
import { approvePayrollRun } from "@/services/payroll.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const POST = withRoute({ permission: "payroll.approve" }, async ({ user, params, request }) => {
  return approvePayrollRun(user, params.id, requestMetaFromHeaders(request));
});
