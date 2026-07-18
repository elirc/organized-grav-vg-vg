import { withRoute } from "@/lib/api";
import { invoiceGenerateSchema } from "@/lib/validators";
import { generateMonthlyInvoice } from "@/services/billing.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const POST = withRoute(
  { permission: "billing.manage", bodySchema: invoiceGenerateSchema },
  async ({ user, body, request }) => {
    return generateMonthlyInvoice(user, body, requestMetaFromHeaders(request));
  },
);
