import { withRoute } from "@/lib/api";
import { onboardingUpdateSchema } from "@/lib/validators";
import { updateOnboardingChecklist } from "@/services/employee.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";

export const PATCH = withRoute(
  { permission: "employees.edit", bodySchema: onboardingUpdateSchema },
  async ({ user, params, body, request }) => {
    return updateOnboardingChecklist(user, params.id, body.items, requestMetaFromHeaders(request));
  },
);
