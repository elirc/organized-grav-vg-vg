import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";
import { assignRole, ensureBaseRbac } from "@/services/rbac.service";
import { normalizeUserContext } from "@/lib/auth";

function validatePasswordStrength(password) {
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  return password.length >= 10 && hasNumber && hasSpecial;
}

export async function registerOrganizationAdmin(payload, requestMeta = {}) {
  const {
    organizationName,
    legalName,
    headquartersCountry,
    billingEmail,
    firstName,
    lastName,
    email,
    password,
  } = payload;

  if (!validatePasswordStrength(password)) {
    throw new AppError(
      400,
      "Password must be at least 10 characters and include a number and special character",
    );
  }

  const existingUser = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    throw new AppError(409, "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: organizationName,
        legalName,
        headquartersCountry,
        billingEmail,
        status: "ACTIVE",
      },
    });

    await ensureBaseRbac(tx, organization.id);

    const created = await tx.user.create({
      data: {
        organizationId: organization.id,
        email: email.toLowerCase(),
        firstName,
        lastName,
        passwordHash,
        status: "ACTIVE",
      },
    });

    await assignRole(tx, {
      userId: created.id,
      roleName: "CLIENT_ADMIN",
      organizationId: organization.id,
    });

    await writeAuditLog(tx, {
      organizationId: organization.id,
      userId: created.id,
      action: "auth.register",
      resourceType: "User",
      resourceId: created.id,
      changes: {
        email: created.email,
        role: "CLIENT_ADMIN",
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    return created;
  });

  const hydrated = await db.user.findUnique({
    where: { id: user.id },
    include: {
      organization: true,
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return normalizeUserContext(hydrated);
}

export async function loginWithPassword(payload, requestMeta = {}) {
  const { email, password } = payload;

  const user = await db.user.findUnique({
    where: {
      email: email.toLowerCase(),
    },
    include: {
      organization: true,
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AppError(401, "Invalid credentials");
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(423, "Account locked. Please try again later.");
  }

  const isValid = await bcrypt.compare(password, user.passwordHash || "");

  if (!isValid) {
    const attempts = user.failedLoginAttempts + 1;
    const lockout = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: lockout,
      },
    });

    throw new AppError(401, "Invalid credentials");
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
    include: {
      organization: true,
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: updated.organizationId,
      userId: updated.id,
      action: "auth.login",
      resourceType: "User",
      resourceId: updated.id,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    },
  });

  return normalizeUserContext(updated);
}

export async function bootstrapPlatformAdmin(payload) {
  const { email, password, firstName, lastName } = payload;

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return null;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  return db.$transaction(async (tx) => {
    await ensureBaseRbac(tx, null);

    const user = await tx.user.create({
      data: {
        email: email.toLowerCase(),
        firstName,
        lastName,
        passwordHash,
      },
    });

    await assignRole(tx, {
      userId: user.id,
      roleName: "PLATFORM_ADMIN",
      organizationId: null,
    });

    return user;
  });
}
