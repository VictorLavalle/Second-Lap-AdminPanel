import { AdminHeader } from "@/components/AdminHeader";
import { ProductsView } from "@/components/ProductsView";

export default function ProductosPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <h1 className="mb-6 text-xl font-semibold text-[var(--color-ink)]">
          Productos
        </h1>
        <ProductsView />
      </main>
    </div>
  );
}
