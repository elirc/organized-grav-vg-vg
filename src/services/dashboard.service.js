import { db } from "@/lib/db";
import { resolveOrganizationId, isPlatformAdmin } from "@/services/context";
import { platformAdminSummary } from "@/services/report.service";

export async function getDashboardData(user) {
  if (isPlatformAdmin(user)) {
    const platform = await platformAdminSummary(user);
    return {
      scope: "platform",
      ...platform,
    };
  }

  const organizationId = resolveOrganizationId(user);

  const [headcount, pendingOnboarding, pendingPayroll, unreadNotifications, lastPayrollRun] = await Promise.all([
    db.employee.count({
      where: {
        organizationId,
        status: {
          in: ["ACTIVE", "ONBOARDING", "ON_LEAVE"],
        },
      },
    }),
    db.employee.count({
      where: {
        organizationId,
        onboardingStatus: {
          in: ["IN_PROGRESS", "PENDING_REVIEW"],
        },
      },
    }),
    db.payrollRun.count({
      where: {
        organizationId,
        status: "PENDING_APPROVAL",
      },
    }),
    db.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    }),
    db.payrollRun.findFirst({
      where: {
        organizationId,
      },
      orderBy: {
        periodEnd: "desc",
      },
    }),
  ]);

  return {
    scope: "organization",
    organizationId,
    headcount,
    pendingOnboarding,
    pendingPayroll,
    unreadNotifications,
    lastPayrollRun,
  };
}
