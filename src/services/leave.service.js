import { differenceInCalendarDays } from "date-fns";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";
import { publishDomainEvent } from "@/lib/events";
import { resolveOrganizationId } from "@/services/context";

function toDecimal(value) {
  return Number.parseFloat(String(value || 0));
}

function totalLeaveDays(startDate, endDate) {
  return differenceInCalendarDays(new Date(endDate), new Date(startDate)) + 1;
}

export async function listLeavePolicies(user, organizationId = null) {
  const resolvedOrganizationId = resolveOrganizationId(user, organizationId);

  return db.leavePolicy.findMany({
    where: {
      OR: [{ organizationId: null }, { organizationId: resolvedOrganizationId }],
      isActive: true,
    },
    orderBy: [{ organizationId: "desc" }, { name: "asc" }],
  });
}

export async function createLeavePolicy(user, payload, requestMeta = {}) {
  const organizationId = resolveOrganizationId(user, payload.organizationId);

  return db.$transaction(async (tx) => {
    const created = await tx.leavePolicy.create({
      data: {
        organizationId,
        countryCode: payload.countryCode || null,
        name: payload.name,
        leaveType: payload.leaveType,
        accrualRate: payload.accrualRate,
        accrualCadence: payload.accrualCadence || "MONTHLY",
        carryOverLimitDays: payload.carryOverLimitDays || null,
        maxBalanceDays: payload.maxBalanceDays || null,
        requiresApproval: payload.requiresApproval ?? true,
      },
    });

    await writeAuditLog(tx, {
      organizationId,
      userId: user.id,
      action: "leave.policy.created",
      resourceType: "LeavePolicy",
      resourceId: created.id,
      changes: payload,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    return created;
  });
}

export async function listLeaveBalances(user, employeeId = null) {
  const where = {};

  if (employeeId) {
    where.employeeId = employeeId;
  }

  if (!user.roles.includes("PLATFORM_ADMIN")) {
    where.organizationId = user.organizationId;
  }

  return db.leaveBalance.findMany({
    where,
    include: {
      employee: true,
      policy: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export async function listLeaveRequests(user, filters = {}) {
  const organizationId = resolveOrganizationId(user, filters.organizationId);

  const where = {
    organizationId,
  };

  if (filters.employeeId) {
    where.employeeId = filters.employeeId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  return db.leaveRequest.findMany({
    where,
    include: {
      employee: true,
      policy: true,
      approvedBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      submittedAt: "desc",
    },
  });
}

export async function createLeaveRequest(user, payload, requestMeta = {}) {
  const employee = await db.employee.findUnique({
    where: {
      id: payload.employeeId,
    },
  });

  if (!employee) {
    throw new AppError(404, "Employee not found");
  }

  const organizationId = resolveOrganizationId(user, employee.organizationId);

  const policy = await db.leavePolicy.findUnique({
    where: {
      id: payload.policyId,
    },
  });

  if (!policy) {
    throw new AppError(404, "Leave policy not found");
  }

  const requestedDays = payload.totalDays || totalLeaveDays(payload.startDate, payload.endDate);

  return db.$transaction(async (tx) => {
    let balance = await tx.leaveBalance.findFirst({
      where: {
        employeeId: payload.employeeId,
        policyId: payload.policyId,
      },
    });

    if (!balance) {
      balance = await tx.leaveBalance.create({
        data: {
          organizationId,
          employeeId: payload.employeeId,
          policyId: payload.policyId,
          balanceDays: 0,
          usedDays: 0,
          pendingDays: 0,
        },
      });
    }

    const available = toDecimal(balance.balanceDays) - toDecimal(balance.pendingDays) - toDecimal(balance.usedDays);

    if (available < requestedDays) {
      throw new AppError(400, "Insufficient leave balance");
    }

    const created = await tx.leaveRequest.create({
      data: {
        organizationId,
        employeeId: payload.employeeId,
        policyId: payload.policyId,
        startDate: new Date(payload.startDate),
        endDate: new Date(payload.endDate),
        totalDays: requestedDays,
        reason: payload.reason || null,
        status: "PENDING",
      },
      include: {
        employee: true,
      },
    });

    await tx.leaveBalance.update({
      where: {
        id: balance.id,
      },
      data: {
        pendingDays: toDecimal(balance.pendingDays) + requestedDays,
      },
    });

    await writeAuditLog(tx, {
      organizationId,
      userId: user.id,
      action: "leave.request.created",
      resourceType: "LeaveRequest",
      resourceId: created.id,
      changes: payload,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    await publishDomainEvent(tx, {
      organizationId,
      eventType: "leave.requested",
      aggregateType: "LeaveRequest",
      aggregateId: created.id,
      payload: {
        leaveRequestId: created.id,
        employeeId: created.employeeId,
      },
    });

    return created;
  });
}

export async function decideLeaveRequest(user, requestId, payload, requestMeta = {}) {
  const leaveRequest = await db.leaveRequest.findUnique({
    where: {
      id: requestId,
    },
  });

  if (!leaveRequest) {
    throw new AppError(404, "Leave request not found");
  }

  const organizationId = resolveOrganizationId(user, leaveRequest.organizationId);

  if (leaveRequest.status !== "PENDING") {
    throw new AppError(400, "Leave request is not pending");
  }

  const action = payload.action;
  if (!["APPROVE", "REJECT", "CANCEL"].includes(action)) {
    throw new AppError(400, "Invalid action");
  }

  return db.$transaction(async (tx) => {
    const balance = await tx.leaveBalance.findFirst({
      where: {
        employeeId: leaveRequest.employeeId,
        policyId: leaveRequest.policyId,
      },
    });

    if (!balance) {
      throw new AppError(404, "Leave balance not found");
    }

    let nextStatus = "PENDING";
    let pendingDays = toDecimal(balance.pendingDays);
    let usedDays = toDecimal(balance.usedDays);

    if (action === "APPROVE") {
      nextStatus = "APPROVED";
      pendingDays -= toDecimal(leaveRequest.totalDays);
      usedDays += toDecimal(leaveRequest.totalDays);
    }

    if (action === "REJECT") {
      nextStatus = "REJECTED";
      pendingDays -= toDecimal(leaveRequest.totalDays);
    }

    if (action === "CANCEL") {
      nextStatus = "CANCELED";
      pendingDays -= toDecimal(leaveRequest.totalDays);
    }

    pendingDays = Math.max(0, pendingDays);

    await tx.leaveBalance.update({
      where: {
        id: balance.id,
      },
      data: {
        pendingDays,
        usedDays,
      },
    });

    const updated = await tx.leaveRequest.update({
      where: {
        id: requestId,
      },
      data: {
        status: nextStatus,
        managerComment: payload.comment || null,
        approvedById: action === "APPROVE" ? user.id : null,
        decidedAt: new Date(),
      },
    });

    await writeAuditLog(tx, {
      organizationId,
      userId: user.id,
      action: `leave.request.${nextStatus.toLowerCase()}`,
      resourceType: "LeaveRequest",
      resourceId: requestId,
      changes: payload,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    await publishDomainEvent(tx, {
      organizationId,
      eventType: `leave.${nextStatus.toLowerCase()}`,
      aggregateType: "LeaveRequest",
      aggregateId: requestId,
      payload: {
        leaveRequestId: requestId,
        status: nextStatus,
      },
    });

    return updated;
  });
}
