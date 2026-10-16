// Product images come from the backend as root-relative paths (e.g.
// "/uploads/abc.png"). Rendered in a client <img>, a relative path resolves
// against the panel's own origin (localhost:3001) and 404s. Prefix it with the
// backend's public origin so the browser fetches it from the backend, which the
// CSP img-src already allows. Absolute URLs and data/blob URIs pass through.
const PUBLIC_ORIGIN =
  process.env.NEXT_PUBLIC_BACKEND_PUBLIC_ORIGIN ?? "http://localhost:8080";

export function imageUrl(path: string): string {
  if (/^(https?:|data:|blob:)/.test(path)) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_ORIGIN}${normalized}`;
}
