// Reads the optional correlation reference the BFF forwards on unexpected (5xx)
// errors. Kept pure so both data hooks share identical, testable behavior.

export interface BffErrorBody {
  ref?: unknown;
  message?: unknown;
}

// Returns the correlation ref as a string when the body carries one, else null.
export function readErrorRef(body: BffErrorBody | null): string | null {
  if (body && typeof body.ref === "string" && body.ref.length > 0) {
    return body.ref;
  }
  return null;
}

// Composes the user-facing generic error message, appending the reference only
// when present: "<base>" or "<base> Ref: <id>".
export function withErrorRef(baseMessage: string, ref: string | null): string {
  if (ref) {
    return `${baseMessage} Ref: ${ref}`;
  }
  return baseMessage;
}
