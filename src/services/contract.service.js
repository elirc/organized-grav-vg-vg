import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";
import { publishDomainEvent } from "@/lib/events";
import { resolveOrganizationId } from "@/services/context";
import { createNotification } from "@/services/notification.service";

function renderMergeFields(templateContent, context) {
  return templateContent.replace(/{{\s*([^}]+?)\s*}}/g, (_, token) => {
    const path = token.split(".");
    let current = context;

    for (const key of path) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        current = "";
        break;
      }
    }

    if (current === null || current === undefined) {
      return "";
    }

    return String(current);
  });
}

async function resolveTemplateForContract(organizationId, payload) {
  if (payload.templateId) {
    return db.contractTemplate.findUnique({ where: { id: payload.templateId } });
  }

  return db.contractTemplate.findFirst({
    where: {
      organizationId,
      type: payload.type,
      isActive: true,
      OR: [
        { countryCode: payload.countryCode || null },
        { countryCode: null },
      ],
    },
    orderBy: [{ countryCode: "desc" }, { version: "desc" }],
  });
}

export async function listContractTemplates(user, organizationId = null) {
  const resolvedOrganizationId = resolveOrganizationId(user, organizationId);

  return db.contractTemplate.findMany({
    where: {
      OR: [{ organizationId: null }, { organizationId: resolvedOrganizationId }],
    },
    orderBy: [{ name: "asc" }, { version: "desc" }],
  });
}

