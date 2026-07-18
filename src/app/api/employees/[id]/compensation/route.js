import { withRoute } from "@/lib/api";
import { compensationCreateSchema } from "@/lib/validators";
import { addCompensationRecord } from "@/services/employee.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const POST = withRoute(
  { permission: "employees.edit", bodySchema: compensationCreateSchema },
  async ({ user, params, body, request }) => {
    return addCompensationRecord(user, params.id, body, requestMetaFromHeaders(request));
  },
);
