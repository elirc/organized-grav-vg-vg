import { withRoute } from "@/lib/api";
import { payrollSummaryReport } from "@/services/report.service";

export const GET = withRoute({ permission: "reports.view" }, async ({ user, query }) => {
  return payrollSummaryReport(user, query);
});
