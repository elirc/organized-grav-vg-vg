import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";
import { resolveOrganizationId, requireOrganizationAccess, isPlatformAdmin } from "@/services/context";
import { ensureBaseRbac } from "@/services/rbac.service";

export async function listOrganizations(user) {
  if (isPlatformAdmin(user)) {
    return db.organization.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  return db.organization.findMany({
    where: {
      id: user.organizationId,
    },
  });
}

export async function getOrganization(user, id) {
  requireOrganizationAccess(user, id);

  const organization = await db.organization.findUnique({
    where: {
      id,
    },
  });

  if (!organization) {
    throw new AppError(404, "Organization not found");
  }

  return organization;
}

export async function createOrganization(user, payload, requestMeta = {}) {
  if (!isPlatformAdmin(user)) {
    throw new AppError(403, "Only platform admins can create organizations directly");
  }

  const created = await db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: payload,
    });

    await ensureBaseRbac(tx, organization.id);

    await writeAuditLog(tx, {
      organizationId: organization.id,
      userId: user.id,
      action: "organization.created",
      resourceType: "Organization",
      resourceId: organization.id,
      changes: payload,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    return organization;
  });

  return created;
}

export async function updateOrganization(user, id, payload, requestMeta = {}) {
  requireOrganizationAccess(user, id);

  return db.$transaction(async (tx) => {
    const existing = await tx.organization.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "Organization not found");
    }

    const updated = await tx.organization.update({
      where: { id },
      data: payload,
    });

    await writeAuditLog(tx, {
      organizationId: id,
      userId: user.id,
      action: "organization.updated",
      resourceType: "Organization",
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

export function resolveOrg(user, explicitOrganizationId = null) {
  return resolveOrganizationId(user, explicitOrganizationId);
}
