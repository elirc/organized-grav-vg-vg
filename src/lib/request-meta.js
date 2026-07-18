export function requestMetaFromHeaders(request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const ipAddress = forwardedFor.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
  const userAgent = request.headers.get("user-agent") || null;

  return {
    ipAddress,
    userAgent,
  };
}
