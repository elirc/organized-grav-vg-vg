import { NextResponse } from "next/server";
import { withRoute } from "@/lib/api";
import { registerSchema } from "@/lib/validators";
import { registerOrganizationAdmin } from "@/services/auth.service";
import { requestMetaFromHeaders } from "@/lib/request-meta";
import { setSession } from "@/lib/auth";

export const POST = withRoute({ auth: false, bodySchema: registerSchema }, async ({ request, body }) => {
  const user = await registerOrganizationAdmin(body, requestMetaFromHeaders(request));

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
