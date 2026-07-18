import { withRoute } from "@/lib/api";
import { contractUpdateSchema } from "@/lib/validators";
import { getContract, updateContract } from "@/services/contract.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const GET = withRoute({ permission: "contracts.view" }, async ({ user, params }) => {
  return getContract(user, params.id);
});

export const PATCH = withRoute(
  { permission: "contracts.manage", bodySchema: contractUpdateSchema },
  async ({ user, params, body, request }) => {
    return updateContract(user, params.id, body, requestMetaFromHeaders(request));
  },
);
