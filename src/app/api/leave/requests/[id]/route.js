import { withRoute } from "@/lib/api";
import { leaveDecisionSchema } from "@/lib/validators";
import { decideLeaveRequest } from "@/services/leave.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const PATCH = withRoute(
  { permission: "leave.approve", bodySchema: leaveDecisionSchema },
  async ({ user, params, body, request }) => {
    return decideLeaveRequest(user, params.id, body, requestMetaFromHeaders(request));
  },
);