export async function createContractTemplate(user, payload, requestMeta = {}) {
  const organizationId = resolveOrganizationId(user, payload.organizationId);

  return db.$transaction(async (tx) => {
    const latest = await tx.contractTemplate.findFirst({
      where: {
        organizationId,
        name: payload.name,
      },
      orderBy: {
        version: "desc",
      },
    });

    const created = await tx.contractTemplate.create({
      data: {
        organizationId,
        name: payload.name,
        countryCode: payload.countryCode || null,
        type: payload.type,
        version: latest ? latest.version + 1 : 1,
        content: payload.content,
        lockedSections: payload.lockedSections || [],
        isActive: payload.isActive ?? true,
      },
    });

    await writeAuditLog(tx, {
      organizationId,
      userId: user.id,
      action: "contract_template.created",
      resourceType: "ContractTemplate",
      resourceId: created.id,
      changes: payload,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    return created;
  });
}

export async function listContracts(user, filters = {}) {
  const organizationId = resolveOrganizationId(user, filters.organizationId);

  return db.contract.findMany({
    where: {
      organizationId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.contractorId ? { contractorId: filters.contractorId } : {}),
    },
    include: {
      employee: true,
      contractor: true,
      template: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getContract(user, id) {
  const contract = await db.contract.findUnique({
    where: { id },
    include: {
      employee: true,
      contractor: true,
      template: true,
      amendments: true,
    },
  });

  if (!contract) {
    throw new AppError(404, "Contract not found");
  }

  resolveOrganizationId(user, contract.organizationId);
  return contract;
}

export async function createContract(user, payload, requestMeta = {}) {
  const organizationId = resolveOrganizationId(user, payload.organizationId);

  if (!payload.employeeId && !payload.contractorId) {
    throw new AppError(400, "Either employeeId or contractorId is required");
  }

  const template = await resolveTemplateForContract(organizationId, payload);
  if (!template) {
    throw new AppError(404, "No matching contract template found");
  }

  const employee = payload.employeeId
    ? await db.employee.findUnique({ where: { id: payload.employeeId } })
    : null;

  const contractor = payload.contractorId
    ? await db.contractor.findUnique({ where: { id: payload.contractorId } })
    : null;

  const context = {
    employee: employee
      ? {
          firstName: employee.firstName,
          lastName: employee.lastName,
          fullName: `${employee.firstName} ${employee.lastName}`,
          jobTitle: employee.jobTitle,
          department: employee.department,
        }
      : null,
    contractor,
    organization: await db.organization.findUnique({ where: { id: organizationId } }),
    compensation: payload.compensation || {},
    startDate: payload.effectiveDate,
    benefits: payload.benefits || {},
  };

  const renderedContent = renderMergeFields(template.content, context);

  return db.$transaction(async (tx) => {
    const created = await tx.contract.create({
      data: {
        organizationId,
        employeeId: payload.employeeId || null,
        contractorId: payload.contractorId || null,
        templateId: template.id,
        templateVersion: template.version,
        type: payload.type || template.type,
        renderedContent,
        customTerms: payload.customTerms || null,
        status: "DRAFT",
        effectiveDate: payload.effectiveDate ? new Date(payload.effectiveDate) : null,
        previousVersionId: payload.previousVersionId || null,
        createdById: user.id,
      },
    });

    await writeAuditLog(tx, {
      organizationId,
      userId: user.id,
      action: "contract.created",
      resourceType: "Contract",
      resourceId: created.id,
      changes: payload,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    await publishDomainEvent(tx, {
      organizationId,
      eventType: "contract.created",
      aggregateType: "Contract",
      aggregateId: created.id,
      payload: {
        contractId: created.id,
        employeeId: created.employeeId,
        contractorId: created.contractorId,
      },
    });

    return created;
  });
}

export async function updateContract(user, id, payload, requestMeta = {}) {
  const existing = await db.contract.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, "Contract not found");
  }

  resolveOrganizationId(user, existing.organizationId);

  return db.$transaction(async (tx) => {
    const updated = await tx.contract.update({
      where: { id },
      data: payload,
    });

    await writeAuditLog(tx, {
      organizationId: existing.organizationId,
      userId: user.id,
      action: "contract.updated",
      resourceType: "Contract",
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

export async function sendContractForSignature(user, id, requestMeta = {}) {
  const contract = await db.contract.findUnique({
    where: { id },
    include: {
      employee: true,
      contractor: true,
    },
  });

  if (!contract) {
    throw new AppError(404, "Contract not found");
  }

  resolveOrganizationId(user, contract.organizationId);

  const updated = await db.$transaction(async (tx) => {
    const sent = await tx.contract.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });

    await writeAuditLog(tx, {
      organizationId: contract.organizationId,
      userId: user.id,
      action: "contract.sent",
      resourceType: "Contract",
      resourceId: id,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    await publishDomainEvent(tx, {
      organizationId: contract.organizationId,
      eventType: "contract.sent",
      aggregateType: "Contract",
      aggregateId: id,
      payload: {
        contractId: id,
      },
    });

    return sent;
  });

  if (contract.employee?.userId) {
    await createNotification({
      userId: contract.employee.userId,
      category: "ONBOARDING",
      title: "Contract ready for signature",
      body: "A contract has been sent to you for review and signature.",
      actionUrl: `/contracts/${id}`,
    });
  }

  return updated;
}

export async function signContract(user, id, payload, requestMeta = {}) {
  const contract = await db.contract.findUnique({
    where: { id },
  });

  if (!contract) {
    throw new AppError(404, "Contract not found");
  }

  resolveOrganizationId(user, contract.organizationId);

  return db.$transaction(async (tx) => {
    const signed = await tx.contract.update({
      where: { id },
      data: {
        status: "SIGNED",
        viewedAt: contract.viewedAt || new Date(),
        signedAt: new Date(),
        signatureData: {
          signature: payload.signature,
          typedName: payload.typedName,
          ipAddress: requestMeta.ipAddress,
          userAgent: requestMeta.userAgent,
          signedAt: new Date().toISOString(),
        },
      },
    });

    if (signed.effectiveDate && signed.effectiveDate <= new Date()) {
      await tx.contract.update({
        where: { id },
        data: {
          status: "ACTIVE",
        },
      });
    }

    await writeAuditLog(tx, {
      organizationId: contract.organizationId,
      userId: user.id,
      action: "contract.signed",
      resourceType: "Contract",
      resourceId: id,
      changes: {
        signedAt: new Date().toISOString(),
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    await publishDomainEvent(tx, {
      organizationId: contract.organizationId,
      eventType: "contract.signed",
      aggregateType: "Contract",
      aggregateId: id,
      payload: {
        contractId: id,
      },
    });

    return signed;
  });
}
