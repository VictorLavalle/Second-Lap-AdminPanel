"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, ProductStatus } from "@/types";
import { validateImages } from "@/lib/imageUpload";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ImagePicker } from "@/components/ImagePicker";
import { imageUrl } from "@/lib/imageUrl";

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>(product.images);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [status, setStatus] = useState<ProductStatus>(product.status);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleUpload() {
    if (selectedFiles.length === 0) {
      return;
    }
    setBusy(true);
    setActionError(null);
    setUploadSuccess(false);
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
      // The backend returns the updated product; use its images so the gallery
      // re-renders immediately without a manual reload.
      const updated = (await response.json()) as Product;
      setImages(updated.images);
      setSelectedFiles([]);
      setUploadSuccess(true);
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
        {images.length > 0 ? (
          <ul className="flex flex-wrap gap-3">
            {images.map((image) => (
              <li key={image}>
                {/* eslint-disable-next-line @next/next/no-img-element -- backend-hosted image; CSP img-src allows the backend origin */}
                <img
                  src={imageUrl(image)}
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

        <ImagePicker
          files={selectedFiles}
          error={imageError}
          disabled={busy}
          label="Agregar imágenes"
          onChange={(files) => {
            const error = validateImages(files);
            setImageError(error);
            setSelectedFiles(error ? [] : files);
            setUploadSuccess(false);
          }}
        />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleUpload}
            disabled={busy || selectedFiles.length === 0}
            className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-soft)] disabled:opacity-60"
          >
            {busy ? "Subiendo…" : "Subir imágenes"}
          </button>
          {uploadSuccess ? (
            <p
              role="status"
              className="text-sm font-medium text-[var(--color-available)]"
            >
              Imágenes subidas ✓
            </p>
          ) : null}
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
