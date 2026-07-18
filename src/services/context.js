import { AppError } from "@/lib/errors";
import { hasRole } from "@/lib/auth";

export function isPlatformAdmin(user) {
  return hasRole(user, "PLATFORM_ADMIN");
}

export function requireOrganizationAccess(user, organizationId) {
  if (isPlatformAdmin(user)) {
    return;
  }

  if (!user?.organizationId || user.organizationId !== organizationId) {
    throw new AppError(403, "Tenant access denied");
  }
}

export function resolveOrganizationId(user, explicitOrganizationId = null) {
  if (isPlatformAdmin(user)) {
    if (explicitOrganizationId) {
      return explicitOrganizationId;
    }

    throw new AppError(400, "organizationId is required for platform admin operations");
  }

  if (!user?.organizationId) {
    throw new AppError(400, "User is not associated with an organization");
  }

  if (explicitOrganizationId && explicitOrganizationId !== user.organizationId) {
    throw new AppError(403, "Tenant access denied");
  }

  return user.organizationId;
}
