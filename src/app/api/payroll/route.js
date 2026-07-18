import { withRoute } from "@/lib/api";
import { payrollCreateSchema } from "@/lib/validators";
import { createPayrollRun, listPayrollRuns } from "@/services/payroll.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const GET = withRoute({ permission: "payroll.view" }, async ({ user, query }) => {
  return listPayrollRuns(user, query.organizationId || null);
});

export const POST = withRoute(
  { permission: "payroll.process", bodySchema: payrollCreateSchema },
  async ({ user, body, request }) => {
    return createPayrollRun(user, body, requestMetaFromHeaders(request));
  },
);
