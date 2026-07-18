import { withRoute } from "@/lib/api";
import { employeeUpdateSchema } from "@/lib/validators";
import { getEmployee, updateEmployee } from "@/services/employee.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const GET = withRoute({ permission: "employees.view" }, async ({ user, params }) => {
  return getEmployee(user, params.id);
});

export const PATCH = withRoute(
  { permission: "employees.edit", bodySchema: employeeUpdateSchema },
  async ({ user, params, body, request }) => {
    return updateEmployee(user, params.id, body, requestMetaFromHeaders(request));
  },
);
