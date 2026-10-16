// Reads a single cookie value from a raw Cookie header. Route Handlers receive a
// standard Request, so we parse the header directly rather than depending on the
// Next cookies() helper (keeps the refresh logic easy to unit-test).
export function readCookie(
  cookieHeader: string | null,
  name: string,
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }
  const prefix = `${name}=`;
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}
