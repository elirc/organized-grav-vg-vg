import { withRoute } from "@/lib/api";
import { organizationUpdateSchema } from "@/lib/validators";
import { getOrganization, updateOrganization } from "@/services/org.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const GET = withRoute({ permission: "organizations.view" }, async ({ user, params }) => {
  return getOrganization(user, params.id);
});

export const PATCH = withRoute(
  { permission: "organizations.manage", bodySchema: organizationUpdateSchema },
  async ({ user, params, body, request }) => {
    return updateOrganization(user, params.id, body, requestMetaFromHeaders(request));
  },
);
