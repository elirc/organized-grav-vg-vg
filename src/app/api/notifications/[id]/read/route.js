import { withRoute } from "@/lib/api";
import { markNotificationRead } from "@/services/notification.service";

export const PATCH = withRoute({ permission: "notifications.view" }, async ({ user, params }) => {
  return markNotificationRead(user, params.id);
});
