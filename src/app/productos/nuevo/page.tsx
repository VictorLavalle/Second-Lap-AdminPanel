import Link from "next/link";
import { AdminHeader } from "@/components/AdminHeader";
import { ProductCreateView } from "@/components/ProductFormView";

export default function NuevoProductoPage() {
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
          Nuevo producto
        </h1>
        <ProductCreateView />
      </main>
    </div>
  );
}
