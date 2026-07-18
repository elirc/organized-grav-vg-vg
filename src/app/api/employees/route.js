import { withRoute } from "@/lib/api";
import { employeeCreateSchema } from "@/lib/validators";
import { createEmployee, listEmployees, inviteEmployeeNotification } from "@/services/employee.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const GET = withRoute({ permission: "employees.view" }, async ({ user, query }) => {
  return listEmployees(user, query);
});

export const POST = withRoute(
  { permission: "employees.create", bodySchema: employeeCreateSchema },
  async ({ user, body, request }) => {
    const employee = await createEmployee(user, body, requestMetaFromHeaders(request));
    await inviteEmployeeNotification(employee);
    return employee;
  },
);
