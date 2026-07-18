import { NextResponse } from "next/server";
import { AppError, toErrorResponse } from "@/lib/errors";
import { getRequestUser, requireAuth, requirePermission } from "@/lib/auth";

function parseSearchParams(request) {
  const url = new URL(request.url);
  const output = {};

  for (const [key, value] of url.searchParams.entries()) {
    output[key] = value;
  }

  return output;
}

export function withRoute(options, handler) {
  return async (request, context = {}) => {
    try {
      const requireSession = options?.auth !== false;
      const user = requireSession ? await getRequestUser(request) : null;

      if (requireSession) {
        requireAuth(user);
      }

      if (options?.permission) {
        requirePermission(user, options.permission);
      }

      let body;
      if (options?.bodySchema) {
        const json = await request.json().catch(() => {
          throw new AppError(400, "Invalid JSON body");
        });

        const parsed = options.bodySchema.safeParse(json);
        if (!parsed.success) {
          throw new AppError(400, "Request validation failed", parsed.error.flatten());
        }

        body = parsed.data;
      }

      const result = await handler({
        request,
        params: context.params || {},
        query: parseSearchParams(request),
        user,
        body,
      });

      if (result instanceof Response) {
        return result;
      }

      return NextResponse.json({ ok: true, data: result });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
