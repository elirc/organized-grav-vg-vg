import { db } from "@/lib/db";
import { resolveOrganizationId } from "@/services/context";
import { enqueue } from "@/lib/queue";

export async function createNotification({
  userId,
  type = "IN_APP",
  category = "SYSTEM",
  title,
  body,
  actionUrl = null,
}) {
  const notification = await db.notification.create({
    data: {
      userId,
      type,
      category,
      title,
      body,
      actionUrl,
    },
  });

  await enqueue("notification.dispatch", {
    notificationId: notification.id,
    type,
  });

  return notification;
}

export async function listNotifications(user) {
  return db.notification.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });
}

export async function markNotificationRead(user, id) {
  return db.notification.updateMany({
    where: {
      id,
      userId: user.id,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

export async function markAllNotificationsRead(user) {
  return db.notification.updateMany({
    where: {
      userId: user.id,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

export async function getOrganizationUsers(user, explicitOrganizationId = null) {
  const organizationId = resolveOrganizationId(user, explicitOrganizationId);

  return db.user.findMany({
    where: {
      organizationId,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });
}
