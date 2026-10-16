// Input hardening used across forms as defense-in-depth. React already escapes
// rendered text, so this is not about display XSS; it limits what we store and
// forward (to the backend) to safe, bounded values.

// Strip control characters and angle brackets, collapse nothing, cap length.
export function sanitizeText(value: string, maxLength = 200): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>]/g, "")
    .slice(0, maxLength);
}

// For multiline fields (descriptions): keep newlines, drop other control chars.
export function sanitizeMultiline(value: string, maxLength = 2000): string {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/[<>]/g, "")
    .slice(0, maxLength);
}

export function sanitizeDigits(value: string, maxLength: number): string {
  return value.replace(/\D/g, "").slice(0, maxLength);
}
