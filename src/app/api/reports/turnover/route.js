import { withRoute } from "@/lib/api";
import { turnoverReport } from "@/services/report.service";

export const GET = withRoute({ permission: "reports.view" }, async ({ user, query }) => {
  return turnoverReport(user, query);
});
