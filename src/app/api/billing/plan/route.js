import { withRoute } from "@/lib/api";
import { listPricingPlans } from "@/services/billing.service";

export const GET = withRoute({ permission: "billing.view" }, async () => {
  return listPricingPlans();
});
