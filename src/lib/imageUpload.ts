// Pure client-side validation for product image uploads, mirroring the
// backend's accepted types and size cap as defense-in-depth (the backend
// re-validates). Returns a Spanish error message or null when the file is ok.

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface ImageCandidate {
  type: string;
  size: number;
}

export function validateImage(file: ImageCandidate): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Formato no permitido. Usa JPEG, PNG o WebP.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "La imagen supera el límite de 5 MB.";
  }
  return null;
}

// Validates a batch, returning the first error found (or null if all valid).
export function validateImages(files: ImageCandidate[]): string | null {
  for (const file of files) {
    const error = validateImage(file);
    if (error) {
      return error;
    }
  }
  return null;
}
