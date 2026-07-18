import { withRoute } from "@/lib/api";
import { sendContractForSignature } from "@/services/contract.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const POST = withRoute({ permission: "contracts.manage" }, async ({ user, params, request }) => {
  return sendContractForSignature(user, params.id, requestMetaFromHeaders(request));
});
