import { withRoute } from "@/lib/api";
import { markAllNotificationsRead } from "@/services/notification.service";

export const POST = withRoute({ permission: "notifications.view" }, async ({ user }) => {
  return markAllNotificationsRead(user);
});
