import { NextResponse } from "next/server";
import { withRoute } from "@/lib/api";
import { loginSchema } from "@/lib/validators";
import { loginWithPassword } from "@/services/auth.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";
import { setSession } from "@/lib/auth";

export const POST = withRoute({ auth: false, bodySchema: loginSchema }, async ({ request, body }) => {
  const user = await loginWithPassword(body, requestMetaFromHeaders(request));

  const response = NextResponse.json({
    ok: true,
    data: {
      user,
    },
  });

  await setSession(response, {
    sub: user.id,
    org: user.organizationId,
  });

  return response;
});
