"use client";

import { useEffect, useRef } from "react";

// Native <dialog> confirmation. Uses showModal()/close() via a ref and listens
// for the browser's cancel event (Escape) — no onClick handler on the dialog
// element itself, so backdrop clicks do not accidentally dismiss destructive
// actions.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: Readonly<{
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      className="m-auto rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-0 backdrop:bg-black/40"
      aria-labelledby="confirm-title"
    >
      <div className="flex max-w-sm flex-col gap-4 p-6">
        <h2
          id="confirm-title"
          className="text-lg font-semibold text-[var(--color-ink)]"
        >
          {title}
        </h2>
        <p className="text-sm text-[var(--color-muted)]">{description}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--color-line)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-canvas)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-md bg-[var(--color-danger)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Procesando…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
