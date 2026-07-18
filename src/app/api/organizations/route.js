import { withRoute } from "@/lib/api";
import { organizationCreateSchema } from "@/lib/validators";
import { createOrganization, listOrganizations } from "@/services/org.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const GET = withRoute({ permission: "organizations.view" }, async ({ user }) => {
  return listOrganizations(user);
});

export const POST = withRoute(
  { permission: "organizations.manage", bodySchema: organizationCreateSchema },
  async ({ user, body, request }) => {
    return createOrganization(user, body, requestMetaFromHeaders(request));
  },
);
