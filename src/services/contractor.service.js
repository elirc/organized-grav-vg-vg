import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { resolveOrganizationId } from "@/services/context";
import { writeAuditLog } from "@/lib/audit";

export async function listContractors(user, filters = {}) {
  const organizationId = resolveOrganizationId(user, filters.organizationId);

  return db.contractor.findMany({
    where: {
      organizationId,
      ...(filters.status ? { status: filters.status } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function createContractor(user, payload, requestMeta = {}) {
  const organizationId = resolveOrganizationId(user, payload.organizationId);

  return db.$transaction(async (tx) => {
    const created = await tx.contractor.create({
      data: {
        organizationId,
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email.toLowerCase(),
        country: payload.country,
        status: "ONBOARDING",
        onboardingStatus: "INVITED",
        classificationScore: payload.classificationScore || 0,
        classificationRisk: payload.classificationRisk || null,
      },
    });

    await writeAuditLog(tx, {
      organizationId,
      userId: user.id,
      action: "contractor.created",
      resourceType: "Contractor",
      resourceId: created.id,
      changes: payload,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    return created;
  });
}

export async function updateContractor(user, id, payload, requestMeta = {}) {
  const existing = await db.contractor.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, "Contractor not found");
  }

  resolveOrganizationId(user, existing.organizationId);

  return db.$transaction(async (tx) => {
    const updated = await tx.contractor.update({
      where: { id },
      data: payload,
    });

    await writeAuditLog(tx, {
      organizationId: existing.organizationId,
      userId: user.id,
      action: "contractor.updated",
      resourceType: "Contractor",
      resourceId: id,
      changes: {
        before: existing,
        after: updated,
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    return updated;
  });
}

export async function convertContractorToEmployee(user, id, payload, requestMeta = {}) {
  const contractor = await db.contractor.findUnique({
    where: { id },
  });

  if (!contractor) {
    throw new AppError(404, "Contractor not found");
  }

  const organizationId = resolveOrganizationId(user, contractor.organizationId);

  return db.$transaction(async (tx) => {
    const employee = await tx.employee.create({
      data: {
        organizationId,
        firstName: contractor.firstName,
        lastName: contractor.lastName,
        personalEmail: contractor.email,
        employmentCountry: payload.employmentCountry || contractor.country,
        jobTitle: payload.jobTitle,
        department: payload.department || null,
        startDate: new Date(payload.startDate),
        status: "ONBOARDING",
        onboardingStatus: "INVITED",
      },
    });

    await tx.contractor.update({
      where: { id },
      data: {
        status: "TERMINATED",
      },
    });

    await writeAuditLog(tx, {
      organizationId,
      userId: user.id,
      action: "contractor.converted",
      resourceType: "Contractor",
      resourceId: id,
      changes: {
        employeeId: employee.id,
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    return employee;
  });
}
