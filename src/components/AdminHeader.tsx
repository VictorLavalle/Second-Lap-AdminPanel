"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { branding } from "@/data/branding";

export function AdminHeader() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-[var(--color-line)] px-6 py-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <Image
            src={branding.logo.markLight}
            alt=""
            width={32}
            height={32}
            priority
          />
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            {branding.name}
          </p>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/productos"
            className="text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            Productos
          </Link>
          <Link
            href="/pedidos"
            className="text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            Pedidos
          </Link>
        </nav>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-md border border-[var(--color-line)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-canvas)]"
      >
        Cerrar sesión
      </button>
    </header>
  );
}
