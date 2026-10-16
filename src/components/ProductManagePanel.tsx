"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import type { Product, ProductStatus } from "@/types";
import {
  ACCEPTED_IMAGE_TYPES,
  validateImages,
} from "@/lib/imageUpload";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const PRODUCT_STATUSES: ProductStatus[] = [
  "disponible",
  "apartado",
  "vendido",
];

const statusLabels: Record<ProductStatus, string> = {
  disponible: "Disponible",
  apartado: "Apartado",
  vendido: "Vendido",
};

const GENERIC_ERROR = "La operación falló. Inténtalo de nuevo.";

export function ProductManagePanel({ product }: Readonly<{ product: Product }>) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [status, setStatus] = useState<ProductStatus>(product.status);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const previews = useMemo(
    () => selectedFiles.map((file) => URL.createObjectURL(file)),
    [selectedFiles],
  );

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setImageError(null);
    const files = Array.from(event.target.files ?? []);
    const error = validateImages(files);
    if (error) {
      setImageError(error);
      setSelectedFiles([]);
      return;
    }
    setSelectedFiles(files);
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) {
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const body = new FormData();
      for (const file of selectedFiles) {
        body.append("files", file);
      }
      const response = await fetch(
        `/api/admin/products/${product.id}/images`,
        { method: "POST", body },
      );
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (!response.ok) {
        setActionError(GENERIC_ERROR);
        return;
      }
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      router.refresh();
    } catch {
      setActionError(GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusChange(next: ProductStatus) {
    setStatus(next);
    setBusy(true);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/admin/products/${product.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        },
      );
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (!response.ok) {
        setActionError(GENERIC_ERROR);
        setStatus(product.status);
        return;
      }
      router.refresh();
    } catch {
      setActionError(GENERIC_ERROR);
      setStatus(product.status);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
      });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (!response.ok) {
        setActionError(GENERIC_ERROR);
        setConfirmOpen(false);
        return;
      }
      router.replace("/productos");
      router.refresh();
    } catch {
      setActionError(GENERIC_ERROR);
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-8 border-t border-[var(--color-line)] pt-8">
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">
          Imágenes
        </h2>
        {product.images.length > 0 ? (
          <ul className="flex flex-wrap gap-3">
            {product.images.map((image) => (
              <li key={image}>
                {/* eslint-disable-next-line @next/next/no-img-element -- backend-hosted image; CSP img-src allows the backend origin */}
                <img
                  src={image}
                  alt={`Imagen de ${product.name}`}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-md border border-[var(--color-line)] object-cover"
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">
            Este producto no tiene imágenes.
          </p>
        )}

        <label htmlFor="images" className="text-sm font-medium">
          Agregar imágenes (JPEG, PNG o WebP, máx. 5 MB)
        </label>
        <input
          id="images"
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          onChange={handleFileChange}
          className="text-sm"
        />
        {imageError ? (
          <p role="alert" className="text-xs text-[var(--color-danger)]">
            {imageError}
          </p>
        ) : null}

        {previews.length > 0 ? (
          <ul className="flex flex-wrap gap-3">
            {previews.map((preview, index) => (
              <li key={preview}>
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                <img
                  src={preview}
                  alt={`Vista previa ${index + 1}`}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-md border border-dashed border-[var(--color-accent)] object-cover"
                />
              </li>
            ))}
          </ul>
        ) : null}

        <div>
          <button
            type="button"
            onClick={handleUpload}
            disabled={busy || selectedFiles.length === 0}
            className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-soft)] disabled:opacity-60"
          >
            Subir imágenes
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">
          Estado
        </h2>
        <div className="flex items-center gap-3">
          <label htmlFor="status" className="sr-only">
            Cambiar estado
          </label>
          <select
            id="status"
            value={status}
            disabled={busy}
            onChange={(event) =>
              handleStatusChange(event.target.value as ProductStatus)
            }
            className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
          >
            {PRODUCT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {statusLabels[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">
          Zona de peligro
        </h2>
        <div>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
            className="rounded-md border border-[var(--color-danger)] px-4 py-2 text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/5 disabled:opacity-60"
          >
            Eliminar producto
          </button>
        </div>
      </div>

      {actionError ? (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {actionError}
        </p>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar producto"
        description="Esta acción no se puede deshacer. ¿Seguro que quieres eliminar este producto?"
        confirmLabel="Eliminar"
        busy={busy}
        onConfirm={handleDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </section>
  );
}
