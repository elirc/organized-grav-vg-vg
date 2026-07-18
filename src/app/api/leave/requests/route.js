import { withRoute } from "@/lib/api";
import { leaveRequestCreateSchema } from "@/lib/validators";
import { createLeaveRequest, listLeaveRequests } from "@/services/leave.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const GET = withRoute({ permission: "leave.request" }, async ({ user, query }) => {
  return listLeaveRequests(user, query);
});

export const POST = withRoute(
  { permission: "leave.request", bodySchema: leaveRequestCreateSchema },
  async ({ user, body, request }) => {
    return createLeaveRequest(user, body, requestMetaFromHeaders(request));
  },
);
