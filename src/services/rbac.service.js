import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS } from "@/lib/permissions";

async function upsertPermissions(tx) {
  for (const permission of PERMISSIONS) {
    await tx.permission.upsert({
      where: { name: permission },
      create: { name: permission },
      update: {},
    });
  }
}

async function ensureRole(tx, { organizationId, name, type, permissionNames = [], isSystem = true }) {
  let role = await tx.role.findFirst({
    where: {
      name,
      organizationId,
    },
  });

  if (!role) {
    role = await tx.role.create({
      data: {
        organizationId,
        name,
        type,
        isSystem,
      },
    });
  }

  if (!permissionNames.includes("*")) {
    const permissions = await tx.permission.findMany({
      where: {
        name: {
          in: permissionNames,
        },
      },
    });

    const existingRolePermissions = await tx.rolePermission.findMany({
      where: {
        roleId: role.id,
      },
      include: {
        permission: true,
      },
    });

    const existing = new Set(existingRolePermissions.map((item) => item.permission.name));

    for (const permission of permissions) {
      if (existing.has(permission.name)) {
        continue;
      }

      await tx.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  return role;
}

export async function ensureBaseRbac(tx, organizationId = null) {
  await upsertPermissions(tx);

  await ensureRole(tx, {
    organizationId: null,
    name: "PLATFORM_ADMIN",
    type: "PLATFORM_ADMIN",
    permissionNames: DEFAULT_ROLE_PERMISSIONS.PLATFORM_ADMIN,
    isSystem: true,
  });

  if (organizationId) {
    await ensureRole(tx, {
      organizationId,
      name: "CLIENT_ADMIN",
      type: "CLIENT_ADMIN",
      permissionNames: DEFAULT_ROLE_PERMISSIONS.CLIENT_ADMIN,
      isSystem: true,
    });

    await ensureRole(tx, {
      organizationId,
      name: "CLIENT_MANAGER",
      type: "CLIENT_MANAGER",
      permissionNames: DEFAULT_ROLE_PERMISSIONS.CLIENT_MANAGER,
      isSystem: true,
    });

    await ensureRole(tx, {
      organizationId,
      name: "EMPLOYEE",
      type: "EMPLOYEE",
      permissionNames: DEFAULT_ROLE_PERMISSIONS.EMPLOYEE,
      isSystem: true,
    });

    await ensureRole(tx, {
      organizationId,
      name: "CONTRACTOR",
      type: "CONTRACTOR",
      permissionNames: DEFAULT_ROLE_PERMISSIONS.CONTRACTOR,
      isSystem: true,
    });
  }
}

export async function assignRole(tx, { userId, roleName, organizationId = null }) {
  const role = await tx.role.findFirst({
    where: {
      name: roleName,
      organizationId,
    },
  });

  if (!role) {
    throw new Error(`Role ${roleName} not found for organization ${organizationId || "global"}`);
  }

  const existing = await tx.userRole.findFirst({
    where: {
      userId,
      roleId: role.id,
      organizationId,
    },
  });

  if (!existing) {
    await tx.userRole.create({
      data: {
        userId,
        roleId: role.id,
        organizationId,
      },
    });
  }

  return role;
}
