import { withRoute } from "@/lib/api";
import { contractCreateSchema } from "@/lib/validators";
import { createContract, listContracts } from "@/services/contract.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const GET = withRoute({ permission: "contracts.view" }, async ({ user, query }) => {
  return listContracts(user, query);
});

export const POST = withRoute(
  { permission: "contracts.manage", bodySchema: contractCreateSchema },
  async ({ user, body, request }) => {
    return createContract(user, body, requestMetaFromHeaders(request));
  },
);
