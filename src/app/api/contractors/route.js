import { withRoute } from "@/lib/api";
import { contractorCreateSchema } from "@/lib/validators";
import { createContractor, listContractors } from "@/services/contractor.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const GET = withRoute({ permission: "contractors.view" }, async ({ user, query }) => {
  return listContractors(user, query);
});

export const POST = withRoute(
  { permission: "contractors.manage", bodySchema: contractorCreateSchema },
  async ({ user, body, request }) => {
    return createContractor(user, body, requestMetaFromHeaders(request));
  },
);
