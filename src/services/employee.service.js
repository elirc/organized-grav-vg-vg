import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";
import { publishDomainEvent } from "@/lib/events";
import { resolveOrganizationId } from "@/services/context";
import { toMinorUnits } from "@/lib/money";
import { encryptField, decryptField } from "@/lib/crypto";
import { createNotification } from "@/services/notification.service";
import { mapEmployeeCsvRow, validateMappedEmployeeRow } from "@/lib/csv";

function defaultChecklist() {
  return [
    { key: "personal_information", label: "Personal information", required: true, status: "NOT_STARTED" },
    { key: "identity_verification", label: "Identity verification", required: true, status: "NOT_STARTED" },
    { key: "employment_details", label: "Employment details", required: true, status: "NOT_STARTED" },
    { key: "contract_review", label: "Contract review and signing", required: true, status: "NOT_STARTED" },
    { key: "tax_information", label: "Tax information", required: true, status: "NOT_STARTED" },
    { key: "bank_details", label: "Bank details", required: true, status: "NOT_STARTED" },
    { key: "benefits_enrollment", label: "Benefits enrollment", required: false, status: "NOT_STARTED" },
    { key: "policy_acknowledgment", label: "Policy acknowledgment", required: true, status: "NOT_STARTED" },
  ];
}

function sanitizeEmployeeOutput(employee) {
  if (!employee) {
    return employee;
  }

  return {
    ...employee,
    bankAccountEncrypted: employee.bankAccountEncrypted ? decryptField(employee.bankAccountEncrypted) : null,
  };
}

