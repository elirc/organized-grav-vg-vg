import { resolveOrganizationId, isPlatformAdmin } from "@/services/context";
import { db } from "@/lib/db";

export async function headcountReport(user, filters = {}) {
  const organizationId = resolveOrganizationId(user, filters.organizationId);

  const byCountry = await db.employee.groupBy({
    by: ["employmentCountry"],
    where: {
      organizationId,
      status: {
        in: ["ONBOARDING", "ACTIVE", "ON_LEAVE"],
      },
    },
    _count: {
      _all: true,
    },
  });

  const byDepartment = await db.employee.groupBy({
    by: ["department"],
    where: {
      organizationId,
      status: {
        in: ["ONBOARDING", "ACTIVE", "ON_LEAVE"],
      },
    },
    _count: {
      _all: true,
    },
  });

  return {
    organizationId,
    byCountry,
    byDepartment,
  };
}

export async function payrollSummaryReport(user, filters = {}) {
  const organizationId = resolveOrganizationId(user, filters.organizationId);

  const runs = await db.payrollRun.findMany({
    where: {
      organizationId,
    },
    orderBy: {
      periodStart: "desc",
    },
    take: 24,
  });

  const totals = runs.reduce(
    (acc, run) => {
      acc.gross += Number(run.totalGrossMinor || 0);
      acc.net += Number(run.totalNetMinor || 0);
      acc.employerCost += Number(run.totalEmployerCostMinor || 0);
      return acc;
    },
    { gross: 0, net: 0, employerCost: 0 },
  );

  return {
    organizationId,
    runs,
    totals,
  };
}

export async function turnoverReport(user, filters = {}) {
  const organizationId = resolveOrganizationId(user, filters.organizationId);

  const hires = await db.employee.count({
    where: {
      organizationId,
      createdAt: filters.startDate
        ? {
            gte: new Date(filters.startDate),
            lte: filters.endDate ? new Date(filters.endDate) : new Date(),
          }
        : undefined,
    },
  });

  const terminations = await db.employee.count({
    where: {
      organizationId,
      status: "TERMINATED",
      updatedAt: filters.startDate
        ? {
            gte: new Date(filters.startDate),
            lte: filters.endDate ? new Date(filters.endDate) : new Date(),
          }
        : undefined,
    },
  });

  return {
    organizationId,
    hires,
    terminations,
  };
}

export async function platformAdminSummary(user) {
  if (!isPlatformAdmin(user)) {
    return null;
  }

  const [organizations, activeClients, totalHeadcount, recentOnboardings] = await Promise.all([
    db.organization.count(),
    db.organization.count({ where: { status: "ACTIVE" } }),
    db.employee.count({
      where: {
        status: {
          in: ["ONBOARDING", "ACTIVE", "ON_LEAVE"],
        },
      },
    }),
    db.organization.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
  ]);

  return {
    organizations,
    activeClients,
    totalHeadcount,
    recentOnboardings,
  };
}
