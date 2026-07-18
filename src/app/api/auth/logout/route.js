import { NextResponse } from "next/server";
import { withRoute } from "@/lib/api";
import { clearSession } from "@/lib/auth";

export const POST = withRoute({ auth: false }, async () => {
  const response = NextResponse.json({
    ok: true,
    data: {
      loggedOut: true,
    },
  });

  clearSession(response);
  return response;
});