export async function listEmployees(user, filters = {}) {
  const organizationId = resolveOrganizationId(user, filters.organizationId);

  const where = {
    organizationId,
  };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: "insensitive" } },
      { lastName: { contains: filters.search, mode: "insensitive" } },
      { personalEmail: { contains: filters.search, mode: "insensitive" } },
      { workEmail: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const employees = await db.employee.findMany({
    where,
    include: {
      manager: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      onboardingChecklist: true,
      compensations: {
        where: {
          isCurrent: true,
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return employees.map(sanitizeEmployeeOutput);
}

export async function getEmployee(user, employeeId) {
  const employee = await db.employee.findUnique({
    where: {
      id: employeeId,
    },
    include: {
      onboardingChecklist: true,
      compensations: {
        orderBy: {
          effectiveDate: "desc",
        },
      },
      contracts: {
        orderBy: {
          createdAt: "desc",
        },
      },
      leaveBalances: {
        include: {
          policy: true,
        },
      },
    },
  });

  if (!employee) {
    throw new AppError(404, "Employee not found");
  }

  const organizationId = resolveOrganizationId(user, employee.organizationId);
  if (organizationId !== employee.organizationId) {
    throw new AppError(403, "Tenant access denied");
  }

  return sanitizeEmployeeOutput(employee);
}

export async function createEmployee(user, payload, requestMeta = {}) {
  const organizationId = resolveOrganizationId(user, payload.organizationId);

  return db.$transaction(async (tx) => {
    const employee = await tx.employee.create({
      data: {
        organizationId,
        firstName: payload.firstName,
        lastName: payload.lastName,
        personalEmail: payload.personalEmail.toLowerCase(),
        workEmail: payload.workEmail?.toLowerCase() || null,
        phone: payload.phone || null,
        employmentCountry: payload.employmentCountry,
        jobTitle: payload.jobTitle,
        department: payload.department || null,
        managerId: payload.managerId || null,
        startDate: new Date(payload.startDate),
        status: "ONBOARDING",
        onboardingStatus: "INVITED",
      },
    });

    await tx.onboardingChecklist.create({
      data: {
        employeeId: employee.id,
        items: defaultChecklist(),
      },
    });

    if (payload.compensationAmount) {
      await tx.compensation.create({
        data: {
          employeeId: employee.id,
          amountMinor: toMinorUnits(payload.compensationAmount),
          currency: payload.compensationCurrency || "USD",
          payFrequency: payload.payFrequency || "MONTHLY",
          effectiveDate: new Date(payload.startDate),
          isCurrent: true,
        },
      });
    }

    await writeAuditLog(tx, {
      organizationId,
      userId: user.id,
      action: "employee.created",
      resourceType: "Employee",
      resourceId: employee.id,
      changes: payload,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    await publishDomainEvent(tx, {
      organizationId,
      eventType: "employee.created",
      aggregateType: "Employee",
      aggregateId: employee.id,
      payload: {
        employeeId: employee.id,
        personalEmail: employee.personalEmail,
      },
    });

    return employee;
  });
}

export async function updateEmployee(user, employeeId, payload, requestMeta = {}) {
  const current = await db.employee.findUnique({
    where: { id: employeeId },
  });

  if (!current) {
    throw new AppError(404, "Employee not found");
  }

  resolveOrganizationId(user, current.organizationId);

  return db.$transaction(async (tx) => {
    const updated = await tx.employee.update({
      where: { id: employeeId },
      data: payload,
    });

    await writeAuditLog(tx, {
      organizationId: current.organizationId,
      userId: user.id,
      action: "employee.updated",
      resourceType: "Employee",
      resourceId: employeeId,
      changes: {
        before: current,
        after: updated,
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    await publishDomainEvent(tx, {
      organizationId: current.organizationId,
      eventType: "employee.updated",
      aggregateType: "Employee",
      aggregateId: employeeId,
      payload: {
        employeeId,
        updates: payload,
      },
    });

    return updated;
  });
}

export async function updateOnboardingChecklist(user, employeeId, items, requestMeta = {}) {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new AppError(404, "Employee not found");
  }

  resolveOrganizationId(user, employee.organizationId);

  const allRequiredSubmitted = items
    .filter((item) => item.required)
    .every((item) => ["SUBMITTED", "VERIFIED"].includes(item.status));

  return db.$transaction(async (tx) => {
    const checklist = await tx.onboardingChecklist.upsert({
      where: {
        employeeId,
      },
      update: {
        items,
        completedAt: allRequiredSubmitted ? new Date() : null,
      },
      create: {
        employeeId,
        items,
        completedAt: allRequiredSubmitted ? new Date() : null,
      },
    });

    const onboardingStatus = allRequiredSubmitted ? "PENDING_REVIEW" : "IN_PROGRESS";

    await tx.employee.update({
      where: {
        id: employeeId,
      },
      data: {
        onboardingStatus,
      },
    });

    await writeAuditLog(tx, {
      organizationId: employee.organizationId,
      userId: user.id,
      action: "employee.onboarding.updated",
      resourceType: "OnboardingChecklist",
      resourceId: checklist.id,
      changes: {
        items,
        onboardingStatus,
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    if (allRequiredSubmitted) {
      const admins = await tx.user.findMany({
        where: {
          organizationId: employee.organizationId,
          userRoles: {
            some: {
              role: {
                name: "CLIENT_ADMIN",
              },
            },
          },
        },
        select: { id: true },
      });

      for (const admin of admins) {
        await tx.notification.create({
          data: {
            userId: admin.id,
            category: "ONBOARDING",
            type: "IN_APP",
            title: "Onboarding review required",
            body: `${employee.firstName} ${employee.lastName} completed onboarding items and needs review.`,
            actionUrl: `/employees/${employee.id}/onboarding`,
          },
        });
      }
    }

    return checklist;
  });
}

export async function addCompensationRecord(user, employeeId, payload, requestMeta = {}) {
  const employee = await db.employee.findUnique({ where: { id: employeeId } });

  if (!employee) {
    throw new AppError(404, "Employee not found");
  }

  resolveOrganizationId(user, employee.organizationId);

  return db.$transaction(async (tx) => {
    const current = await tx.compensation.findFirst({
      where: {
        employeeId,
        isCurrent: true,
      },
      orderBy: {
        effectiveDate: "desc",
      },
    });

    if (current) {
      await tx.compensation.update({
        where: { id: current.id },
        data: {
          isCurrent: false,
        },
      });
    }

    const created = await tx.compensation.create({
      data: {
        employeeId,
        amountMinor: toMinorUnits(payload.amount),
        currency: payload.currency,
        payFrequency: payload.payFrequency,
        effectiveDate: new Date(payload.effectiveDate),
        previousId: current?.id || null,
        isCurrent: true,
      },
    });

    await writeAuditLog(tx, {
      organizationId: employee.organizationId,
      userId: user.id,
      action: "employee.compensation.created",
      resourceType: "Compensation",
      resourceId: created.id,
      changes: payload,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    await publishDomainEvent(tx, {
      organizationId: employee.organizationId,
      eventType: "employee.compensation.changed",
      aggregateType: "Employee",
      aggregateId: employeeId,
      payload: {
        employeeId,
        compensationId: created.id,
        amountMinor: String(created.amountMinor),
      },
    });

    return created;
  });
}

export async function inviteEmployeeNotification(employee) {
  const users = await db.user.findMany({
    where: {
      organizationId: employee.organizationId,
      userRoles: {
        some: {
          role: {
            name: "CLIENT_ADMIN",
          },
        },
      },
    },
    select: { id: true },
  });

  await Promise.all(
    users.map((user) =>
      createNotification({
        userId: user.id,
        category: "ONBOARDING",
        title: "New employee added",
        body: `${employee.firstName} ${employee.lastName} was added and onboarding is pending.`,
        actionUrl: `/employees/${employee.id}`,
      }),
    ),
  );
}

export async function importEmployeesFromCsvRows(user, csvRows, requestMeta = {}) {
  const MAX_IMPORT_ROWS = 500;
  if (!Array.isArray(csvRows) || csvRows.length === 0) {
    throw new AppError(400, "CSV has no data rows.");
  }

  if (csvRows.length > MAX_IMPORT_ROWS) {
    throw new AppError(400, `CSV exceeds ${MAX_IMPORT_ROWS} row limit.`);
  }

  const results = [];
  let createdCount = 0;

  for (let index = 0; index < csvRows.length; index += 1) {
    const rowNumber = index + 2;
    const mapped = mapEmployeeCsvRow(csvRows[index]);
    const validation = validateMappedEmployeeRow(mapped);

    if (!validation.valid) {
      results.push({
        rowNumber,
        status: "failed",
        errors: validation.errors,
      });
      continue;
    }

    try {
      const payload = {
        firstName: mapped.firstName,
        lastName: mapped.lastName,
        personalEmail: mapped.personalEmail,
        workEmail: mapped.workEmail || null,
        employmentCountry: mapped.employmentCountry,
        jobTitle: mapped.jobTitle,
        department: mapped.department || null,
        startDate: new Date(mapped.startDate).toISOString(),
        compensationAmount: mapped.compensationAmount || null,
        compensationCurrency: mapped.compensationCurrency || "USD",
        payFrequency: mapped.payFrequency || "MONTHLY",
      };

      const employee = await createEmployee(user, payload, requestMeta);
      await inviteEmployeeNotification(employee);

      createdCount += 1;
      results.push({
        rowNumber,
        status: "created",
        employeeId: employee.id,
      });
    } catch (error) {
      results.push({
        rowNumber,
        status: "failed",
        errors: [error.message || "Unknown import error"],
      });
    }
  }

  return {
    totalRows: csvRows.length,
    createdCount,
    failedCount: csvRows.length - createdCount,
    results,
  };
}
