// Derives a best-effort client key for rate limiting.
//
// SECURITY: X-Forwarded-For is sent by the client and is forgeable. With no
// trusted proxy in front (the local deployment), this value CANNOT be trusted
// as the sole brute-force defense — an attacker can rotate it per request to
// open a fresh per-IP bucket. It is therefore treated as best-effort only and
// is paired with a global cap in the rate limiter (see checkRateLimit callers),
// so forged IPs cannot open unlimited buckets.
//
// We read the LAST hop of the chain, not the first: proxies append the
// upstream IP on the right, so the right-most entry is the closest hop, whereas
// the left-most is the value the client fully controls.
//
// PRODUCTION: behind a trusted CDN/proxy, replace the body of this function to
// read the edge-injected header (e.g. the CDN's true-client-IP) or the IP of
// the last hop we control — never the raw client-supplied X-Forwarded-For.
// This function is the single place to change for that.
export function clientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const lastHop = forwardedFor?.split(",").at(-1)?.trim();
  if (lastHop) {
    return lastHop;
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
