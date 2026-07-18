import { withRoute } from "@/lib/api";
import { contractorConvertSchema } from "@/lib/validators";
import { convertContractorToEmployee } from "@/services/contractor.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const POST = withRoute(
  { permission: "contractors.manage", bodySchema: contractorConvertSchema },
  async ({ user, params, body, request }) => {
    return convertContractorToEmployee(user, params.id, body, requestMetaFromHeaders(request));
  },
);
