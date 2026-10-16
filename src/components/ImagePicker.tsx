"use client";

import { useId, useMemo, useRef, type ChangeEvent } from "react";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/imageUpload";

// Styled replacement for the raw <input type="file">. Shows a clear Spanish
// call-to-action, the chosen files as thumbnail previews, and lets the user
// remove individual files or clear the selection. Validation stays with the
// parent (which owns the error message); this component only reports changes.
export function ImagePicker({
  files,
  onChange,
  error,
  disabled,
  label = "Imágenes",
  hint = "JPEG, PNG o WebP · máx. 5 MB cada una",
}: Readonly<{
  files: File[];
  onChange: (files: File[]) => void;
  error?: string | null;
  disabled?: boolean;
  label?: string;
  hint?: string;
}>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    onChange(Array.from(event.target.files ?? []));
  }

  function removeAt(index: number) {
    const next = files.filter((_, i) => i !== index);
    onChange(next);
    if (next.length === 0 && inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[var(--color-ink)]">
        {label}
      </span>

      <label
        htmlFor={inputId}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[var(--color-line)] bg-[var(--color-canvas)] px-4 py-6 text-center transition hover:border-[var(--color-accent)] ${
          disabled ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <span className="text-sm font-medium text-[var(--color-accent)]">
          Seleccionar imágenes
        </span>
        <span className="text-xs text-[var(--color-muted)]">
          o arrástralas aquí · {hint}
        </span>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          disabled={disabled}
          onChange={handleInput}
          aria-label={label}
          className="sr-only"
        />
      </label>

      {error ? (
        <p role="alert" className="text-xs text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}

      {previews.length > 0 ? (
        <ul className="flex flex-wrap gap-3">
          {previews.map(({ file, url }, index) => (
            <li key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
              <img
                src={url}
                alt={`Vista previa de ${file.name}`}
                width={80}
                height={80}
                className="h-20 w-20 rounded-md border border-[var(--color-line)] object-cover"
              />
              <button
                type="button"
                onClick={() => removeAt(index)}
                disabled={disabled}
                aria-label={`Quitar ${file.name}`}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-sm leading-none text-[var(--color-ink)] shadow-sm hover:bg-[var(--color-canvas)] disabled:opacity-60"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
