import { withRoute } from "@/lib/api";
import { leavePolicyCreateSchema } from "@/lib/validators";
import { createLeavePolicy, listLeavePolicies } from "@/services/leave.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const GET = withRoute({ permission: "leave.request" }, async ({ user, query }) => {
  return listLeavePolicies(user, query.organizationId || null);
});

export const POST = withRoute(
  { permission: "settings.manage", bodySchema: leavePolicyCreateSchema },
  async ({ user, body, request }) => {
    return createLeavePolicy(user, body, requestMetaFromHeaders(request));
  },
);
