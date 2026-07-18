import { withRoute } from "@/lib/api";
import { contractorUpdateSchema } from "@/lib/validators";
import { updateContractor } from "@/services/contractor.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const PATCH = withRoute(
  { permission: "contractors.manage", bodySchema: contractorUpdateSchema },
  async ({ user, params, body, request }) => {
    return updateContractor(user, params.id, body, requestMetaFromHeaders(request));
  },
);
