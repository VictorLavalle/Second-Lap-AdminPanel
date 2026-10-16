import Link from "next/link";
import { AdminHeader } from "@/components/AdminHeader";
import { ProductEditView } from "@/components/ProductFormView";

export default async function EditarProductoPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        <Link
          href="/productos"
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          ← Volver a productos
        </Link>
        <h1 className="mb-6 mt-2 text-xl font-semibold text-[var(--color-ink)]">
          Editar producto
        </h1>
        <ProductEditView productId={id} />
      </main>
    </div>
  );
}
