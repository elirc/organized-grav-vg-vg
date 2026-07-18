import { withRoute } from "@/lib/api";
import { getDashboardData } from "@/services/dashboard.service";

export const GET = withRoute({}, async ({ user }) => {
  return getDashboardData(user);
});
