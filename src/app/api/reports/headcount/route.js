import { withRoute } from "@/lib/api";
import { headcountReport } from "@/services/report.service";

export const GET = withRoute({ permission: "reports.view" }, async ({ user, query }) => {
  return headcountReport(user, query);
});
