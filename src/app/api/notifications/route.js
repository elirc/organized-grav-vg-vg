import { withRoute } from "@/lib/api";
import { listNotifications } from "@/services/notification.service";

export const GET = withRoute({ permission: "notifications.view" }, async ({ user }) => {
  return listNotifications(user);
});
