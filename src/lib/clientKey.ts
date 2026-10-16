// Derives a best-effort client key for rate limiting from proxy headers,
// falling back to a constant so limiting still applies when no IP is present.
export function clientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
