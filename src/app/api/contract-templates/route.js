import { withRoute } from "@/lib/api";
import { contractTemplateCreateSchema } from "@/lib/validators";
import { createContractTemplate, listContractTemplates } from "@/services/contract.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const GET = withRoute({ permission: "contracts.view" }, async ({ user, query }) => {
  return listContractTemplates(user, query.organizationId || null);
});

export const POST = withRoute(
  { permission: "templates.manage", bodySchema: contractTemplateCreateSchema },
  async ({ user, body, request }) => {
    return createContractTemplate(user, body, requestMetaFromHeaders(request));
  },
);
