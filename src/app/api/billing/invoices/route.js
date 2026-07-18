import { withRoute } from "@/lib/api";
import { listInvoices } from "@/services/billing.service";

export const GET = withRoute({ permission: "billing.view" }, async ({ user, query }) => {
  return listInvoices(user, query.organizationId || null);
});
