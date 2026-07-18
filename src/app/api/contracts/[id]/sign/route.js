import { withRoute } from "@/lib/api";
import { contractSignSchema } from "@/lib/validators";
import { signContract } from "@/services/contract.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const POST = withRoute(
  { permission: "contracts.view", bodySchema: contractSignSchema },
  async ({ user, params, body, request }) => {
    return signContract(user, params.id, body, requestMetaFromHeaders(request));
  },
);
