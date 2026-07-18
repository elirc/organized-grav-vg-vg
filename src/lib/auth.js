import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

const SESSION_COOKIE = "vg_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function getAuthSecret() {
  const value = process.env.AUTH_SECRET || "dev_only_replace_me_32_characters_min";
  return new TextEncoder().encode(value);
}

async function loadUserContext(userId) {
  return db.user.findUnique({
    where: { id: userId },
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
}

export async function createSessionToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getAuthSecret());
}

export async function setSession(response, payload) {
  const token = await createSessionToken(payload);

  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  return response;
}

export function clearSession(response) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export async function readSessionFromRequest(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    return payload;
  } catch {
    return null;
  }
}

export async function readSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    return payload;
  } catch {
    return null;
  }
}

export function normalizeUserContext(user) {
  if (!user) {
    return null;
  }

  const roles = user.userRoles.map((item) => item.role.name);
  const permissions = new Set();

  for (const userRole of user.userRoles) {
    if (userRole.role.name === "PLATFORM_ADMIN") {
      permissions.add("*");
      continue;
    }

    for (const rolePermission of userRole.role.rolePermissions) {
      permissions.add(rolePermission.permission.name);
    }
  }

  return {
    id: user.id,
    organizationId: user.organizationId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    roles,
    permissions: Array.from(permissions),
    organization: user.organization,
  };
}

export async function getRequestUser(request) {
  const session = await readSessionFromRequest(request);
  if (!session?.sub) {
    return null;
  }

  const user = await loadUserContext(session.sub);
  return normalizeUserContext(user);
}

export async function getServerUser() {
  const session = await readSessionFromCookies();
  if (!session?.sub) {
    return null;
  }

  const user = await loadUserContext(session.sub);
  return normalizeUserContext(user);
}

export function hasRole(user, roleName) {
  return Boolean(user?.roles?.includes(roleName));
}

export function hasPermission(user, permission) {
  if (!user) {
    return false;
  }

  return user.permissions?.includes("*") || user.permissions?.includes(permission);
}

export function requirePermission(user, permission) {
  if (!hasPermission(user, permission)) {
    throw new AppError(403, `Missing permission: ${permission}`);
  }
}

export function requireAuth(user) {
  if (!user) {
    throw new AppError(401, "Unauthorized");
  }
}
